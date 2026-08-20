import { Inject, Injectable } from '@nestjs/common';
import { CatalogReportingReadPort } from '@app/catalog';
import {
  ApiError,
  ReportingCachePort,
  ReportingCacheService,
} from '@app/platform';
import { TenantReportingReadPort } from '@app/tenant';
import { buildBusinessDashboardData } from './reporting-metrics';
import {
  BusinessDashboardData,
  BusinessDashboardRequest,
  BusinessDashboardSnapshot,
  DashboardMeta,
  DashboardSummary,
  FreshnessStatus,
  LowStockItem,
  OperationalDashboardSnapshot,
  ReportingBucket,
  ReportingDataset,
  ReportingDatasetRequest,
} from './reporting.models';
import { InventoryReportingReadPort } from '@app/inventory';
import { SalesReportingReadPort } from '@app/sales';
import { ReportingReadPort } from './ports/reporting-read.port';

const MAX_PERIOD_MS = 366 * 24 * 60 * 60_000;
const CACHE_SCHEMA_VERSION = 'v1';

// menyusun dashboard owner dari fakta sales melalui port dan cache-aside shared.
@Injectable()
export class DashboardQueryService extends ReportingReadPort {
  constructor(
    @Inject(ReportingCacheService)
    private readonly cache: ReportingCachePort,
    private readonly salesRead: SalesReportingReadPort,
    private readonly catalogRead: CatalogReportingReadPort,
    private readonly tenantRead: TenantReportingReadPort,
    private readonly inventoryRead: InventoryReportingReadPort,
  ) {
    super();
  }

  // mengambil ringkasan omzet, count transaksi, dan aov per fr-rep-001.
  async getSummary(
    request: BusinessDashboardRequest,
  ): Promise<DashboardSummary> {
    return (await this.getSnapshot(request)).summary;
  }

  // mengambil tren omzet dan jumlah transaksi kronologis per fr-rep-002.
  async getSalesTrend(request: BusinessDashboardRequest): Promise<{
    meta: DashboardMeta;
    bucket: ReportingBucket;
    points: BusinessDashboardSnapshot['salesTrend'];
  }> {
    const snapshot = await this.getSnapshot(request);
    return {
      meta: snapshot.summary,
      bucket: snapshot.bucket,
      points: snapshot.salesTrend,
    };
  }

  // mengambil tren aov kronologis per fr-rep-003.
  async getAovTrend(request: BusinessDashboardRequest): Promise<{
    meta: DashboardMeta;
    bucket: ReportingBucket;
    points: BusinessDashboardSnapshot['aovTrend'];
  }> {
    const snapshot = await this.getSnapshot(request);
    return {
      meta: snapshot.summary,
      bucket: snapshot.bucket,
      points: snapshot.aovTrend,
    };
  }

  // mengambil pola distribusi waktu 24 jam lokal per fr-rep-004.
  async getTimePattern(request: BusinessDashboardRequest): Promise<{
    meta: DashboardMeta;
    points: BusinessDashboardSnapshot['timePattern'];
  }> {
    const snapshot = await this.getSnapshot(request);
    return { meta: snapshot.summary, points: snapshot.timePattern };
  }

  // mengambil ranking produk terlaris dan kurang laku per fr-rep-003b.
  async getTopProducts(request: BusinessDashboardRequest): Promise<{
    meta: DashboardMeta;
    topSelling: BusinessDashboardSnapshot['topSelling'];
    leastSelling: BusinessDashboardSnapshot['leastSelling'];
  }> {
    const snapshot = await this.getSnapshot(request);
    return {
      meta: snapshot.summary,
      topSelling: snapshot.topSelling,
      leastSelling: snapshot.leastSelling,
    };
  }

  // mengambil perbandingan kinerja penjualan seluruh cabang outlet per fr-rep-005.
  async getOutletComparison(request: BusinessDashboardRequest): Promise<{
    meta: DashboardMeta;
    items: BusinessDashboardSnapshot['outletComparison'];
  }> {
    const snapshot = await this.getSnapshot(request);
    return { meta: snapshot.summary, items: snapshot.outletComparison };
  }

  // mengambil status operasional stok dan katalog tanpa metrik finansial per fr-rep-007.
  async getOperations(request: {
    merchantId: string;
    outletId?: string;
  }): Promise<OperationalDashboardSnapshot> {
    const context = await this.tenantRead.getContext(
      request.merchantId,
      request.outletId,
    );
    const [inventory, catalog] = await Promise.all([
      this.inventoryRead.getOperationalData(request),
      this.catalogRead.getCatalogReportingSummary(request.merchantId),
    ]);
    return {
      ...inventory,
      ...catalog,
      outletId: request.outletId,
      dataUpdatedAt: new Date(),
      freshnessStatus: 'FRESH',
      timezone: context.timezone,
    };
  }

  // mengambil daftar produk dengan stok menipis di bawah ambang batas per fr-rep-008.
  async getLowStock(request: {
    merchantId: string;
    outletId?: string;
  }): Promise<{
    items: LowStockItem[];
    dataUpdatedAt: Date;
    freshnessStatus: 'FRESH';
    timezone: string;
  }> {
    const context = await this.tenantRead.getContext(
      request.merchantId,
      request.outletId,
    );
    return {
      items: await this.inventoryRead.listLowStock(request),
      dataUpdatedAt: new Date(),
      freshnessStatus: 'FRESH',
      timezone: context.timezone,
    };
  }

