import { ReportingDataset, ReportingDatasetRequest } from '../reporting.models';

export abstract class ReportingReadPort {
  /**
   * Menyediakan dataset agregasi bisnis terstruktur untuk konsumsi AI LLM.
   *
   * Digunakan oleh:
   * - Modul Insight AI untuk menghasilkan rekomendasi bisnis Owner.
   *
   * ReportingReadPort
   * ├── agregasi total omzet, transaksi, dan AOV
   * ├── deret waktu tren penjualan & AOV kronologis
   * ├── ranking produk terlaris & kurang laku
   * ├── perbandingan kinerja antar-cabang Outlet
   * ├── distribusi jam transaksi 24 jam lokal
   * └── fingerprint versi data untuk deduplikasi AI
   */
  abstract getDataset(
    request: ReportingDatasetRequest,
  ): Promise<ReportingDataset>;
}
