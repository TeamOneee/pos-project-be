/**
 * Data ringkas Outlet untuk perbandingan cabang dan pelaporan historis.
 */
export interface ReportingOutlet {
  /** ID unik Outlet. */
  id: string;
  /** Nama Outlet saat ini. */
  name: string;
}

/**
 * Konteks tenant yang dibutuhkan untuk kalkulasi Reporting.
 */
export interface TenantReportingContext {
  /** Zona waktu Merchant untuk menentukan batas hari/jam lokal (BR-018). */
  timezone: string;
  /** Seluruh Outlet milik Merchant (termasuk nonaktif untuk menjaga data historis). */
  outlets: ReportingOutlet[];
}

export abstract class TenantReportingReadPort {
  /**
   * Membaca timezone dan daftar Outlet dalam scope Merchant dari Read Replica.
   *
   * Digunakan oleh:
   * - Reporting untuk normalisasi waktu lokal (BR-018) dan perbandingan Outlet (FR-REP-005).
   *
   * TenantReportingReadPort
   * ├── validasi scope Merchant dan Outlet
   * ├── penentuan IANA timezone Merchant
   * └── daftar seluruh Outlet untuk perbandingan cabang
   */
  abstract getContext(
    merchantId: string,
    outletId?: string,
  ): Promise<TenantReportingContext>;
}
