import {
  AovTrendPoint,
  DashboardSummary,
  OutletComparisonItem,
  ProductPerformanceItem,
  ReportingBucket,
  SalesTrendPoint,
  TimePatternPoint,
} from '../application/reporting.models';
import {
  AovTrendDto,
  DashboardSummaryDto,
  OutletComparisonDto,
  ProductPerformanceDto,
  SalesTrendDto,
  TimePatternDto,
  TopProductsDto,
} from './dto/dashboard-response.dto';

// mengubah result application menjadi summary api berformat snake_case.
export function toDashboardSummaryDto(
  result: DashboardSummary,
): DashboardSummaryDto {
  return {
    omzet: result.omzet,
    transaction_count: result.transactionCount,
    average_transaction_value: result.averageTransactionValue,
    data_updated_at: result.dataUpdatedAt,
    freshness_status: result.freshnessStatus,
    period_start: result.periodStart,
    period_end: result.periodEnd,
    timezone: result.timezone,
  };
}

// mengubah sales trend menjadi response kronologis sesuai fr-rep-003a.
export function toSalesTrendDto(result: {
  bucket: ReportingBucket;
  dataUpdatedAt: Date | null;
  points: SalesTrendPoint[];
}): SalesTrendDto {
  return {
    bucket: result.bucket,
    data_updated_at: result.dataUpdatedAt,
    points: result.points.map((point) => ({
      bucket_start: point.bucketStart,
      omzet: point.omzet,
      transaction_count: point.transactionCount,
    })),
  };
}

// mengubah aov trend tanpa mengulang formula di web layer.
export function toAovTrendDto(result: {
  bucket: ReportingBucket;
  dataUpdatedAt: Date | null;
  points: AovTrendPoint[];
}): AovTrendDto {
  return {
    bucket: result.bucket,
    data_updated_at: result.dataUpdatedAt,
    points: result.points.map((point) => ({
      bucket_start: point.bucketStart,
      average_transaction_value: point.averageTransactionValue,
    })),
  };
}

// mengubah 24 bucket jam lokal menjadi response time pattern.
export function toTimePatternDto(result: {
  timezone: string;
  dataUpdatedAt: Date | null;
  points: TimePatternPoint[];
}): TimePatternDto {
  return {
    timezone: result.timezone,
    data_updated_at: result.dataUpdatedAt,
    points: result.points.map((point) => ({
      hour_of_day: point.hourOfDay,
      omzet: point.omzet,
      transaction_count: point.transactionCount,
    })),
  };
}

function toProductPerformanceDto(
  result: ProductPerformanceItem,
): ProductPerformanceDto {
  return {
    product_id: result.productId,
    name: result.name,
    units_sold: result.unitsSold,
    omzet: result.omzet,
  };
}

// mengubah ranking product termasuk product aktif dengan nol penjualan.
export function toTopProductsDto(result: {
  dataUpdatedAt: Date | null;
  topSelling: ProductPerformanceItem[];
  leastSelling: ProductPerformanceItem[];
}): TopProductsDto {
  return {
    data_updated_at: result.dataUpdatedAt,
    top_selling: result.topSelling.map(toProductPerformanceDto),
    least_selling: result.leastSelling.map(toProductPerformanceDto),
  };
}

// mengubah perbandingan outlet menjadi response api yang stabil.
export function toOutletComparisonDto(
  result: OutletComparisonItem,
): OutletComparisonDto {
  return {
    outlet_id: result.outletId,
    outlet_name: result.outletName,
    omzet: result.omzet,
    transaction_count: result.transactionCount,
  };
}
