import { Module } from '@nestjs/common';
import { PlatformModule } from '@app/platform';
import { MerchantService } from './application/merchant.service';
import { OutletService } from './application/outlet.service';
import { TenantAuthorizationService } from './application/tenant-authorization.service';
import { MerchantRepository } from './infrastructure/merchant.repository';
import { OutletRepository } from './infrastructure/outlet.repository';
import { MerchantController } from './web/merchant.controller';
import { OutletController } from './web/outlet.controller';

// Manajemen merchant & outlet plus isolasi tenant (06 §3.2). Hanya bergantung pada `platform`.
@Module({
  imports: [PlatformModule],
  controllers: [MerchantController, OutletController],
  providers: [
    MerchantService,
    OutletService,
    TenantAuthorizationService,
    MerchantRepository,
    OutletRepository,
  ],
  exports: [MerchantService, OutletService, TenantAuthorizationService],
})
export class TenantModule {}
