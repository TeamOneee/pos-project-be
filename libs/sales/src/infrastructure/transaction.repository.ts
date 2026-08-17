import { Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma, TransactionStatus } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';

type Db = Prisma.TransactionClient | PrismaWriteService;

export interface CreateTransactionData {
  id: string;
  merchantId: string;
  outletId: string;
  operatorUserId: string;
  transactionNumber: string;
  checkoutRequestId: string;
  requestHash: string;
  status: TransactionStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  paidAt: Date;
  subtotal: Prisma.Decimal;
  total: Prisma.Decimal;
  items: {
    productId: string;
    productNameSnapshot: string;
    unitPriceSnapshot: Prisma.Decimal;
    quantity: number;
    subtotal: Prisma.Decimal;
  }[];
}

// menyimpan dan membaca Transaction (idempotency via checkout_request_id, OD-012).
@Injectable()
export class TransactionRepository {
  constructor(private readonly prisma: PrismaWriteService) {}

  findByCheckoutRequest(tx: Db, merchantId: string, checkoutRequestId: string) {
    return tx.transaction.findUnique({
      where: {
        merchantId_checkoutRequestId: { merchantId, checkoutRequestId },
      },
      select: { id: true, requestHash: true },
    });
  }

  async nextTransactionNumber(tx: Db, merchantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const count = await tx.transaction.count({
      where: { merchantId, createdAt: { gte: startOfYear } },
    });
    return `INV-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  createTransaction(tx: Db, data: CreateTransactionData) {
    return tx.transaction.create({
      data: {
        id: data.id,
        merchantId: data.merchantId,
        outletId: data.outletId,
        operatorUserId: data.operatorUserId,
        transactionNumber: data.transactionNumber,
        checkoutRequestId: data.checkoutRequestId,
        requestHash: data.requestHash,
        status: data.status,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus,
        paidAt: data.paidAt,
        subtotal: data.subtotal,
        total: data.total,
        items: { create: data.items },
      },
    });
  }

  findTransactionByNumber(merchantId: string, transactionNumber: string) {
    return this.prisma.transaction.findFirst({
      where: { merchantId, transactionNumber },
      select: { id: true },
    });
  }

  listTransactions(
    where: Prisma.TransactionWhereInput,
    skip: number,
    take: number,
  ) {
    return this.prisma.transaction.findMany({
      where,
      include: { operator: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  countTransactions(where: Prisma.TransactionWhereInput) {
    return this.prisma.transaction.count({ where });
  }
}
