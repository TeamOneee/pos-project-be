import { Module } from '@nestjs/common';
import { MerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';
import { MerchantsRepository } from './merchants.repository';
import { MERCHANT_PORT } from './ports/merchant.port';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [MerchantsController],
  providers: [
    MerchantsService,
    MerchantsRepository,
    { provide: MERCHANT_PORT, useExisting: MerchantsService },
  ],
  imports: [PrismaModule],
  exports: [MERCHANT_PORT],
})
export class MerchantsModule {}
