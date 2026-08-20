import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { PlatformModule } from '@app/platform';
import { IdentityModule } from '@app/identity';
import { TenantModule } from '@app/tenant';
import { CatalogModule } from '@app/catalog';
import { InventoryModule } from '@app/inventory';
import { SalesModule } from '@app/sales';
import { ReportingModule } from '@app/reporting';
import { InsightModule } from '@app/insight';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot(),
    PlatformModule,
    IdentityModule,
    TenantModule,
    CatalogModule,
    InventoryModule,
    SalesModule,
    ReportingModule,
    InsightModule,
  ],
})
export class AppModule {}
