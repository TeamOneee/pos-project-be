import { Module } from '@nestjs/common';
import { CatalogModule } from '@app/catalog';
import { InventoryModule } from '@app/inventory';
import { PlatformModule } from '@app/platform';
import { SalesModule } from '@app/sales';
import { TenantModule } from '@app/tenant';
import { DashboardQueryService } from './application/dashboard-query.service';
import { ReportingReadPort } from './application/ports/reporting-read.port';
import { DashboardController } from './web/dashboard.controller';

// modul reporting menyediakan dashboard bisnis owner dan operasional admin via cache-aside redis.
// port sales, inventory, catalog, dan tenant terhubung secara nyata ke modul masing-masing.
@Module({
  imports: [
    PlatformModule,
    CatalogModule,
    TenantModule,
    SalesModule,
    InventoryModule,
  ],
  controllers: [DashboardController],
  providers: [
    DashboardQueryService,
    { provide: ReportingReadPort, useExisting: DashboardQueryService },
  ],
  exports: [ReportingReadPort],
})
export class ReportingModule {}
