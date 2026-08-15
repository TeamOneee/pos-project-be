import { Module } from '@nestjs/common';
import { PlatformModule } from '@app/platform';
import { CatalogModule } from '@app/catalog';
import { TenantModule } from '@app/tenant';
import { StockReservationPort } from './application/stock-reservation.port';
import { StockReservationService } from './application/stock-reservation.service';
import { InventoryQueryService } from './application/inventory-query.service';
import { StockAdjustmentService } from './application/stock-adjustment.service';
import { LowStockThresholdService } from './application/low-stock-threshold.service';
import { StockMovementQueryService } from './application/stock-movement-query.service';
import { OutletCatalogQueryService } from './application/outlet-catalog-query.service';
import { InventoryController } from './web/inventory.controller';
import { CatalogController } from './web/catalog.controller';

@Module({
  imports: [PlatformModule, CatalogModule, TenantModule],
  controllers: [InventoryController, CatalogController],
  providers: [
    InventoryQueryService,
    StockAdjustmentService,
    LowStockThresholdService,
    StockMovementQueryService,
    OutletCatalogQueryService,
    { provide: StockReservationPort, useClass: StockReservationService },
  ],
  exports: [StockReservationPort],
})
export class InventoryModule {}
