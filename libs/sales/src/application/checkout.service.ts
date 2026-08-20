import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma, TransactionStatus } from '@prisma/client';
import {
  ApiError,
  AuthUser,
  ErrorCode,
  PrismaWriteService,
} from '@app/platform';
import {
  posCheckoutTotal,
  posRevenueTotal,
  posItemsSoldTotal,
} from '@app/platform/platform.metrics';
import { ProductReadPort } from '@app/catalog';
import { StockReservationPort } from '@app/inventory';
import { TenantAuthorizationService } from '@app/tenant';
import { CheckoutDto } from '../web/dto/checkout.dto';
import { CheckoutResultDto } from '../web/dto/checkout-result.dto';
import { TransactionRepository } from '../infrastructure/transaction.repository';
import { ReceiptService } from './receipt.service';

const sha256 = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

interface NormalizedItem {
  productId: string;
  quantity: number;
  expectedUnitPrice?: string;
}

interface CheckoutLine {
  productId: string;
  name: string;
  unitPrice: Prisma.Decimal;
  quantity: number;
  subtotal: Prisma.Decimal;
}

interface CheckoutContext {
  actor: AuthUser;
  dto: CheckoutDto;
  requestHash: string;
  transactionId: string;
  subtotal: Prisma.Decimal;
  total: Prisma.Decimal;
  lines: CheckoutLine[];
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly repository: TransactionRepository,
    private readonly receiptService: ReceiptService,
    private readonly productReadPort: ProductReadPort,
    private readonly stockReservationPort: StockReservationPort,
    private readonly tenantAuth: TenantAuthorizationService,
  ) {}

  async checkout(
    actor: AuthUser,
    dto: CheckoutDto,
  ): Promise<CheckoutResultDto> {
    await this.tenantAuth.assertOutletOwnedByActor(actor, dto.outlet_id);

    // normalisasi: gabung Product sama lalu urutkan product_id (07 §5.6 langkah 3).
    const byId = new Map<string, NormalizedItem>();
    for (const item of dto.items) {
      const existing = byId.get(item.product_id);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        byId.set(item.product_id, {
          productId: item.product_id,
          quantity: item.quantity,
          expectedUnitPrice: item.expected_unit_price,
        });
      }
    }
    const normalized = [...byId.values()].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    );

    const requestHash = sha256(
      JSON.stringify({
        merchant_id: actor.merchantId,
        outlet_id: dto.outlet_id,
        operator_user_id: actor.userId,
        items: normalized.map((i) => ({
          product_id: i.productId,
          quantity: i.quantity,
          expected_unit_price: i.expectedUnitPrice ?? null,
        })),
        payment_method: dto.payment_method,
      }),
    );
    const transactionId = randomUUID();

    // FASE 1 — read validasi di LUAR transaksi (koneksi pool dipinjam sebentar dan
    // dilepas). Memperpendek durasi interactive transaction agar 1 koneksi transaksi
    // tidak ditahan lama dan port tidak membuka koneksi tambahan di dalam txn.
    const [existing, products] = await Promise.all([
      this.repository.findByCheckoutRequest(
        this.prisma,
        actor.merchantId,
        dto.checkout_request_id,
      ),
      this.productReadPort.getProductsForSaleValidation({
        merchantId: actor.merchantId,
        outletId: dto.outlet_id,
        productIds: normalized.map((i) => i.productId),
      }),
    ]);

    // idempotency short-circuit (FR-CHK-003/004, OD-012): sudah ada transaksi -> kembalikan receipt.
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw this.idempotencyConflict();
      }
      this.logger.log(
        {
          transactionId: existing.id,
          checkoutRequestId: dto.checkout_request_id,
          operatorId: actor.userId,
        },
        'checkout idempotent replay',
      );
      return this.receiptService.compose(this.prisma, existing.id, actor);
    }

    // validasi produk aktif + harga efektif (BR-012) — murni in-memory dari hasil read fase 1.
    const lines = this.validateAndBuildLines(normalized, products);

    // total = subtotal (OD-004/DR-013); tidak ada field payment amount (FR-PAY-003)
    const subtotal = lines.reduce(
      (acc, l) => acc.add(l.subtotal),
      new Prisma.Decimal(0),
    );
    const total = subtotal;

    const ctx: CheckoutContext = {
      actor,
      dto,
      requestHash,
      transactionId,
      subtotal,
      total,
      lines,
    };
    const transaction = await this.commitCheckout(ctx);

    const soldQty = lines.reduce((s, l) => s + l.quantity, 0);
    posCheckoutTotal.inc({
      payment_method: dto.payment_method,
      status: 'success',
    });
    posRevenueTotal.inc({ payment_method: dto.payment_method }, Number(total));
    posItemsSoldTotal.inc(soldQty);

    this.logger.log(
      {
        transactionId: transaction.transaction_id,
        transactionNumber: transaction.transaction_number,
        outletId: dto.outlet_id,
        operatorId: actor.userId,
        itemCount: lines.length,
        totalSoldQty: soldQty,
        total: total.toFixed(2),
        paymentMethod: dto.payment_method,
      },
      'checkout completed',
    );

    return transaction;
  }

  // menjalankan interactive transaction checkout dengan retry pada write conflict /
  // deadlock (Prisma P2034). Korban deadlock di-rollback otomatis oleh Postgres,
  // sehingga percobaan ulang selalu aman dan tetap idempotent.
  private async commitCheckout(
    ctx: CheckoutContext,
  ): Promise<CheckoutResultDto> {
    const MAX_ATTEMPTS = 5;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      try {
        return await this.executeCheckoutTransaction(ctx);
      } catch (err) {
        // PostgreSQL aborts the interactive transaction after a unique violation.
        // Therefore the competing row must be read with the root Prisma client,
        // outside the failed transaction; querying through `tx` would turn a
        // successful concurrent checkout into a 500 response.
        if (this.isCheckoutRequestUniqueConflict(err)) {
          const replayed = await this.repository.findByCheckoutRequest(
            this.prisma,
            ctx.actor.merchantId,
            ctx.dto.checkout_request_id,
          );
          if (replayed) {
            if (replayed.requestHash !== ctx.requestHash) {
              throw this.idempotencyConflict();
            }
            return this.receiptService.compose(
              this.prisma,
              replayed.id,
              ctx.actor,
            );
          }
        }

        // P2034 (write conflict/deadlock) atau 40P01 dari raw query ($queryRaw tidak
        // selalu dipetakan Prisma ke kode P2034) -> percobaan ulang aman karena
        // transaksi korban sudah di-rollback oleh Postgres.
        const isDeadlock =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          (err.code === 'P2034' ||
            (typeof err.message === 'string' &&
              /deadlock|40P01/i.test(err.message)));
        if (!isDeadlock || attempt === MAX_ATTEMPTS - 1) {
          posCheckoutTotal.inc({
            payment_method: ctx.dto.payment_method,
            status: 'error',
          });
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
      }
    }
    throw new Error('checkout: unreachable');
  }

  private async executeCheckoutTransaction(
    ctx: CheckoutContext,
  ): Promise<CheckoutResultDto> {
    return this.prisma.$transaction(
      async (tx) => {
        const created = await this.createOrReplay(tx, ctx);

        const reservation = await this.stockReservationPort.reserveForSale({
          merchantId: ctx.actor.merchantId,
          outletId: ctx.dto.outlet_id,
          transactionId: ctx.transactionId,
          actorUserId: ctx.actor.userId,
          tx,
          lines: ctx.lines.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        });
        if (reservation.ok === false) {
          posCheckoutTotal.inc({
            payment_method: ctx.dto.payment_method,
            status: 'insufficient_stock',
          });
          throw ApiError.conflict(
            ErrorCode.INSUFFICIENT_STOCK,
            'Stok tidak mencukupi.',
            reservation.insufficient.map((i) => ({
              field: `items[].product_id=${i.productId}`,
              reason: `stock=${i.available}, requested=${i.requested}`,
            })),
          );
        }

        // commit -> return receipt tersimpan (tanpa outbox/event, FR-CHK-014/015)
        return this.receiptService.compose(tx, created.id, ctx.actor);
      },
      {
        // remote Neon ~0.5-1s/query; transaksi checkout hanya berisi write pendek,
        // naikkan batas agar tidak kedaluwarsa pada DB dengan latensi tinggi.
        maxWait: 10_000,
        timeout: 30_000,
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );
  }

  // create transaction; unique (merchant_id + checkout_request_id) menjaga hanya
  // satu request yang commit. Race replay ditangani di luar interactive transaction
  // karena PostgreSQL menandai transaksi sebagai failed setelah P2002.
  private async createOrReplay(
    tx: Prisma.TransactionClient,
    ctx: CheckoutContext,
  ): Promise<{ id: string }> {
    const transaction = await this.repository.createTransaction(tx, {
      id: ctx.transactionId,
      merchantId: ctx.actor.merchantId,
      outletId: ctx.dto.outlet_id,
      operatorUserId: ctx.actor.userId,
      transactionNumber: await this.repository.nextTransactionNumber(tx),
      checkoutRequestId: ctx.dto.checkout_request_id,
      requestHash: ctx.requestHash,
      status: TransactionStatus.COMPLETED,
      paymentMethod: ctx.dto.payment_method,
      paymentStatus: 'CONFIRMED',
      paidAt: new Date(),
      subtotal: ctx.subtotal,
      total: ctx.total,
      items: ctx.lines.map((l) => ({
        productId: l.productId,
        productNameSnapshot: l.name,
        unitPriceSnapshot: l.unitPrice,
        quantity: l.quantity,
        subtotal: l.subtotal,
      })),
    });
    return { id: transaction.id };
  }

  private isCheckoutRequestUniqueConflict(error: unknown): boolean {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }
    const target = error.meta?.target;
    let fields = '';
    if (Array.isArray(target)) {
      fields = target.join('_');
    } else if (typeof target === 'string') {
      fields = target;
    }
    const normalized = fields.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return (
      normalized.includes('checkout_request_id') ||
      normalized.includes('checkoutrequestid')
    );
  }

  private validateAndBuildLines(
    normalized: NormalizedItem[],
    products: Awaited<
      ReturnType<typeof this.productReadPort.getProductsForSaleValidation>
    >,
  ): CheckoutLine[] {
    const productById = new Map(products.map((p) => [p.id, p]));
    const lines: CheckoutLine[] = [];

    for (const item of normalized) {
      const product = productById.get(item.productId);
      if (!product) {
        throw ApiError.notFound(`Product tidak ditemukan: ${item.productId}`);
      }
      if (!product.isActive) {
        throw ApiError.conflict(
          ErrorCode.PRODUCT_INACTIVE,
          'Produk tidak aktif.',
          [{ field: 'items[].product_id', reason: item.productId }],
        );
      }
      if (!product.isCategoryActive) {
        throw ApiError.conflict(
          ErrorCode.CATEGORY_INACTIVE,
          'Kategori produk tidak aktif.',
          [{ field: 'items[].product_id', reason: item.productId }],
        );
      }
      const unitPrice = new Prisma.Decimal(product.effectivePrice);
      if (
        item.expectedUnitPrice &&
        !new Prisma.Decimal(item.expectedUnitPrice).equals(unitPrice)
      ) {
        throw ApiError.conflict(
          ErrorCode.PRICE_CHANGED,
          'Harga produk berubah.',
          [
            {
              field: 'items[].product_id',
              reason: `current_price=${product.effectivePrice}`,
            },
          ],
        );
      }
      lines.push({
        productId: product.id,
        name: product.name,
        unitPrice,
        quantity: item.quantity,
        subtotal: unitPrice.mul(item.quantity),
      });
    }

    return lines;
  }

  private idempotencyConflict(): ApiError {
    return ApiError.conflict(
      ErrorCode.IDEMPOTENCY_CONFLICT,
      'Konflik idempotency checkout.',
    );
  }
}
