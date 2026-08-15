import { Module } from '@nestjs/common';
import { PlatformModule } from '@app/platform';
import { CatalogModule } from '@app/catalog';
import { InventoryModule } from '@app/inventory';
import { TenantModule } from '@app/tenant';
import { CheckoutService } from './application/checkout.service';
import { ReceiptService } from './application/receipt.service';
import { IdempotencyQueryService } from './application/idempotency-query.service';
import { TransactionQueryService } from './application/transaction-query.service';
import { TransactionRepository } from './infrastructure/transaction.repository';
import { CheckoutController } from './web/checkout.controller';
import { TransactionController } from './web/transaction.controller';
import { ReceiptController } from './web/receipt.controller';

@Module({
  imports: [PlatformModule, CatalogModule, InventoryModule, TenantModule],
  controllers: [CheckoutController, TransactionController, ReceiptController],
  providers: [
    CheckoutService,
    ReceiptService,
    IdempotencyQueryService,
    TransactionQueryService,
    TransactionRepository,
  ],
  exports: [CheckoutService, ReceiptService, TransactionQueryService],
})
export class SalesModule {}
