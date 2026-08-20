import { Module } from '@nestjs/common';
import { IdentityModule } from '@app/identity';
import { PlatformModule } from '@app/platform';
import { MerchantService } from './application/merchant.service';
import { OutletService } from './application/outlet.service';
import { TenantReportingReadPort } from './application/ports/tenant-reporting-read.port';
import { TenantAuthorizationService } from './application/tenant-authorization.service';
import { TenantReportingReadService } from './application/tenant-reporting-read.service';
import { MerchantRepository } from './infrastructure/merchant.repository';
import { OutletRepository } from './infrastructure/outlet.repository';
import { TenantReportingRepository } from './infrastructure/tenant-reporting.repository';
import { MerchantController } from './web/merchant.controller';
import { OutletController } from './web/outlet.controller';

// Manajemen merchant & outlet plus isolasi tenant (06 §3.2).
// Bergantung ke `identity` (UserReadPort) dan `platform`.
@Module({
  imports: [PlatformModule, IdentityModule],
  controllers: [MerchantController, OutletController],
  providers: [
    MerchantService,
    OutletService,
    TenantAuthorizationService,
    TenantReportingReadService,
    MerchantRepository,
    OutletRepository,
    TenantReportingRepository,
    {
      provide: TenantReportingReadPort,
      useExisting: TenantReportingReadService,
    },
  ],
  exports: [
    MerchantService,
    OutletService,
    TenantAuthorizationService,
    TenantReportingReadPort,
  ],
})
export class TenantModule {}
