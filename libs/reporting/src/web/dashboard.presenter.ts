// mapper hasil application service ke response json snake_case sesuai api contract 07.
import {
  AovTrendPoint,
  DashboardSummary,
  DashboardMeta,
  LowStockItem,
  OperationalDashboardSnapshot,
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
  OutletComparisonResultDto,
  OperationalDashboardDto,
  LowStockItemDto,
  LowStockResultDto,
  ProductPerformanceDto,
  SalesTrendDto,
  TimePatternDto,
  TopProductsDto,
} from './dto/dashboard-response.dto';

// memetakan summary bisnis ke dto response api snake_case.
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

// memetakan tren penjualan ke dto response api dengan metadata waktu.
export function toSalesTrendDto(result: {
  bucket: ReportingBucket;
  meta: DashboardMeta;
  points: SalesTrendPoint[];
}): SalesTrendDto {
  return {
    bucket: result.bucket,
    ...toBusinessMetaDto(result.meta),
    points: result.points.map((point) => ({
      bucket_start: point.bucketStart,
      omzet: point.omzet,
      transaction_count: point.transactionCount,
    })),
  };
}

// memetakan tren aov ke dto response api tanpa recalculate di web layer.
export function toAovTrendDto(result: {
  bucket: ReportingBucket;
  meta: DashboardMeta;
  points: AovTrendPoint[];
}): AovTrendDto {
  return {
    bucket: result.bucket,
    ...toBusinessMetaDto(result.meta),
    points: result.points.map((point) => ({
      bucket_start: point.bucketStart,
      average_transaction_value: point.averageTransactionValue,
    })),
  };
}

// memetakan 24 titik jam lokal ke dto response time pattern.
export function toTimePatternDto(result: {
  meta: DashboardMeta;
  points: TimePatternPoint[];
}): TimePatternDto {
  return {
    ...toBusinessMetaDto(result.meta),
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

// memetakan daftar ranking produk terlaris dan paling sedikit terjual.
export function toTopProductsDto(result: {
  meta: DashboardMeta;
  topSelling: ProductPerformanceItem[];
  leastSelling: ProductPerformanceItem[];
}): TopProductsDto {
  return {
    ...toBusinessMetaDto(result.meta),
    top_selling: result.topSelling.map(toProductPerformanceDto),
    least_selling: result.leastSelling.map(toProductPerformanceDto),
  };
}

function toOutletComparisonItemDto(
  result: OutletComparisonItem,
): OutletComparisonDto {
  return {
    outlet_id: result.outletId,
    outlet_name: result.outletName,
    omzet: result.omzet,
    transaction_count: result.transactionCount,
  };
}

// memetakan perbandingan kinerja omzet antar cabang outlet ke dto response.
export function toOutletComparisonDto(result: {
  meta: DashboardMeta;
  items: OutletComparisonItem[];
}): OutletComparisonResultDto {
  return {
    ...toBusinessMetaDto(result.meta),
    items: result.items.map(toOutletComparisonItemDto),
  };
}

// memetakan status stok dan katalog ke dto dashboard operasional admin.
export function toOperationalDashboardDto(
  result: OperationalDashboardSnapshot,
): OperationalDashboardDto {
  return {
    inventory_item_count: result.inventoryItemCount,
    low_stock_item_count: result.lowStockItemCount,
    out_of_stock_item_count: result.outOfStockItemCount,
    active_product_count: result.activeProductCount,
    inactive_product_count: result.inactiveProductCount,
    inactive_category_count: result.inactiveCategoryCount,
    outlet_id: result.outletId,
    data_updated_at: result.dataUpdatedAt,
    freshness_status: result.freshnessStatus,
    timezone: result.timezone,
  };
}

function toLowStockItemDto(result: LowStockItem): LowStockItemDto {
  return {
    product_id: result.productId,
    name: result.name,
    outlet_id: result.outletId,
    outlet_name: result.outletName,
    quantity: result.quantity,
    base_low_stock_threshold: result.baseLowStockThreshold,
    low_stock_threshold_override: result.lowStockThresholdOverride,
    effective_low_stock_threshold: result.effectiveLowStockThreshold,
  };
}

// memetakan daftar item stok rendah ke dto response api.
export function toLowStockResultDto(result: {
  items: LowStockItem[];
  dataUpdatedAt: Date;
  freshnessStatus: 'FRESH';
  timezone: string;
}): LowStockResultDto {
  return {
    items: result.items.map(toLowStockItemDto),
    data_updated_at: result.dataUpdatedAt,
    freshness_status: result.freshnessStatus,
    timezone: result.timezone,
  };
}

// helper memetakan metadata bisnis standar (data_updated_at, freshness_status, timezone, periode).
function toBusinessMetaDto(meta: DashboardMeta): {
  data_updated_at: Date;
  freshness_status: DashboardMeta['freshnessStatus'];
  timezone: string;
  period_start: Date;
  period_end: Date;
} {
  return {
    data_updated_at: meta.dataUpdatedAt,
    freshness_status: meta.freshnessStatus,
    timezone: meta.timezone,
    period_start: meta.periodStart,
    period_end: meta.periodEnd,
  };
}
