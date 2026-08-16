// interface dto payload response json snake_case seluruh endpoint dashboard.
import {
  FreshnessStatus,
  ReportingBucket,
} from '../../application/reporting.models';

// payload response summary omzet, jumlah transaksi, dan aov.
export interface DashboardSummaryDto {
  omzet: string;
  transaction_count: number;
  average_transaction_value: string;
  data_updated_at: Date;
  freshness_status: FreshnessStatus;
  period_start: Date;
  period_end: Date;
  timezone: string;
}

// payload response titik tren penjualan kronologis.
export interface SalesTrendDto {
  bucket: ReportingBucket;
  data_updated_at: Date;
  freshness_status: FreshnessStatus;
  timezone: string;
  period_start: Date;
  period_end: Date;
  points: Array<{
    bucket_start: Date;
    omzet: string;
    transaction_count: number;
  }>;
}

// payload response titik tren aov kronologis.
export interface AovTrendDto {
  bucket: ReportingBucket;
  data_updated_at: Date;
  freshness_status: FreshnessStatus;
  timezone: string;
  period_start: Date;
  period_end: Date;
  points: Array<{
    bucket_start: Date;
    average_transaction_value: string;
  }>;
}

// payload response aggregate per jam lokal 0..23.
export interface TimePatternDto {
  timezone: string;
  data_updated_at: Date;
  freshness_status: FreshnessStatus;
  period_start: Date;
  period_end: Date;
  points: Array<{
    hour_of_day: number;
    omzet: string;
    transaction_count: number;
  }>;
}

// satu baris item kinerja produk pada ranking.
export interface ProductPerformanceDto {
  product_id: string;
  name: string;
  units_sold: number;
  omzet: string;
}

// payload response ranking produk terlaris dan paling sedikit terjual.
export interface TopProductsDto {
  data_updated_at: Date;
  freshness_status: FreshnessStatus;
  timezone: string;
  period_start: Date;
  period_end: Date;
  top_selling: ProductPerformanceDto[];
  least_selling: ProductPerformanceDto[];
}

// satu baris perbandingan kinerja cabang outlet.
export interface OutletComparisonDto {
  outlet_id: string;
  outlet_name: string;
  omzet: string;
  transaction_count: number;
}

// payload response perbandingan outlet dengan metadata dashboard.
export interface OutletComparisonResultDto {
  items: OutletComparisonDto[];
  data_updated_at: Date;
  freshness_status: FreshnessStatus;
  timezone: string;
  period_start: Date;
  period_end: Date;
}

// payload response dashboard operasional tanpa metrik finansial untuk admin dan owner.
export interface OperationalDashboardDto {
  inventory_item_count: number;
  low_stock_item_count: number;
  out_of_stock_item_count: number;
  active_product_count: number;
  inactive_product_count: number;
  inactive_category_count: number;
  outlet_id?: string;
  data_updated_at: Date;
  freshness_status: 'FRESH';
  timezone: string;
}

// rincian produk dengan stok menipis beserta ambang batas aktif.
export interface LowStockItemDto {
  product_id: string;
  name: string;
  outlet_id: string;
  outlet_name: string;
  quantity: number;
  base_low_stock_threshold: number;
  low_stock_threshold_override: number | null;
  effective_low_stock_threshold: number;
}

// payload response daftar stok rendah dengan metadata kesegaran.
export interface LowStockResultDto {
  items: LowStockItemDto[];
  data_updated_at: Date;
  freshness_status: 'FRESH';
  timezone: string;
}
