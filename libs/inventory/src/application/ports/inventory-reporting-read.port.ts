/**
 * Parameter query pembacaan status stok dari modul Inventory.
 * Port ini read-only dan membaca dari Read Replica.
 */
export interface InventoryReportingQuery {
  /** Batas tenant Merchant pemilik inventaris. */
  merchantId: string;

  /** Filter opsional untuk cabang Outlet tertentu. */
  outletId?: string;
}

/**
 * Ringkasan jumlah item stok operasional.
 */
export interface InventoryOperationalData {
  inventoryItemCount: number;
  lowStockItemCount: number;
  outOfStockItemCount: number;
}

/**
 * Rincian item stok menipis beserta threshold dasar dan override aktif.
 */
export interface InventoryLowStockItem {
  productId: string;
  name: string;
  outletId: string;
  outletName: string;
  quantity: number;
  baseLowStockThreshold: number;
  lowStockThresholdOverride: number | null;
  effectiveLowStockThreshold: number;
}

export abstract class InventoryReportingReadPort {
  /**
   * Membaca ringkasan stok operasional toko tanpa metrik finansial.
   *
   * Digunakan oleh:
   * - Dashboard operasional Admin dan Owner (GET /dashboard/operations).
   *
   * InventoryReportingReadPort
   * ├── total varian inventaris terdaftar
   * ├── jumlah item stok menipis (<= ambang batas)
   * └── jumlah item stok habis (= 0)
   */
  abstract getOperationalData(
    query: InventoryReportingQuery,
  ): Promise<InventoryOperationalData>;

  /**
   * Mengambil daftar produk yang berada pada atau di bawah ambang batas stok.
   *
   * Digunakan oleh:
   * - Endpoint stok rendah Admin dan Owner (GET /dashboard/low-stock).
   *
   * listLowStock
   * ├── evaluasi threshold override Outlet vs master Product
   * ├── filter quantity <= effectiveLowStockThreshold
   * └── urutan berdasarkan stok terkecil
   */
  abstract listLowStock(
    query: InventoryReportingQuery,
  ): Promise<InventoryLowStockItem[]>;
}
