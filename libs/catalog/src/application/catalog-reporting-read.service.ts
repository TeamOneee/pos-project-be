import { Injectable } from '@nestjs/common';
import { CatalogReportingRepository } from '../infrastructure/catalog-reporting.repository';
import {
  CatalogReportingProduct,
  CatalogReportingReadPort,
} from './ports/catalog-reporting-read.port';

@Injectable()
// membentuk snapshot katalog efektif untuk reporting sesuai fr-rep-003b.
export class CatalogReportingReadService extends CatalogReportingReadPort {
  constructor(private readonly repository: CatalogReportingRepository) {
    super();
  }

  async getSellableProducts(
    merchantId: string,
  ): Promise<CatalogReportingProduct[]> {
    // product tanpa penjualan perlu dibaca karena belum ada pada projection.
    return this.repository.findSellableProducts(merchantId);
  }
}
