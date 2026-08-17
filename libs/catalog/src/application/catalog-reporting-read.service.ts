import { Injectable } from '@nestjs/common';
import { CatalogReportingRepository } from '../infrastructure/catalog-reporting.repository';
import {
  CatalogReportingProduct,
  CatalogReportingReadPort,
  CatalogReportingSummary,
} from './ports/catalog-reporting-read.port';

// membaca katalog produk yang aktif untuk melengkapi ranking least-selling (fr-rep-003b)
// dan status inventaris katalog untuk ringkasan operasional admin (fr-rep-007).
@Injectable()
export class CatalogReportingReadService extends CatalogReportingReadPort {
  constructor(private readonly repository: CatalogReportingRepository) {
    super();
  }

  // membaca master produk yang aktif dan kategorinya aktif untuk produk 0 penjualan.
  async getSellableProducts(
    merchantId: string,
  ): Promise<CatalogReportingProduct[]> {
    return this.repository.findSellableProducts(merchantId);
  }

  // membaca ringkasan count produk/kategori aktif dan nonaktif untuk admin.
  async getCatalogReportingSummary(
    merchantId: string,
  ): Promise<CatalogReportingSummary> {
    return this.repository.findCatalogSummary(merchantId);
  }
}
