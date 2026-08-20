// kalkulasi metrik analitik bisnis omzet, tren, ranking produk, dan outlet per fr-rep-001–006.
import { Money } from '@app/platform';
import { CatalogReportingProduct } from '@app/catalog';
import { ReportingOutlet } from '@app/tenant';
import { CompletedTransactionFact } from '@app/sales';
import {
  AovTrendPoint,
  BusinessDashboardData,
  OutletComparisonItem,
  ProductPerformanceItem,
  ReportingBucket,
  SalesTrendPoint,
  TimePatternPoint,
} from './reporting.models';
import {
  getBucketRange,
  getLocalBucketKey,
  getLocalHour,
} from './reporting-time';

interface Aggregate {
  omzet: Money;
  count: bigint;
  bucketStart: Date;
}

// konversi bigint ke number aman json dengan validasi max safe integer.
function safeNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('Nilai reporting melewati batas aman JSON number.');
  }
  return Number(value);
}

// menghitung aov dengan format desimal 2 digit dan proteksi division by zero.
function calculateAov(omzet: Money, count: bigint): string {
  return count === BigInt(0)
    ? '0.00'
    : omzet.dividedBy(count.toString()).toString();
}

// mengakumulasikan total omzet dan jumlah transaksi dari fakta completed.
function aggregateSales(facts: CompletedTransactionFact[]): {
  omzet: Money;
  count: bigint;
} {
  return facts.reduce(
    (result, row) => ({
      omzet: result.omzet.add(Money.of(row.total)),
      count: result.count + BigInt(1),
    }),
    { omzet: Money.zero(), count: BigInt(0) },
  );
}

// menyusun deret waktu tren penjualan dan aov kronologis:
// 1. kelompokkan transaksi berdasarkan key bucket lokal (jam/hari)
// 2. akumulasikan omzet (money desimal) dan count (bigint)
// 3. urutkan titik waktu secara kronologis menaik
function buildTrends(
  facts: CompletedTransactionFact[],
  timezone: string,
  bucket: ReportingBucket,
): { sales: SalesTrendPoint[]; aov: AovTrendPoint[] } {
  const groups = new Map<string, Aggregate>();
  for (const fact of facts) {
    const key = getLocalBucketKey(fact.occurredAt, timezone, bucket);
    const current = groups.get(key) ?? {
      omzet: Money.zero(),
      count: BigInt(0),
      bucketStart: getBucketRange(fact.occurredAt, timezone, bucket).start,
    };
    current.omzet = current.omzet.add(Money.of(fact.total));
    current.count += BigInt(1);
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

// menyusun pola distribusi penjualan 24 jam lokal merchant:
// 1. inisialisasi array 24 elemen (jam 0 s/d 23) agar response lengkap
// 2. masukkan setiap transaksi ke bucket jam lokalnya (getLocalHour)
// 3. petakan ke array time pattern point untuk deteksi jam sibuk toko
function buildTimePattern(
  facts: CompletedTransactionFact[],
  timezone: string,
): TimePatternPoint[] {
  const groups = Array.from({ length: 24 }, () => ({
    omzet: Money.zero(),
    count: BigInt(0),
  }));
  for (const fact of facts) {
    const group = groups[getLocalHour(fact.occurredAt, timezone)];
    group.omzet = group.omzet.add(Money.of(fact.total));
    group.count += BigInt(1);
  }
  return groups.map((group, hourOfDay) => ({
    hourOfDay,
    omzet: group.omzet.toString(),
    transactionCount: safeNumber(group.count),
  }));
}

// menyusun ranking produk terlaris dan kurang laku (fr-rep-003b):
// 1. akumulasikan kuantitas terjual dan omzet per product id dari item transaksi
// 2. top selling: urutkan kuantitas terbanyak -> omzet tertinggi -> nama produk
// 3. least selling: gabungkan master produk aktif katalog (termasuk nol penjualan)
// 4. potong hasil sesuai limit (default: 10 item teratas dan terbawah)
function buildProductPerformance(
  facts: CompletedTransactionFact[],
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
  for (const fact of facts) {
    for (const item of facts.length ? fact.items : []) {
      const current = groups.get(item.productId) ?? {
        name: item.productNameSnapshot,
        unitsSold: BigInt(0),
        omzet: Money.zero(),
      };
      current.name = item.productNameSnapshot;
      current.unitsSold += BigInt(item.quantity);
      current.omzet = current.omzet.add(Money.of(item.subtotal));
      groups.set(item.productId, current);
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
    .toSorted(
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
    .toSorted(
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

// menyusun perbandingan kinerja penjualan seluruh cabang outlet (fr-rep-005):
// 1. akumulasikan omzet dan jumlah transaksi per outlet dari fakta completed
// 2. iterasi seluruh outlet merchant (termasuk outlet tanpa transaksi)
// 3. kembalikan metrik lengkap per cabang untuk analisis kontribusi omzet
function buildOutletComparison(
  facts: CompletedTransactionFact[],
  outlets: ReportingOutlet[],
): OutletComparisonItem[] {
  const groups = new Map<string, { omzet: Money; count: bigint }>();
  for (const fact of facts) {
    const current = groups.get(fact.outletId) ?? {
      omzet: Money.zero(),
      count: BigInt(0),
    };
    current.omzet = current.omzet.add(Money.of(fact.total));
    current.count += BigInt(1);
    groups.set(fact.outletId, current);
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

// orkestrator kalkulasi seluruh metrik bisnis dari transaksi completed per fr-rep-001–006.
export function buildBusinessDashboardData(input: {
  facts: CompletedTransactionFact[];
  products: CatalogReportingProduct[];
  outlets: ReportingOutlet[];
  timezone: string;
  bucket: ReportingBucket;
  limit: number;
}): BusinessDashboardData {
  const aggregate = aggregateSales(input.facts);
  const trends = buildTrends(input.facts, input.timezone, input.bucket);
  const products = buildProductPerformance(
    input.facts,
    input.products,
    input.limit,
  );
  return {
    omzet: aggregate.omzet.toString(),
    transactionCount: safeNumber(aggregate.count),
    averageTransactionValue: calculateAov(aggregate.omzet, aggregate.count),
    bucket: input.bucket,
    salesTrend: trends.sales,
    aovTrend: trends.aov,
    timePattern: buildTimePattern(input.facts, input.timezone),
    topSelling: products.topSelling,
    leastSelling: products.leastSelling,
    outletComparison: buildOutletComparison(input.facts, input.outlets),
  };
}
