/**
 * Input baca Product untuk kebutuhan internal Inventory dan Sales.
 * Port ini read-only dan bukan endpoint HTTP.
 */
export interface ProductReadRequest {
  /** Batas tenant; hanya Product milik Merchant ini yang boleh dikembalikan. */
  merchantId: string;

  /** Outlet yang menentukan harga efektif Product. */
  outletId: string;

  /** ID Product yang perlu dibaca oleh modul pemanggil. */
  productIds: string[];
}

/**
 * Data minimum Product yang boleh diketahui modul lain.
 * effectivePrice adalah harga Outlet jika tersedia, atau harga master Product.
 */
export interface ProductForSale {
  id: string;
  merchantId: string;
  categoryId: string;
  name: string;
  isActive: boolean;
  isCategoryActive: boolean;
  effectivePrice: string;
}

export abstract class ProductReadPort {
  /**
   * Membaca kandidat Product tanpa mengekspos repository atau Prisma.
   *
   * Digunakan oleh:
   * - Inventory untuk menggabungkan data Product dengan stok per Outlet.
   * - Sales untuk memvalidasi Product, Category, dan harga saat checkout.
   *
   * Catalog memvalidasi bahwa Outlet aktif dan milik Merchant pada input.
   * Output mengikuti urutan ID unik; ID yang tidak ditemukan tidak dikembalikan.
   * Pemanggil tetap wajib memeriksa kelengkapan hasil, isActive, dan
   * isCategoryActive. Port ini tidak mengelola atau memeriksa stok.
   * ProductReadPort
   * ├── validasi Outlet aktif dalam Merchant
   * ├── validasi Product berada di Merchant
   * ├── status Product
   * ├── status Category
   * └── harga efektif Outlet
   */
  abstract getProductsForSaleValidation(
    request: ProductReadRequest,
  ): Promise<ProductForSale[]>;
}
