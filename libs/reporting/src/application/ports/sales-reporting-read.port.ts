/**
 * Filter pembacaan fakta transaksi COMPLETED dari modul Sales.
 * Port ini read-only dan membaca dari Read Replica.
 */
export interface SalesReportingQuery {
  /** Batas tenant Merchant pemilik transaksi. */
  merchantId: string;

  /** Filter opsional untuk transaksi pada Outlet tertentu. */
  outletId?: string;

  /** Batas awal rentang waktu pembayaran (UTC). */
  dateFrom: Date;

  /** Batas akhir rentang waktu pembayaran (UTC). */
  dateTo: Date;

  /** Zona waktu Merchant untuk normalisasi batas kalender. */
  timezone: string;
}

/**
 * Data transaksi selesai dan snapshot item penjualan.
 */
export interface CompletedTransactionFact {
  transactionId: string;
  outletId: string;
  /** Waktu transaksi dibayar (transaction.paidAt ?? transaction.createdAt). */
  occurredAt: Date;
  /** Nilai total transaksi (format desimal 2 digit). */
  total: string;
  items: Array<{
    productId: string;
    productNameSnapshot: string;
    quantity: number;
    subtotal: string;
  }>;
}

export abstract class SalesReportingReadPort {
  /**
   * Membaca fakta transaksi COMPLETED dari Read Replica tanpa mengekspos Prisma Sales.
   *
   * Digunakan oleh:
   * - Reporting untuk menghitung omzet, AOV, tren, ranking, dan pola jam.
   *
   * SalesReportingReadPort
   * ├── filter transaksi status COMPLETED
   * ├── rentang waktu berdasarkan paidAt
   * ├── snapshot nama dan subtotal item penjualan
   * └── eksekusi query pada Read Replica
   */
  abstract listCompletedTransactionFacts(
    query: SalesReportingQuery,
  ): Promise<CompletedTransactionFact[]>;
}
