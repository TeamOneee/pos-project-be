import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import {
  AuthenticatedUser,
  OutboxService,
  PrismaWriteService,
} from '@app/platform';
import {
  CategoryInactiveError,
  CheckoutProcessingError,
  ForbiddenError,
  IdempotencyConflictError,
  NotFoundError,
  PriceChangedError,
  ProductInactiveError,
  ValidationError,
} from '@app/platform';
import { ProductReadPort } from '@app/catalog';
import { StockReservationPort } from '@app/inventory';
import { TenantAuthorizationService } from '@app/tenant';
import { CheckoutDto } from '../web/dto/checkout.dto';
import { CheckoutResultDto } from '../web/dto/checkout-result.dto';
import { TransactionRepository } from '../infrastructure/transaction.repository';
import { ReceiptService } from './receipt.service';

const sha256 = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

const addHours = (date: Date, hours: number): Date =>
  new Date(date.getTime() + hours * 60 * 60 * 1000);

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly outbox: OutboxService,
    private readonly repository: TransactionRepository,
    private readonly receiptService: ReceiptService,
    private readonly productReadPort: ProductReadPort,
    private readonly stockReservationPort: StockReservationPort,
    private readonly tenantAuth: TenantAuthorizationService,
  ) {}

  async checkout(
    actor: AuthenticatedUser,
    dto: CheckoutDto,
  ): Promise<CheckoutResultDto> {
    if (actor.role === 'CASHIER' && actor.outletId !== dto.outlet_id) {
      throw new ForbiddenError('Outlet is not assigned to this cashier.');
    }
    await this.tenantAuth.assertOutletOwnedByActor(actor, dto.outlet_id);
    await this.tenantAuth.assertOutletActive(actor, dto.outlet_id);

    const fingerprint = sha256(
      JSON.stringify({
        outlet_id: dto.outlet_id,
        items: dto.items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          expected_unit_price: i.expected_unit_price ?? null,
        })),
        payment: { method: dto.payment.method, amount: dto.payment.amount },
      }),
    );

    return this.prisma.$transaction(
      async (tx) => {
        // 1) idempotency guard (BR-008/009)
        const existing = await this.repository.findIdempotency(
          tx,
          actor.merchantId,
          dto.outlet_id,
          dto.idempotency_key,
        );
        if (existing) {
          if (existing.payloadFingerprint !== fingerprint) {
            throw new IdempotencyConflictError();
          }
          if (existing.state === 'COMPLETED' && existing.transactionId) {
            return this.receiptService.compose(
              tx,
              existing.transactionId,
              actor,
            );
          }
          if (existing.state === 'PROCESSING') {
            throw new CheckoutProcessingError();
          }
        } else {
          await this.repository.createIdempotency(tx, {
            merchantId: actor.merchantId,
            outletId: dto.outlet_id,
            actorUserId: actor.userId,
            idempotencyKey: dto.idempotency_key,
            payloadFingerprint: fingerprint,
            state: 'PROCESSING',
            expiresAt: addHours(new Date(), 24),
          });
        }

        // 2) validasi produk aktif + harga efektif via ProductReadPort (BR-012)
        const products =
          await this.productReadPort.getProductsForSaleValidation({
            merchantId: actor.merchantId,
            outletId: dto.outlet_id,
            productIds: dto.items.map((i) => i.product_id),
          });
        const byId = new Map(products.map((p) => [p.id, p]));

        const lines: {
          productId: string;
          name: string;
          unitPrice: Prisma.Decimal;
          quantity: number;
          subtotal: Prisma.Decimal;
        }[] = [];

        for (const item of dto.items) {
          const product = byId.get(item.product_id);
          if (!product) {
            throw new NotFoundError(`Product not found: ${item.product_id}`);
          }
          if (!product.isActive) {
            throw new ProductInactiveError([
              { field: 'items[].product_id', reason: item.product_id },
            ]);
          }
          if (!product.isCategoryActive) {
            throw new CategoryInactiveError([
              { field: 'items[].product_id', reason: item.product_id },
            ]);
          }
          const unitPrice = new Prisma.Decimal(product.effectivePrice);
          if (
            item.expected_unit_price &&
            !new Prisma.Decimal(item.expected_unit_price).equals(unitPrice)
          ) {
            throw new PriceChangedError([
              {
                field: 'items[].product_id',
                reason: `current_price=${product.effectivePrice}`,
              },
            ]);
          }
          lines.push({
            productId: product.id,
            name: product.name,
            unitPrice,
            quantity: item.quantity,
            subtotal: unitPrice.mul(item.quantity),
          });
        }

        // total = subtotal (OD-004/DR-013), payment.amount wajib sama (FR-PAY-003)
        const subtotal = lines.reduce(
          (acc, l) => acc.add(l.subtotal),
          new Prisma.Decimal(0),
        );
        const total = subtotal;
        if (!new Prisma.Decimal(dto.payment.amount).equals(total)) {
          throw new ValidationError('payment.amount must equal total.');
        }

        // 3) kurangi stok atomik (FR-INV-004, AT-004)
        await this.stockReservationPort.reserveForSale(tx, {
          merchantId: actor.merchantId,
          outletId: dto.outlet_id,
          actorUserId: actor.userId,
          lines: dto.items.map((i) => ({
            productId: i.product_id,
            quantity: i.quantity,
          })),
        });

        // 4) commit transaction + lines + payment (FR-CHK-018)
        const receiptNumber = await this.repository.nextReceiptNumber(
          tx,
          actor.merchantId,
        );
        const transaction = await this.repository.createTransaction(tx, {
          merchantId: actor.merchantId,
          outletId: dto.outlet_id,
          cashierUserId: actor.userId,
          receiptNumber,
          status: 'COMPLETED',
          subtotal,
          total,
          lines: lines.map((l) => ({
            productId: l.productId,
            productNameSnapshot: l.name,
            unitPriceSnapshot: l.unitPrice,
            quantity: l.quantity,
            subtotal: l.subtotal,
          })),
          payment: {
            method: dto.payment.method,
            amount: new Prisma.Decimal(dto.payment.amount),
            status: 'CONFIRMED',
            confirmedBy: actor.userId,
          },
        });

        // 5) outbox — transaksi yang sama, checkout tidak menunggu worker (FR-CHK-014)
        await this.outbox.publish(tx, 'TransactionCompletedEvent', {
          transaction_id: transaction.id,
          schema_version: 1,
        });

        // 6) tandai idempotency selesai
        await this.repository.updateIdempotencyState(
          tx,
          actor.merchantId,
          dto.outlet_id,
          dto.idempotency_key,
          { state: 'COMPLETED', transactionId: transaction.id },
        );

        return this.receiptService.compose(tx, transaction.id, actor);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}
