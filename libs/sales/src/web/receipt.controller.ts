import { Controller, Get, Param } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '@app/platform';
import { ReceiptService } from '../application/receipt.service';

@Controller('receipts')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Get(':transaction_id')
  @Roles('OWNER', 'CASHIER')
  async get(
    @CurrentUser() actor: AuthUser,
    @Param('transaction_id') transactionId: string,
  ) {
    return this.receiptService.getReceipt(actor, transactionId);
  }
}
