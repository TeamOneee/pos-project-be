/*
 * menyediakan current catalog minimum yang dibutuhkan reporting.
 *
 * data penjualan dan ranking tetap berasal dari ReportingProjection. port ini
 * hanya melengkapi daftar least-selling dengan product yang masih efektif dapat
 * dijual tetapi belum mempunyai penjualan pada periode yang dipilih.
 * implementasi wajib membatasi data berdasarkan merchant serta hanya
 * mengembalikan product aktif yang category-nya juga aktif.
 */

export interface CatalogReportingProduct {
  // id digunakan untuk mencocokkan current product dengan metrics projection.
  id: string;
  // nama saat ini ditampilkan ketika product belum memiliki snapshot penjualan.
  name: string;
}

// menjadi batas baca lintas modul tanpa mengekspos repository atau prisma catalog.
export abstract class CatalogReportingReadPort {
  // mengembalikan product yang efektif dapat dijual dalam satu merchant.
  abstract getSellableProducts(
    merchantId: string,
  ): Promise<CatalogReportingProduct[]>;
}