  // menyusun dataset agregasi bisnis untuk modul insight ai melalui reporting-read port.
  async getDataset(
    request: ReportingDatasetRequest,
  ): Promise<ReportingDataset> {
    const snapshot = await this.getSnapshot({
      merchantId: request.merchantId,
      outletId: request.outletId,
      dateFrom: request.dateFrom,
      dateTo: request.dateTo,
      bucket: request.granularity ?? 'DAY',
      limit: 100,
    });
    return {
      summary: {
        totalOmzet: snapshot.summary.omzet,
        transactionCount: snapshot.summary.transactionCount,
        averageTransactionValue: snapshot.summary.averageTransactionValue,
      },
      series: snapshot.salesTrend.map((point, index) => ({
        ...point,
        averageTransactionValue:
          snapshot.aovTrend[index]?.averageTransactionValue ?? '0.00',
      })),
      byOutlet: snapshot.outletComparison,
      topProducts: snapshot.topSelling,
      leastSellingProducts: snapshot.leastSelling,
      byHour: snapshot.timePattern,
      dataVersion: `${CACHE_SCHEMA_VERSION}:${snapshot.summary.dataUpdatedAt.toISOString()}`,
      dataUpdatedAt: snapshot.summary.dataUpdatedAt,
      freshnessStatus: snapshot.summary.freshnessStatus,
      timezone: snapshot.summary.timezone,
    };
  }

  // mengambil snapshot agregasi bisnis dengan koordinasi cache-aside:
  // 1. periksa cache redis (fresh 30m)
  // 2. jika miss, acquire single-flight mutex lock dan muat fakta dari read replica
  // 3. simpan hasil komputasi ke redis dan kembalikan response fresh
  // 4. jika sumber gagal dan ada cache lama (stale 2h), fallback ke stale
  private async getSnapshot(
    request: BusinessDashboardRequest,
  ): Promise<BusinessDashboardSnapshot> {
    this.validateBusinessRequest(request);
    const context = await this.tenantRead.getContext(
      request.merchantId,
      request.outletId,
    );
    const bucket = request.bucket ?? 'DAY';
    const limit = request.limit ?? 10;
    const key = this.buildCacheKey(request, context.timezone, bucket, limit);
    const stale = await this.cache.getStale<BusinessDashboardData>(key);

    try {
      const result = await this.cache.getOrLoad(key, async () => {
        const [facts, products] = await Promise.all([
          this.salesRead.listCompletedTransactionFacts({
            merchantId: request.merchantId,
            outletId: request.outletId,
            dateFrom: request.dateFrom,
            dateTo: request.dateTo,
            timezone: context.timezone,
          }),
          this.catalogRead.getSellableProducts(request.merchantId),
        ]);
        return buildBusinessDashboardData({
          facts,
          products,
          outlets: context.outlets,
          timezone: context.timezone,
          bucket,
          limit,
        });
      });
      return this.toSnapshot(
        result.entry.data,
        request,
        context.timezone,
        new Date(result.entry.dataUpdatedAt),
        'FRESH',
      );
    } catch (error) {
      if (stale) {
        return this.toSnapshot(
          stale.data,
          request,
          context.timezone,
          new Date(stale.dataUpdatedAt),
          'STALE',
        );
      }
      if (error instanceof ApiError) throw error;
      throw ApiError.dependencyUnavailable(
        'Sumber data dashboard sedang tidak tersedia.',
      );
    }
  }

  // memetakan data agregat bisnis ke snapshot dengan metadata periode dan kesegaran data.
  private toSnapshot(
    data: BusinessDashboardData,
    request: BusinessDashboardRequest,
    timezone: string,
    dataUpdatedAt: Date,
    freshnessStatus: FreshnessStatus,
  ): BusinessDashboardSnapshot {
    return {
      summary: {
        omzet: data.omzet,
        transactionCount: data.transactionCount,
        averageTransactionValue: data.averageTransactionValue,
        dataUpdatedAt,
        freshnessStatus,
        timezone,
        periodStart: request.dateFrom,
        periodEnd: request.dateTo,
      },
      bucket: data.bucket,
      salesTrend: data.salesTrend.map((point) => ({
        ...point,
        bucketStart: new Date(point.bucketStart),
      })),
      aovTrend: data.aovTrend.map((point) => ({
        ...point,
        bucketStart: new Date(point.bucketStart),
      })),
      timePattern: data.timePattern,
      topSelling: data.topSelling,
      leastSelling: data.leastSelling,
      outletComparison: data.outletComparison,
    };
  }

  // memvalidasi rentang tanggal, limit, dan bucket sebelum query dieksekusi.
  private validateBusinessRequest(request: BusinessDashboardRequest): void {
    if (
      Number.isNaN(request.dateFrom.getTime()) ||
      Number.isNaN(request.dateTo.getTime()) ||
      request.dateFrom > request.dateTo
    ) {
      throw ApiError.validation('Rentang tanggal tidak valid.');
    }
    if (request.dateTo.getTime() - request.dateFrom.getTime() > MAX_PERIOD_MS) {
      throw ApiError.validation('Rentang tanggal maksimal 366 hari.');
    }
    if (request.bucket && !['HOUR', 'DAY'].includes(request.bucket)) {
      throw ApiError.validation('Bucket reporting tidak valid.');
    }
    if (
      request.limit !== undefined &&
      (!Number.isInteger(request.limit) ||
        request.limit < 1 ||
        request.limit > 100)
    ) {
      throw ApiError.validation('Limit harus berada antara 1 dan 100.');
    }
  }

  // membentuk cache key redis unik berdasarkan merchant, outlet, periode, bucket, dan limit.
  private buildCacheKey(
    request: BusinessDashboardRequest,
    timezone: string,
    bucket: ReportingBucket,
    limit: number,
  ): string {
    return [
      CACHE_SCHEMA_VERSION,
      request.merchantId,
      request.outletId ?? 'all-outlets',
      request.dateFrom.toISOString(),
      request.dateTo.toISOString(),
      bucket,
      String(limit),
      timezone,
    ].join(':');
  }
}
