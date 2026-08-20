import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiError, AuthUser, PrismaWriteService } from '@app/platform';
import { CheckoutResultDto, ReceiptDto } from '../web/dto/checkout-result.dto';

type DbClient = Prisma.TransactionClient | PrismaWriteService;

const TRANSACTION_DETAIL_INCLUDE = {
  items: true,
  operator: { select: { id: true, name: true, role: true } },
  merchant: { select: { name: true } },
  outlet: { select: { name: true, address: true } },
} satisfies Prisma.TransactionInclude;

// komposisi respons dari snapshot transaksi (bukan re-query katalog — 07 §5.2).
@Injectable()
export class ReceiptService {
  constructor(private readonly prisma: PrismaWriteService) {}

  async compose(
    client: DbClient,
    transactionId: string,
    actor: AuthUser,
    withBusinessInfo = false,
  ): Promise<CheckoutResultDto | ReceiptDto> {
    const tx = await client.transaction.findUnique({
      where: { id: transactionId },
      include: TRANSACTION_DETAIL_INCLUDE,
    });

    if (!tx || tx.merchantId !== actor.merchantId) {
      throw ApiError.notFound('Transaction tidak ditemukan.');
    }
    if (actor.role === 'CASHIER' && tx.operatorUserId !== actor.userId) {
      throw ApiError.forbidden('Anda tidak dapat mengakses transaksi ini.');
    }

    const base: CheckoutResultDto = {
      transaction_id: tx.id,
      transaction_number: tx.transactionNumber,
      status: tx.status,
      outlet_id: tx.outletId,
      operator: {
        user_id: tx.operator.id,
        role: tx.operator.role,
        name: tx.operator.name,
      },
      items: tx.items.map((l) => ({
        product_id: l.productId,
        name: l.productNameSnapshot,
        unit_price: l.unitPriceSnapshot.toFixed(2),
        quantity: l.quantity,
        subtotal: l.subtotal.toFixed(2),
      })),
      subtotal: tx.subtotal.toFixed(2),
      total: tx.total.toFixed(2),
      payment: {
        method: tx.paymentMethod,
        status: tx.paymentStatus,
        paid_at: tx.paidAt.toISOString(),
      },
      created_at: tx.createdAt.toISOString(),
    };

    if (!withBusinessInfo) return base;

    return {
      ...base,
      merchant_name: tx.merchant.name,
      outlet_name: tx.outlet.name,
      outlet_address: tx.outlet.address,
    };
  }

  async getReceipt(
    actor: AuthUser,
    transactionId: string,
  ): Promise<ReceiptDto> {
    return this.compose(
      this.prisma,
      transactionId,
      actor,
      true,
    ) as Promise<ReceiptDto>;
  }
}
