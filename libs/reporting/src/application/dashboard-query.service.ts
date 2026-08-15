import { Injectable } from '@nestjs/common';
import {
  CatalogReportingProduct,
  CatalogReportingReadPort,
} from '@app/catalog';
import { ApiError } from '@app/platform';
import { TenantReportingReadPort } from '@app/tenant';
import { ReportingProjectionReadRepository } from '../infrastructure/reporting-projection-read.repository';
import { ReportingReadPort } from './ports/reporting-read.port';
import { buildBusinessSnapshot } from './reporting-metrics';
import {
  AovTrendPoint,
  BusinessDashboardRequest,
  BusinessDashboardSnapshot,
  DashboardSummary,
  OutletComparisonItem,
  ProductPerformanceItem,
  ReportingBucket,
  SalesTrendPoint,
  TimePatternPoint,
} from './reporting.models';

interface LoadOptions {
  includeCatalog: boolean;
}

@Injectable()
// menyusun dashboard owner dari projection dan current state melalui public port.
export class DashboardQueryService extends ReportingReadPort {
  constructor(
    private readonly repository: ReportingProjectionReadRepository,
    private readonly catalogRead: CatalogReportingReadPort,
    private readonly tenantRead: TenantReportingReadPort,
  ) {
    super();
  }

  async getBusinessSnapshot(
    request: BusinessDashboardRequest,
  ): Promise<BusinessDashboardSnapshot> {
    // snapshot lengkap menjadi input terstruktur untuk modul insight.
    return this.loadSnapshot(request, { includeCatalog: true });
  }

  async getSummary(
    request: BusinessDashboardRequest,
  ): Promise<DashboardSummary> {
    // membaca hanya projection sales agar endpoint summary tidak memuat ranking product.
    return (await this.loadSnapshot(request, { includeCatalog: false }))
      .summary;
  }

  async getSalesTrend(request: BusinessDashboardRequest): Promise<{
    bucket: ReportingBucket;
    dataUpdatedAt: Date | null;
    points: SalesTrendPoint[];
  }> {
    // memakai snapshot tanpa product karena sales trend hanya membutuhkan projection sales.
    const snapshot = await this.loadSnapshot(request, {
      includeCatalog: false,
    });
    return {
      bucket: snapshot.bucket,
      dataUpdatedAt: snapshot.summary.dataUpdatedAt,
      points: snapshot.salesTrend,
    };
  }

  async getAovTrend(request: BusinessDashboardRequest): Promise<{
    bucket: ReportingBucket;
    dataUpdatedAt: Date | null;
    points: AovTrendPoint[];
  }> {
    // memakai aggregate yang sama dengan sales trend agar bucket aov konsisten.
    const snapshot = await this.loadSnapshot(request, {
      includeCatalog: false,
    });
    return {
      bucket: snapshot.bucket,
      dataUpdatedAt: snapshot.summary.dataUpdatedAt,
      points: snapshot.aovTrend,
    };
  }

  async getTimePattern(request: BusinessDashboardRequest): Promise<{
    timezone: string;
    dataUpdatedAt: Date | null;
    points: TimePatternPoint[];
  }> {
    // mengelompokkan projection hour menjadi 24 jam lokal Merchant.
    const snapshot = await this.loadSnapshot(request, {
      includeCatalog: false,
    });
    return {
      timezone: snapshot.summary.timezone,
      dataUpdatedAt: snapshot.summary.dataUpdatedAt,
      points: snapshot.timePattern,
    };
  }

  async getTopProducts(request: BusinessDashboardRequest): Promise<{
    dataUpdatedAt: Date | null;
    topSelling: ProductPerformanceItem[];
    leastSelling: ProductPerformanceItem[];
  }> {
    // memuat catalog agar Product aktif nol penjualan dapat ikut pada least-selling.
    const snapshot = await this.loadSnapshot(request, {
      includeCatalog: true,
    });
    return {
      dataUpdatedAt: snapshot.summary.dataUpdatedAt,
      topSelling: snapshot.topSelling,
      leastSelling: snapshot.leastSelling,
    };
  }

  async getOutletComparison(
    request: BusinessDashboardRequest,
  ): Promise<OutletComparisonItem[]> {
    // memakai context Tenant agar Outlet tanpa transaksi tetap tampil dengan angka nol.
    return (await this.loadSnapshot(request, { includeCatalog: false }))
      .outletComparison;
  }

  private async loadSnapshot(
    request: BusinessDashboardRequest,
    options: LoadOptions,
  ): Promise<BusinessDashboardSnapshot> {
    // memvalidasi scope sebelum query replica agar tenant lain tidak pernah terbaca.
    this.validateRequest(request);
    const context = await this.tenantRead.getContext(
      request.merchantId,
      request.outletId,
    );
    const projectionRequest = {
      merchantId: request.merchantId,
      dateFrom: request.dateFrom,
      dateTo: request.dateTo,
      outletId: request.outletId,
    };
    // hanya endpoint product dan Insight yang membutuhkan current state Catalog.
    const [rows, products] = await Promise.all([
      this.repository.findSales(projectionRequest),
      options.includeCatalog
        ? this.catalogRead.getSellableProducts(request.merchantId)
        : Promise.resolve<CatalogReportingProduct[]>([]),
    ]);
    return buildBusinessSnapshot({
      rows,
      products,
      outlets: context.outlets,
      timezone: context.timezone,
      dateFrom: request.dateFrom,
      dateTo: request.dateTo,
      bucket: request.bucket ?? 'DAY',
      limit: request.limit ?? 10,
    });
  }

  private validateRequest(request: BusinessDashboardRequest): void {
    // menolak periode terbalik dan parameter di luar kontrak api reporting.
    if (
      Number.isNaN(request.dateFrom.getTime()) ||
      Number.isNaN(request.dateTo.getTime()) ||
      request.dateFrom > request.dateTo
    ) {
      throw ApiError.validation('Rentang tanggal tidak valid.');
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
}
