// model domain, parameter request, snapshot, dan tipe data agregat modul reporting.

// ukuran bucket waktu tren dan analitik: per jam atau per hari.
export type ReportingBucket = 'HOUR' | 'DAY';

// status kesegaran data dari database read replica atau redis fallback.
export type FreshnessStatus = 'FRESH' | 'STALE';

// parameter query bisnis owner untuk dashboard dan dataset.
export interface BusinessDashboardRequest {
  merchantId: string;
  dateFrom: Date;
  dateTo: Date;
  outletId?: string;
  bucket?: ReportingBucket;
  limit?: number;
}

// metadata standar response dashboard untuk waktu update dan timezone.
export interface DashboardMeta {
  dataUpdatedAt: Date;
  freshnessStatus: FreshnessStatus;
  timezone: string;
  periodStart: Date;
  periodEnd: Date;
}

// ringkasan metrik utama omzet, transaksi, dan aov sesuai fr-rep-001.
export interface DashboardSummary extends DashboardMeta {
  omzet: string;
  transactionCount: number;
  averageTransactionValue: string;
}

// titik tren penjualan kronologis berisi omzet dan count per bucket.
export interface SalesTrendPoint {
  bucketStart: Date;
  omzet: string;
  transactionCount: number;
}

// titik tren aov kronologis per bucket waktu.
export interface AovTrendPoint {
  bucketStart: Date;
  averageTransactionValue: string;
}

// distribusi penjualan 24 jam lokal merchant untuk deteksi jam sibuk.
export interface TimePatternPoint {
  hourOfDay: number;
  omzet: string;
  transactionCount: number;
}

// metrik per produk untuk ranking terlaris dan paling sedikit terjual.
export interface ProductPerformanceItem {
  productId: string;
  name: string;
  unitsSold: number;
  omzet: string;
}

// metrik kinerja penjualan per cabang outlet.
export interface OutletComparisonItem {
  outletId: string;
  outletName: string;
  omzet: string;
  transactionCount: number;
}

// payload data agregat bisnis yang disimpan dalam redis cache.
export interface BusinessDashboardData {
  omzet: string;
  transactionCount: number;
  averageTransactionValue: string;
  bucket: ReportingBucket;
  salesTrend: SalesTrendPoint[];
  aovTrend: AovTrendPoint[];
  timePattern: TimePatternPoint[];
  topSelling: ProductPerformanceItem[];
  leastSelling: ProductPerformanceItem[];
  outletComparison: OutletComparisonItem[];
}

// snapshot lengkap agregasi bisnis bersama metadata waktu dan freshness.
export interface BusinessDashboardSnapshot {
  summary: DashboardSummary;
  bucket: ReportingBucket;
  salesTrend: SalesTrendPoint[];
  aovTrend: AovTrendPoint[];
  timePattern: TimePatternPoint[];
  topSelling: ProductPerformanceItem[];
  leastSelling: ProductPerformanceItem[];
  outletComparison: OutletComparisonItem[];
}

// data kondisi operasional stok dan katalog untuk role admin dan owner.
export interface OperationalDashboardData {
  inventoryItemCount: number;
  lowStockItemCount: number;
  outOfStockItemCount: number;
  activeProductCount: number;
  inactiveProductCount: number;
  inactiveCategoryCount: number;
  outletId?: string;
}

// snapshot dashboard operasional bersama waktu update dan timezone.
export interface OperationalDashboardSnapshot extends OperationalDashboardData {
  dataUpdatedAt: Date;
  freshnessStatus: 'FRESH';
  timezone: string;
}

// rincian item stok menipis beserta threshold dasar dan override aktif.
export interface LowStockItem {
  productId: string;
  name: string;
  outletId: string;
  outletName: string;
  quantity: number;
  baseLowStockThreshold: number;
  lowStockThresholdOverride: number | null;
  effectiveLowStockThreshold: number;
}

// parameter request dataset analitik untuk modul insight ai.
export interface ReportingDatasetRequest {
  merchantId: string;
  dateFrom: Date;
  dateTo: Date;
  outletId?: string;
  granularity?: ReportingBucket;
  dimensions?: Array<'outlet' | 'product' | 'hour'>;
}

// dataset agregat terstruktur yang diekspor untuk modul insight ai.
export interface ReportingDataset {
  summary: {
    totalOmzet: string;
    transactionCount: number;
    averageTransactionValue: string;
  };
  series: Array<{
    bucketStart: Date;
    omzet: string;
    transactionCount: number;
    averageTransactionValue: string;
  }>;
  byOutlet: OutletComparisonItem[];
  topProducts: ProductPerformanceItem[];
  leastSellingProducts: ProductPerformanceItem[];
  byHour: TimePatternPoint[];
  dataVersion: string;
  dataUpdatedAt: Date;
  freshnessStatus: FreshnessStatus;
  timezone: string;
}
