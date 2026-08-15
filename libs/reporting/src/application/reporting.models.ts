// menentukan ukuran bucket untuk penyimpanan dan tren dashboard.
export type ReportingBucket = 'HOUR' | 'DAY';

// menandai apakah projection kemungkinan tertinggal dari sumber transaksi.
export type FreshnessStatus = 'FRESH' | 'STALE';

// membawa filter Owner dari web ke application tanpa bergantung pada dto http.
export interface BusinessDashboardRequest {
  merchantId: string;
  dateFrom: Date;
  dateTo: Date;
  outletId?: string;
  bucket?: ReportingBucket;
  limit?: number;
}

// merepresentasikan satu aggregate penjualan per outlet dan per jam dari read replica.
export interface ProjectionRecord {
  outletId: string;
  periodStart: Date;
  omzet: string;
  transactionCount: bigint;
  sourceWatermark: Date;
  products: ProjectionProductMetric[];
}

// merepresentasikan aggregate product yang tersimpan di metrics projection.
export interface ProjectionProductMetric {
  productId: string;
  productNameSnapshot: string;
  unitsSold: bigint;
  omzet: string;
}

// menyimpan angka utama yang selalu ditampilkan pada dashboard Owner.
export interface DashboardSummary {
  omzet: string;
  transactionCount: number;
  averageTransactionValue: string;
  dataUpdatedAt: Date | null;
  freshnessStatus: FreshnessStatus;
  periodStart: Date;
  periodEnd: Date;
  timezone: string;
}

// menyimpan satu titik kronologis untuk sales trend.
export interface SalesTrendPoint {
  bucketStart: Date;
  omzet: string;
  transactionCount: number;
}

// menyimpan satu titik kronologis untuk aov trend.
export interface AovTrendPoint {
  bucketStart: Date;
  averageTransactionValue: string;
}

// menyimpan aggregate transaksi berdasarkan jam lokal Merchant.
export interface TimePatternPoint {
  hourOfDay: number;
  omzet: string;
  transactionCount: number;
}

// menyimpan hasil ranking product yang aman dikirim sebagai json.
export interface ProductPerformanceItem {
  productId: string;
  name: string;
  unitsSold: number;
  omzet: string;
}

// menyimpan perbandingan penjualan antaroutlet dalam periode yang sama.
export interface OutletComparisonItem {
  outletId: string;
  outletName: string;
  omzet: string;
  transactionCount: number;
}

// menjadi snapshot lengkap yang dikonsumsi endpoint Owner dan Insight di masa depan.
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
