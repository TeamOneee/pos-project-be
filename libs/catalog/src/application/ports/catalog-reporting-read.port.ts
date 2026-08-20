/**
 * Produk aktif di katalog untuk melengkapi ranking least-selling.
 */
export interface CatalogReportingProduct {
  /** ID unik Product untuk pencocokan fakta penjualan. */
  id: string;
  /** Nama Product saat ini sebagai fallback jika belum ada snapshot penjualan. */
  name: string;
}

/**
 * Ringkasan status katalog untuk dashboard operasional Admin.
 */
export interface CatalogReportingSummary {
  activeProductCount: number;
  inactiveProductCount: number;
  inactiveCategoryCount: number;
}

export abstract class CatalogReportingReadPort {
  /**
   * Membaca produk yang aktif dan category-nya aktif dalam satu Merchant.
   *
   * Digunakan oleh:
   * - Reporting untuk melengkapi produk 0 penjualan pada least-selling (FR-REP-003B).
   *
   * CatalogReportingReadPort
   * ├── validasi status Product aktif (isActive = true)
   * ├── validasi status Category aktif (category.isActive = true)
   * └── isolasi tenant per Merchant
   */
  abstract getSellableProducts(
    merchantId: string,
  ): Promise<CatalogReportingProduct[]>;

  /**
   * Menghitung jumlah master produk dan kategori aktif/nonaktif.
   *
   * Digunakan oleh:
   * - Dashboard operasional Admin dan Owner (GET /dashboard/operations).
   */
  abstract getCatalogReportingSummary(
    merchantId: string,
  ): Promise<CatalogReportingSummary>;
}
