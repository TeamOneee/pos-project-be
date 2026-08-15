import { Money } from '@app/platform';
import { CatalogReportingProduct } from '@app/catalog';
import { ReportingOutlet } from '@app/tenant';
import {
  AovTrendPoint,
  BusinessDashboardSnapshot,
  DashboardSummary,
  ProductPerformanceItem,
  ProjectionRecord,
  ReportingBucket,
  SalesTrendPoint,
  TimePatternPoint,
} from './reporting.models';
import {
  getBucketRange,
  getLocalBucketKey,
  getLocalHour,
} from './reporting-time';

const FRESHNESS_THRESHOLD_MS = 5 * 60 * 1000;

interface Aggregate {
  omzet: Money;
  count: bigint;
  bucketStart: Date;
}

function safeNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('Nilai reporting melewati batas aman JSON number.');
  }
  return Number(value);
}

function calculateAov(omzet: Money, count: bigint): string {
  return count === BigInt(0)
    ? '0.00'
    : omzet.dividedBy(count.toString()).toString();
}

function aggregateSales(rows: ProjectionRecord[]): {
  omzet: Money;
  count: bigint;
} {
  return rows.reduce(
    (result, row) => ({
      omzet: result.omzet.add(Money.of(row.omzet)),
      count: result.count + row.transactionCount,
    }),
    { omzet: Money.zero(), count: BigInt(0) },
  );
}

function buildTrends(
  rows: ProjectionRecord[],
  timezone: string,
  bucket: ReportingBucket,
): { sales: SalesTrendPoint[]; aov: AovTrendPoint[] } {
  const groups = new Map<string, Aggregate>();
  for (const row of rows) {
    const key = getLocalBucketKey(row.periodStart, timezone, bucket);
    const current = groups.get(key) ?? {
      omzet: Money.zero(),
      count: BigInt(0),
      bucketStart: getBucketRange(row.periodStart, timezone, bucket).start,
    };
    current.omzet = current.omzet.add(Money.of(row.omzet));
    current.count += row.transactionCount;
    groups.set(key, current);
  }
  const ordered = [...groups.values()].sort(
    (left, right) => left.bucketStart.getTime() - right.bucketStart.getTime(),
  );
  return {
    sales: ordered.map((item) => ({
      bucketStart: item.bucketStart,
      omzet: item.omzet.toString(),
      transactionCount: safeNumber(item.count),
    })),
    aov: ordered.map((item) => ({
      bucketStart: item.bucketStart,
      averageTransactionValue: calculateAov(item.omzet, item.count),
    })),
  };
}

function buildTimePattern(
  rows: ProjectionRecord[],
  timezone: string,
): TimePatternPoint[] {
  const groups = Array.from({ length: 24 }, () => ({
    omzet: Money.zero(),
    count: BigInt(0),
  }));
  for (const row of rows) {
    const group = groups[getLocalHour(row.periodStart, timezone)];
    group.omzet = group.omzet.add(Money.of(row.omzet));
    group.count += row.transactionCount;
  }
  return groups.map((group, hourOfDay) => ({
    hourOfDay,
    omzet: group.omzet.toString(),
    transactionCount: safeNumber(group.count),
  }));
}

