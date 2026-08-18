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

  async nextTransactionNumber(tx: Db): Promise<string> {
    // DR-003/BR-018: nomor transaksi diambil dari sequence Postgres (migration
    // add_transaction_number_sequence). nextval atomic -> unik dan bebas race;
    // angka berurutan dijamin sequence, bukan count+1 (perbaikan race P2002).
    const year = new Date().getFullYear();
    const rows = await tx.$queryRaw<
      Array<{ seq: bigint }>
    >`SELECT nextval('transaction_number_seq') AS seq`;
    const seq = Number(rows[0]?.seq ?? 1);
    return `INV-${year}-${String(seq).padStart(6, '0')}`;
  }

  async createTransaction(tx: Db, data: CreateTransactionData) {
    // batch insert items via createMany (1 multi-row INSERT) alih-alih nested
    // create (1 query/item) agar transaksi checkout sesingkat mungkin.
    const transaction = await tx.transaction.create({
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
      },
    });
    await tx.transactionItem.createMany({
      data: data.items.map((i) => ({
        transactionId: transaction.id,
        productId: i.productId,
        productNameSnapshot: i.productNameSnapshot,
        unitPriceSnapshot: i.unitPriceSnapshot,
        quantity: i.quantity,
        subtotal: i.subtotal,
      })),
    });
    return transaction;
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
