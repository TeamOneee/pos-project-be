import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaReadService } from '@app/platform';
import {
  ProjectionProductMetric,
  ProjectionRecord,
} from '../application/reporting.models';

export interface ProjectionReadRequest {
  merchantId: string;
  dateFrom: Date;
  dateTo: Date;
  outletId?: string;
}

@Injectable()
// membaca projection hour dari read replica tanpa menyentuh tabel transaksi.
export class ReportingProjectionReadRepository {
  constructor(private readonly prisma: PrismaReadService) {}

  async findSales(request: ProjectionReadRequest): Promise<ProjectionRecord[]> {
    // granularity hour dipilih agar summary, pattern, dan rentang dashboard memakai sumber sama.
    const rows = await this.prisma.reportingProjection.findMany({
      where: {
        merchantId: request.merchantId,
        outletId: request.outletId,
        granularity: 'HOUR',
        periodStart: { gte: request.dateFrom, lte: request.dateTo },
      },
      orderBy: { periodStart: 'asc' },
    });
    return rows.flatMap((row) =>
      row.outletId
        ? [
            {
              outletId: row.outletId,
              periodStart: row.periodStart,
              omzet: row.omzet.toFixed(2),
              transactionCount: row.transactionCount,
              sourceWatermark: row.sourceWatermark,
              products: parseProductMetrics(row.metrics),
            },
          ]
        : [],
    );
  }
}

function parseProductMetrics(
  metrics: Prisma.JsonValue,
): ProjectionProductMetric[] {
  // metrics adalah read model internal; bentuk rusak harus terlihat, bukan diabaikan.
  const root = asJsonObject(metrics);
  if (root.products === undefined) {
    return [];
  }
  const products = asJsonObject(root.products);
  return Object.entries(products).map(([productId, value]) => {
    const product = asJsonObject(value);
    if (
      typeof product.name !== 'string' ||
      typeof product.unitsSold !== 'string' ||
      typeof product.omzet !== 'string'
    ) {
      throw new Error('ReportingProjection.metrics.products tidak valid.');
    }
    try {
      return {
        productId,
        productNameSnapshot: product.name,
        unitsSold: BigInt(product.unitsSold),
        omzet: product.omzet,
      };
    } catch {
      throw new Error('ReportingProjection.metrics.products tidak valid.');
    }
  });
}

function asJsonObject(value: Prisma.JsonValue | undefined): Prisma.JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('ReportingProjection.metrics tidak valid.');
  }
  return value;
}
