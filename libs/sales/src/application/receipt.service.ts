import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser, PrismaWriteService } from '@app/platform';
import { CheckoutResultDto, ReceiptDto } from '../web/dto/checkout-result.dto';
import { ForbiddenError, NotFoundError } from '@app/platform';

type DbClient = Prisma.TransactionClient | PrismaWriteService;

@Injectable()
export class ReceiptService {
  /** Komposisi respons dari snapshot transaksi (bukan re-query katalog — 07 §5.2). */
  async compose(
    client: DbClient,
    transactionId: string,
    actor: AuthenticatedUser,
    withBusinessInfo = false,
  ): Promise<CheckoutResultDto | ReceiptDto> {
    const db = client as unknown as PrismaWriteService;

    const tx = await db.transaction.findUnique({
      where: { id: transactionId },
      include: { lines: true, payment: true },
    });

    if (!tx || tx.merchantId !== actor.merchantId) {
      throw new NotFoundError('Transaction not found.');
    }
    if (actor.role === 'CASHIER' && tx.cashierUserId !== actor.userId) {
      throw new ForbiddenError('You cannot access this transaction.');
    }

    const cashier = await db.user.findUnique({
      where: { id: tx.cashierUserId },
    });
    const merchant = withBusinessInfo
      ? await db.merchant.findUnique({ where: { id: tx.merchantId } })
      : null;
    const outlet = withBusinessInfo
      ? await db.outlet.findUnique({ where: { id: tx.outletId } })
      : null;

    const result: CheckoutResultDto = {
      transaction_id: tx.id,
      receipt_number: tx.receiptNumber,
      status: tx.status,
      outlet_id: tx.outletId,
      cashier: cashier ? { user_id: cashier.id, name: cashier.fullName } : null,
      items: tx.lines.map((l) => ({
        product_id: l.productId,
        name: l.productNameSnapshot,
        unit_price: l.unitPriceSnapshot.toFixed(2),
        quantity: l.quantity,
        subtotal: l.subtotal.toFixed(2),
      })),
      subtotal: tx.subtotal.toFixed(2),
      total: tx.total.toFixed(2),
      payment: tx.payment
        ? {
            method: tx.payment.method,
            amount: tx.payment.amount.toFixed(2),
            status: tx.payment.status,
          }
        : null,
      created_at: tx.createdAt.toISOString(),
    };

    if (!withBusinessInfo) return result;

    return {
      ...result,
      merchant_name: merchant?.name ?? '',
      outlet_name: outlet?.name ?? '',
      outlet_address: outlet?.address ?? null,
    };
  }

  async getReceipt(actor: AuthenticatedUser, transactionId: string) {
    return this.compose(this.prisma, transactionId, actor, true);
  }

  constructor(private readonly prisma: PrismaWriteService) {}
}
