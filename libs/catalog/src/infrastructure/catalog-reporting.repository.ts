import { Injectable } from '@nestjs/common';
import { PrismaReadService } from '@app/platform';

export interface ReportingProductRecord {
  id: string;
  name: string;
}

@Injectable()
// membaca current state katalog dari read replica untuk kebutuhan reporting.
export class CatalogReportingRepository {
  constructor(private readonly prisma: PrismaReadService) {}

  findSellableProducts(merchantId: string): Promise<ReportingProductRecord[]> {
    // product dan category harus aktif sesuai aturan katalog kasir.
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
}
