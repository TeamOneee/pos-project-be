import {
  FreshnessStatus,
  ReportingBucket,
} from '../../application/reporting.models';

// mendefinisikan response summary dengan field snake_case sesuai api contract 07.
export interface DashboardSummaryDto {
  omzet: string;
  transaction_count: number;
  average_transaction_value: string;
  data_updated_at: Date | null;
  freshness_status: FreshnessStatus;
  period_start: Date;
  period_end: Date;
  timezone: string;
}

// mendefinisikan response titik tren penjualan.
export interface SalesTrendDto {
  bucket: ReportingBucket;
  data_updated_at: Date | null;
  points: Array<{
    bucket_start: Date;
    omzet: string;
    transaction_count: number;
  }>;
}

// mendefinisikan response titik tren aov.
export interface AovTrendDto {
  bucket: ReportingBucket;
  data_updated_at: Date | null;
  points: Array<{
    bucket_start: Date;
    average_transaction_value: string;
  }>;
}

// mendefinisikan response aggregate per jam lokal Merchant.
export interface TimePatternDto {
  timezone: string;
  data_updated_at: Date | null;
  points: Array<{
    hour_of_day: number;
    omzet: string;
    transaction_count: number;
  }>;
}

// mendefinisikan satu product pada ranking terlaris atau paling sedikit terjual.
export interface ProductPerformanceDto {
  product_id: string;
  name: string;
  units_sold: number;
  omzet: string;
}

// mendefinisikan response ranking product untuk satu periode.
export interface TopProductsDto {
  data_updated_at: Date | null;
  top_selling: ProductPerformanceDto[];
  least_selling: ProductPerformanceDto[];
}

// mendefinisikan satu baris perbandingan Outlet.
export interface OutletComparisonDto {
  outlet_id: string;
  outlet_name: string;
  omzet: string;
  transaction_count: number;
}
