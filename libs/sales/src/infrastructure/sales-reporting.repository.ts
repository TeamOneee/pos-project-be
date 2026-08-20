import { Injectable } from '@nestjs/common';
import { PrismaReadService } from '@app/platform';
import {
  CompletedTransactionFact,
  SalesReportingQuery,
} from '../application/ports/sales-reporting-read.port';

@Injectable()
export class SalesReportingRepository {
  constructor(private readonly prismaRead: PrismaReadService) {}

  async findCompletedTransactionFacts(
    query: SalesReportingQuery,
  ): Promise<CompletedTransactionFact[]> {
    const transactions = await this.prismaRead.transaction.findMany({
      where: {
        merchantId: query.merchantId,
        status: 'COMPLETED',
        ...(query.outletId ? { outletId: query.outletId } : {}),
        paidAt: {
          gte: query.dateFrom,
          lte: query.dateTo,
        },
      },
      select: {
        id: true,
        outletId: true,
        paidAt: true,
        createdAt: true,
        total: true,
        items: {
          select: {
            productId: true,
            productNameSnapshot: true,
            quantity: true,
            subtotal: true,
          },
        },
      },
      orderBy: { paidAt: 'asc' },
    });

    return transactions.map((t) => ({
      transactionId: t.id,
      outletId: t.outletId,
      occurredAt: t.paidAt ?? t.createdAt,
      total: t.total.toFixed(2),
      items: t.items.map((i) => ({
        productId: i.productId,
        productNameSnapshot: i.productNameSnapshot,
        quantity: i.quantity,
        subtotal: i.subtotal.toFixed(2),
      })),
    }));
  }
}
