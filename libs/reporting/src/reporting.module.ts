import { Module } from '@nestjs/common';
import { CatalogModule } from '@app/catalog';
import { PlatformModule } from '@app/platform';
import { TenantModule } from '@app/tenant';
import { DashboardQueryService } from './application/dashboard-query.service';
import { ReportingReadPort } from './application/ports/reporting-read.port';
import { ReportingProjectionReadRepository } from './infrastructure/reporting-projection-read.repository';
import { DashboardController } from './web/dashboard.controller';

/*
 * menyediakan query dashboard Owner dan public read port untuk Insight.
 * Catalog/Tenant hanya diakses melalui public port yang membaca read replica.
 *
 * todo(inventory): setelah InventoryReportingReadPort tersedia, tambahkan
 * dashboard operations untuk Admin dan low-stock read-only untuk Owner/Admin.
 * reporting tidak boleh mengakses repository atau tabel Inventory langsung.
 */
@Module({
  imports: [PlatformModule, CatalogModule, TenantModule],
  controllers: [DashboardController],
  providers: [
    DashboardQueryService,
    ReportingProjectionReadRepository,
    { provide: ReportingReadPort, useExisting: DashboardQueryService },
  ],
  exports: [ReportingReadPort],
})
export class ReportingModule {}
