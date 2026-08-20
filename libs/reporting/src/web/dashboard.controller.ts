import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles, SuccessMessage } from '@app/platform';
import { DashboardQueryService } from '../application/dashboard-query.service';
import {
  DashboardOutletQueryDto,
  DashboardPeriodQueryDto,
  DashboardProductQueryDto,
  DashboardTrendQueryDto,
} from './dto/dashboard-query.dto';
import {
  AovTrendDto,
  DashboardSummaryDto,
  LowStockResultDto,
  OperationalDashboardDto,
  OutletComparisonResultDto,
  SalesTrendDto,
  TimePatternDto,
  TopProductsDto,
} from './dto/dashboard-response.dto';
import {
  toAovTrendDto,
  toDashboardSummaryDto,
  toLowStockResultDto,
  toOperationalDashboardDto,
  toOutletComparisonDto,
  toSalesTrendDto,
  toTimePatternDto,
  toTopProductsDto,
} from './dashboard.presenter';

// controller rest api dashboard bisnis untuk owner dan dashboard operasional untuk owner/admin.
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardQuery: DashboardQueryService) {}

  // kartu ringkasan omzet, count transaksi, dan aov untuk owner.
  @Get('summary')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Ringkasan dashboard berhasil dimuat.')
  async summary(
    @CurrentUser() actor: AuthUser,
    @Query() query: DashboardPeriodQueryDto,
  ): Promise<DashboardSummaryDto> {
    return toDashboardSummaryDto(
      await this.dashboardQuery.getSummary(this.toRequest(actor, query)),
    );
  }

  // tren penjualan kronologis per jam atau hari untuk owner.
  @Get('sales-trend')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Tren penjualan berhasil dimuat.')
  async salesTrend(
    @CurrentUser() actor: AuthUser,
    @Query() query: DashboardTrendQueryDto,
  ): Promise<SalesTrendDto> {
    return toSalesTrendDto(
      await this.dashboardQuery.getSalesTrend({
        ...this.toRequest(actor, query),
        bucket: query.bucket,
      }),
    );
  }

  // tren aov kronologis per jam atau hari untuk owner.
  @Get('aov-trend')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Tren nilai transaksi rata-rata berhasil dimuat.')
  async aovTrend(
    @CurrentUser() actor: AuthUser,
    @Query() query: DashboardTrendQueryDto,
  ): Promise<AovTrendDto> {
    return toAovTrendDto(
      await this.dashboardQuery.getAovTrend({
        ...this.toRequest(actor, query),
        bucket: query.bucket,
      }),
    );
  }

  // pola distribusi waktu transaksi 24 jam lokal untuk owner.
  @Get('time-pattern')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Pola waktu penjualan berhasil dimuat.')
  async timePattern(
    @CurrentUser() actor: AuthUser,
    @Query() query: DashboardPeriodQueryDto,
  ): Promise<TimePatternDto> {
    return toTimePatternDto(
      await this.dashboardQuery.getTimePattern(this.toRequest(actor, query)),
    );
  }

  // ranking produk terlaris dan paling sedikit terjual untuk owner.
  @Get('top-products')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Peringkat produk berhasil dimuat.')
  async topProducts(
    @CurrentUser() actor: AuthUser,
    @Query() query: DashboardProductQueryDto,
  ): Promise<TopProductsDto> {
    return toTopProductsDto(
      await this.dashboardQuery.getTopProducts({
        ...this.toRequest(actor, query),
        limit: query.limit,
      }),
    );
  }

  // perbandingan kinerja omzet antar cabang outlet untuk owner.
  @Get('outlet-comparison')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Perbandingan outlet berhasil dimuat.')
  async outletComparison(
    @CurrentUser() actor: AuthUser,
    @Query() query: DashboardPeriodQueryDto,
  ): Promise<OutletComparisonResultDto> {
    return toOutletComparisonDto(
      await this.dashboardQuery.getOutletComparison(
        this.toRequest(actor, query),
      ),
    );
  }

  // ringkasan operasional stok dan status katalog untuk admin dan owner.
  @Get('operations')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Dashboard operasional berhasil dimuat.')
  async operations(
    @CurrentUser() actor: AuthUser,
    @Query() query: DashboardOutletQueryDto,
  ): Promise<OperationalDashboardDto> {
    return toOperationalDashboardDto(
      await this.dashboardQuery.getOperations({
        merchantId: actor.merchantId,
        outletId: query.outlet_id,
      }),
    );
  }

  // daftar item stok menipis di bawah ambang batas untuk admin dan owner.
  @Get('low-stock')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Data stok rendah berhasil dimuat.')
  async lowStock(
    @CurrentUser() actor: AuthUser,
    @Query() query: DashboardOutletQueryDto,
  ): Promise<LowStockResultDto> {
    return toLowStockResultDto(
      await this.dashboardQuery.getLowStock({
        merchantId: actor.merchantId,
        outletId: query.outlet_id,
      }),
    );
  }

  // konversi query parameter periode ke rentang waktu date utc.
  private toRequest(
    actor: AuthUser,
    query: DashboardPeriodQueryDto,
  ): {
    merchantId: string;
    dateFrom: Date;
    dateTo: Date;
    outletId?: string;
  } {
    return {
      merchantId: actor.merchantId,
      dateFrom: new Date(query.date_from),
      dateTo: new Date(query.date_to),
      outletId: query.outlet_id,
    };
  }
}
