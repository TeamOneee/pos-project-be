import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '@app/platform';
import { ReceiptService } from '../application/receipt.service';

@Controller('receipts')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'CASHIER')
  @Get(':transaction_id')
  async get(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('transaction_id') transactionId: string,
  ) {
    return this.receiptService.getReceipt(actor, transactionId);
  }
}
