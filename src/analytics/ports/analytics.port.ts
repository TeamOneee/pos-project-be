export type Period =
  'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR';

export type TrendInterval = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface SalesTrendInput {
  outletId?: string;
  startDate: Date;
  endDate: Date;
  interval?: TrendInterval;
}

export interface SalesTrendPoint {
  date: string;
  totalSales: number;
  transactionCount: number;
}

export interface SalesTrendSummary {
  totalRevenue: number;
  averageDailyRevenue: number;
  totalTransactions: number;
  averageDailyTransactions: number;
}

export interface SalesTrendResult {
  trend: SalesTrendPoint[];
  summary: SalesTrendSummary;
}

export interface TimePatternPoint {
  hour: number;
  revenue: number;
  transactionCount: number;
}

export interface TimePatternResult {
  patterns: TimePatternPoint[];
  peakHours: number[];
  averageTransactionsPerHour: number;
}

export interface AovTrendPoint {
  period: string;
  aov: number;
  transactionCount: number;
}

export interface AovTrendResult {
  trend: AovTrendPoint[];
  overallAov: number;
  aovChangePercentage: number;
}

export interface ProductPerformanceItem {
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  totalSold: number;
  totalRevenue: number;
  rank: number;
}

export interface ProductPerformanceResult {
  topSellers: ProductPerformanceItem[];
  underperformers: ProductPerformanceItem[];
}

/**
 * Public contract yang disediakan Analytics Module untuk module lain
 * (contoh: AI Insight Worker).
 */
export interface AnalyticsPort {
  salesTrend(input: SalesTrendInput): Promise<SalesTrendResult>;

  timePattern(outletId?: string, period?: Period): Promise<TimePatternResult>;

  aovTrend(outletId?: string, period?: Period): Promise<AovTrendResult>;

  productPerformance(
    outletId?: string,
    period?: Period,
    sortBy?: 'REVENUE' | 'QUANTITY',
    limit?: number,
  ): Promise<ProductPerformanceResult>;
}
