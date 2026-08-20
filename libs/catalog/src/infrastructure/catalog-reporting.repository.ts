import { Injectable } from '@nestjs/common';
import { PrismaReadService } from '@app/platform';

export interface ReportingProductRecord {
  id: string;
  name: string;
}

export interface CatalogReportingSummaryRecord {
  activeProductCount: number;
  inactiveProductCount: number;
  inactiveCategoryCount: number;
}

// repository pembacaan data katalog dari read replica untuk kebutuhan reporting.
@Injectable()
export class CatalogReportingRepository {
  constructor(private readonly prisma: PrismaReadService) {}

  // membaca produk aktif dengan kategori aktif milik merchant.
  findSellableProducts(merchantId: string): Promise<ReportingProductRecord[]> {
    return this.prisma.product.findMany({
      where: {
        merchantId,
        isActive: true,
        category: { isActive: true },
      },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
  }

  // menghitung total produk aktif/nonaktif dan kategori nonaktif dalam merchant.
  async findCatalogSummary(
    merchantId: string,
  ): Promise<CatalogReportingSummaryRecord> {
    const [activeProductCount, inactiveProductCount, inactiveCategoryCount] =
      await Promise.all([
        this.prisma.product.count({
          where: { merchantId, isActive: true },
        }),
        this.prisma.product.count({
          where: { merchantId, isActive: false },
        }),
        this.prisma.category.count({
          where: { merchantId, isActive: false },
        }),
      ]);
    return {
      activeProductCount,
      inactiveProductCount,
      inactiveCategoryCount,
    };
  }
}
