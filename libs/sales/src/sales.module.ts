import { Module } from '@nestjs/common';
import { PlatformModule } from '@app/platform';
import { CatalogModule } from '@app/catalog';
import { InventoryModule } from '@app/inventory';
import { TenantModule } from '@app/tenant';
import { CheckoutService } from './application/checkout.service';
import { ReceiptService } from './application/receipt.service';
import { IdempotencyQueryService } from './application/idempotency-query.service';
import { TransactionQueryService } from './application/transaction-query.service';
import { SalesReportingReadPort } from './application/ports/sales-reporting-read.port';
import { SalesReportingReadService } from './application/sales-reporting-read.service';
import { TransactionRepository } from './infrastructure/transaction.repository';
import { SalesReportingRepository } from './infrastructure/sales-reporting.repository';
import { CheckoutController } from './web/checkout.controller';
import { TransactionController } from './web/transaction.controller';
import { ReceiptController } from './web/receipt.controller';

// Checkout atomik + idempotency (OD-012), riwayat transaksi, dan receipt (06 §3.4).
@Module({
  imports: [PlatformModule, CatalogModule, InventoryModule, TenantModule],
  controllers: [CheckoutController, TransactionController, ReceiptController],
  providers: [
    CheckoutService,
    ReceiptService,
    IdempotencyQueryService,
    TransactionQueryService,
    TransactionRepository,
    SalesReportingRepository,
    SalesReportingReadService,
    {
      provide: SalesReportingReadPort,
      useExisting: SalesReportingReadService,
    },
  ],
  exports: [
    CheckoutService,
    ReceiptService,
    TransactionQueryService,
    SalesReportingReadPort,
  ],
})
export class SalesModule {}
