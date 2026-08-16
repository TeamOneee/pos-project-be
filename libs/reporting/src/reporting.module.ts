import { Module } from '@nestjs/common';
import { CatalogModule } from '@app/catalog';
import { PlatformModule } from '@app/platform';
import { TenantModule } from '@app/tenant';
import { DashboardQueryService } from './application/dashboard-query.service';
import { InventoryReportingReadPort } from './application/ports/inventory-reporting-read.port';
import { ReportingReadPort } from './application/ports/reporting-read.port';
import { SalesReportingReadPort } from './application/ports/sales-reporting-read.port';
import { MockInventoryReportingReadAdapter } from './infrastructure/mock-inventory-reporting-read.adapter';
import { MockSalesReportingReadAdapter } from './infrastructure/mock-sales-reporting-read.adapter';
import { DashboardController } from './web/dashboard.controller';

// modul reporting menyediakan dashboard bisnis owner dan operasional admin via cache-aside redis.
// port sales dan inventory menggunakan mock sementara hingga modul selesai.
@Module({
  imports: [PlatformModule, CatalogModule, TenantModule],
  controllers: [DashboardController],
  providers: [
    DashboardQueryService,
    MockSalesReportingReadAdapter,
    MockInventoryReportingReadAdapter,
    {
      provide: SalesReportingReadPort,
      useExisting: MockSalesReportingReadAdapter,
    },
    {
      provide: InventoryReportingReadPort,
      useExisting: MockInventoryReportingReadAdapter,
    },
    { provide: ReportingReadPort, useExisting: DashboardQueryService },
  ],
  exports: [ReportingReadPort],
})
export class ReportingModule {}
