import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '@app/platform';
import { DashboardQueryService } from '../application/dashboard-query.service';
import {
  DashboardPeriodQueryDto,
  DashboardProductQueryDto,
  DashboardTrendQueryDto,
} from './dto/dashboard-query.dto';
import {
  AovTrendDto,
  DashboardSummaryDto,
  OutletComparisonDto,
  SalesTrendDto,
  TimePatternDto,
  TopProductsDto,
} from './dto/dashboard-response.dto';
import {
  toAovTrendDto,
  toDashboardSummaryDto,
  toOutletComparisonDto,
  toSalesTrendDto,
  toTimePatternDto,
  toTopProductsDto,
} from './dashboard.presenter';

@Controller('dashboard')
// menyediakan analytics bisnis owner tanpa membuka projection kepada admin.
export class DashboardController {
  constructor(private readonly dashboardQuery: DashboardQueryService) {}

  @Get('summary')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  async summary(
    @CurrentUser() actor: AuthUser,
    @Query() query: DashboardPeriodQueryDto,
  ): Promise<DashboardSummaryDto> {
    return toDashboardSummaryDto(
      await this.dashboardQuery.getSummary(this.toRequest(actor, query)),
    );
  }

  @Get('sales-trend')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
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

  @Get('aov-trend')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
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

  @Get('time-pattern')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  async timePattern(
    @CurrentUser() actor: AuthUser,
    @Query() query: DashboardPeriodQueryDto,
  ): Promise<TimePatternDto> {
    return toTimePatternDto(
      await this.dashboardQuery.getTimePattern(this.toRequest(actor, query)),
    );
  }

  @Get('top-products')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
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

  @Get('outlet-comparison')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  async outletComparison(
    @CurrentUser() actor: AuthUser,
    @Query() query: DashboardPeriodQueryDto,
  ): Promise<OutletComparisonDto[]> {
    const result = await this.dashboardQuery.getOutletComparison(
      this.toRequest(actor, query),
    );
    return result.map(toOutletComparisonDto);
  }

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
