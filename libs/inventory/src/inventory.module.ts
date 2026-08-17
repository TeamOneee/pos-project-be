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
import { InventoryRepository } from './infrastructure/inventory.repository';
import { StockMovementRepository } from './infrastructure/stock-movement.repository';
import { InventoryController } from './web/inventory.controller';
import { CatalogController } from './web/catalog.controller';

// manajemen stok per outlet, threshold, stock movement, reservasi stok saat
// checkout, dan katalog aktif per outlet (06 §3.4).
@Module({
  imports: [PlatformModule, CatalogModule, TenantModule],
  controllers: [InventoryController, CatalogController],
  providers: [
    InventoryRepository,
    StockMovementRepository,
    InventoryQueryService,
    StockAdjustmentService,
    LowStockThresholdService,
    StockMovementQueryService,
    OutletCatalogQueryService,
    StockReservationService,
    { provide: StockReservationPort, useExisting: StockReservationService },
  ],
  exports: [StockReservationPort],
})
export class InventoryModule {}
