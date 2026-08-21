import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaReadService } from '@app/platform';
import {
  CompletedTransactionFact,
  SalesReportingQuery,
} from '../application/ports/sales-reporting-read.port';

interface FactItemRow {
  transactionId: string;
  outletId: string;
  occurredAt: Date;
  total: string;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  subtotal: string;
}

@Injectable()
export class SalesReportingRepository {
  constructor(private readonly prismaRead: PrismaReadService) {}

  async findCompletedTransactionFacts(
    query: SalesReportingQuery,
  ): Promise<CompletedTransactionFact[]> {
    const outletFilter = query.outletId
      ? Prisma.sql`AND t.outlet_id = ${query.outletId}`
      : Prisma.empty;

    const rows = await this.prismaRead.$queryRaw<FactItemRow[]>`
      SELECT
        t.id                            AS "transactionId",
        t.outlet_id                     AS "outletId",
        COALESCE(t.paid_at, t.created_at) AS "occurredAt",
        t.total::text                   AS total,
        i.product_id                    AS "productId",
        i.product_name_snapshot         AS "productNameSnapshot",
        i.quantity                      AS quantity,
        i.subtotal::text                AS subtotal
      FROM transaction t
      JOIN transaction_item i ON i.transaction_id = t.id
      WHERE t.merchant_id = ${query.merchantId}
        AND t.status = 'COMPLETED'
        AND t.paid_at >= ${query.dateFrom}
        AND t.paid_at <= ${query.dateTo}
        ${outletFilter}
      ORDER BY t.paid_at ASC
    `;

    return this.groupByTransaction(rows);
  }

  private groupByTransaction(rows: FactItemRow[]): CompletedTransactionFact[] {
    const byId = new Map<string, CompletedTransactionFact>();
    for (const row of rows) {
      let fact = byId.get(row.transactionId);
      if (!fact) {
        fact = {
          transactionId: row.transactionId,
          outletId: row.outletId,
          occurredAt: row.occurredAt,
          total: row.total,
          items: [],
        };
        byId.set(row.transactionId, fact);
      }
      fact.items.push({
        productId: row.productId,
        productNameSnapshot: row.productNameSnapshot,
        quantity: row.quantity,
        subtotal: row.subtotal,
      });
    }
    return [...byId.values()];
  }
}
