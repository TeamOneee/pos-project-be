import { Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';

type Db = Prisma.TransactionClient | PrismaWriteService;

@Injectable()
export class TransactionRepository {
  constructor(private readonly prisma: PrismaWriteService) {}

  findIdempotency(
    tx: Db,
    merchantId: string,
    outletId: string,
    idempotencyKey: string,
  ) {
    return tx.idempotencyRecord.findUnique({
      where: {
        merchantId_outletId_idempotencyKey: {
          merchantId,
          outletId,
          idempotencyKey,
        },
      },
    });
  }

  createIdempotency(
    tx: Db,
    data: {
      merchantId: string;
      outletId: string;
      actorUserId: string;
      idempotencyKey: string;
      payloadFingerprint: string;
      state: string;
      expiresAt: Date;
    },
  ) {
    return tx.idempotencyRecord.create({ data });
  }

  updateIdempotencyState(
    tx: Db,
    merchantId: string,
    outletId: string,
    idempotencyKey: string,
    data: { state: string; transactionId?: string | null },
  ) {
    return tx.idempotencyRecord.update({
      where: {
        merchantId_outletId_idempotencyKey: {
          merchantId,
          outletId,
          idempotencyKey,
        },
      },
      data,
    });
  }

  async nextReceiptNumber(tx: Db, merchantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const count = await tx.transaction.count({
      where: { merchantId, createdAt: { gte: startOfYear } },
    });
    return `INV-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  createTransaction(
    tx: Db,
    data: {
      merchantId: string;
      outletId: string;
      cashierUserId: string;
      receiptNumber: string;
      status: string;
      subtotal: Prisma.Decimal;
      total: Prisma.Decimal;
      lines: {
        productId: string;
        productNameSnapshot: string;
        unitPriceSnapshot: Prisma.Decimal;
        quantity: number;
        subtotal: Prisma.Decimal;
      }[];
      payment: {
        method: PaymentMethod;
        amount: Prisma.Decimal;
        status: string;
        confirmedBy: string;
      };
    },
  ) {
    return tx.transaction.create({
      data: {
        merchantId: data.merchantId,
        outletId: data.outletId,
        cashierUserId: data.cashierUserId,
        receiptNumber: data.receiptNumber,
        status: data.status as Prisma.TransactionCreateInput['status'],
        subtotal: data.subtotal,
        total: data.total,
        lines: { create: data.lines },
        payment: { create: data.payment },
      },
    });
  }

  findTransactionById(tx: Db, id: string) {
    return tx.transaction.findUnique({
      where: { id },
      include: { lines: true, payment: true },
    });
  }

  findTransactionByReceipt(merchantId: string, receiptNumber: string) {
    return this.prisma.transaction.findFirst({
      where: { merchantId, receiptNumber },
    });
  }

  listTransactions(
    where: Prisma.TransactionWhereInput,
    skip: number,
    take: number,
  ) {
    return this.prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  countTransactions(where: Prisma.TransactionWhereInput) {
    return this.prisma.transaction.count({ where });
  }

  findUsersByIds(ids: string[]) {
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true },
    });
  }
}
