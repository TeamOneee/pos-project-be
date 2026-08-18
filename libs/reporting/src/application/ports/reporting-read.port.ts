import { ReportingDataset, ReportingDatasetRequest } from '../reporting.models';

export abstract class ReportingReadPort {
  /**
   * menyediakan dataset agregasi bisnis terstruktur untuk konsumsi ai llm.
   *
   * digunakan oleh:
   * - modul insight ai untuk menghasilkan rekomendasi bisnis owner.
   *
   * reportingreadport mencakup:
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