function buildProductPerformance(
  rows: ProjectionRecord[],
  products: CatalogReportingProduct[],
  limit: number,
): {
  topSelling: ProductPerformanceItem[];
  leastSelling: ProductPerformanceItem[];
} {
  const groups = new Map<
    string,
    { name: string; unitsSold: bigint; omzet: Money }
  >();
  for (const row of rows) {
    for (const product of row.products) {
      const current = groups.get(product.productId) ?? {
        name: product.productNameSnapshot,
        unitsSold: BigInt(0),
        omzet: Money.zero(),
      };
      current.name = product.productNameSnapshot;
      current.unitsSold += product.unitsSold;
      current.omzet = current.omzet.add(Money.of(product.omzet));
      groups.set(product.productId, current);
    }
  }
  const toItem = (
    productId: string,
    value: { name: string; unitsSold: bigint; omzet: Money },
  ): ProductPerformanceItem => ({
    productId,
    name: value.name,
    unitsSold: safeNumber(value.unitsSold),
    omzet: value.omzet.toString(),
  });
  const soldItems = [...groups.entries()].map(([productId, value]) =>
    toItem(productId, value),
  );
  const topSelling = soldItems
    .sort(
      (left, right) =>
        right.unitsSold - left.unitsSold ||
        Money.of(right.omzet)
          .toDecimal()
          .comparedTo(Money.of(left.omzet).toDecimal()) ||
        left.name.localeCompare(right.name),
    )
    .slice(0, limit);
  const leastSelling = products
    .map((product) => {
      const metric = groups.get(product.id) ?? {
        name: product.name,
        unitsSold: BigInt(0),
        omzet: Money.zero(),
      };
      return toItem(product.id, { ...metric, name: product.name });
    })
    .sort(
      (left, right) =>
        left.unitsSold - right.unitsSold ||
        Money.of(left.omzet)
          .toDecimal()
          .comparedTo(Money.of(right.omzet).toDecimal()) ||
        left.name.localeCompare(right.name),
    )
    .slice(0, limit);
  return { topSelling, leastSelling };
}

function buildOutletComparison(
  rows: ProjectionRecord[],
  outlets: ReportingOutlet[],
): BusinessDashboardSnapshot['outletComparison'] {
  const groups = new Map<string, { omzet: Money; count: bigint }>();
  for (const row of rows) {
    const current = groups.get(row.outletId) ?? {
      omzet: Money.zero(),
      count: BigInt(0),
    };
    current.omzet = current.omzet.add(Money.of(row.omzet));
    current.count += row.transactionCount;
    groups.set(row.outletId, current);
  }
  return outlets.map((outlet) => {
    const value = groups.get(outlet.id) ?? {
      omzet: Money.zero(),
      count: BigInt(0),
    };
    return {
      outletId: outlet.id,
      outletName: outlet.name,
      omzet: value.omzet.toString(),
      transactionCount: safeNumber(value.count),
    };
  });
}

// menghitung seluruh metrik mvp dari projection hour sesuai fr-rep-001–006.
export function buildBusinessSnapshot(input: {
  rows: ProjectionRecord[];
  products: CatalogReportingProduct[];
  outlets: ReportingOutlet[];
  timezone: string;
  dateFrom: Date;
  dateTo: Date;
  bucket: ReportingBucket;
  limit: number;
  now?: Date;
}): BusinessDashboardSnapshot {
  const aggregate = aggregateSales(input.rows);
  const dataUpdatedAt = input.rows.reduce<Date | null>(
    (latest, row) =>
      !latest || row.sourceWatermark > latest ? row.sourceWatermark : latest,
    null,
  );
  const now = input.now ?? new Date();
  const summary: DashboardSummary = {
    omzet: aggregate.omzet.toString(),
    transactionCount: safeNumber(aggregate.count),
    averageTransactionValue: calculateAov(aggregate.omzet, aggregate.count),
    dataUpdatedAt,
    freshnessStatus:
      dataUpdatedAt &&
      now.getTime() - dataUpdatedAt.getTime() > FRESHNESS_THRESHOLD_MS
        ? 'STALE'
        : 'FRESH',
    periodStart: input.dateFrom,
    periodEnd: input.dateTo,
    timezone: input.timezone,
  };
  const trends = buildTrends(input.rows, input.timezone, input.bucket);
  const products = buildProductPerformance(
    input.rows,
    input.products,
    input.limit,
  );
  return {
    summary,
    bucket: input.bucket,
    salesTrend: trends.sales,
    aovTrend: trends.aov,
    timePattern: buildTimePattern(input.rows, input.timezone),
    topSelling: products.topSelling,
    leastSelling: products.leastSelling,
    outletComparison: buildOutletComparison(input.rows, input.outlets),
  };
}
