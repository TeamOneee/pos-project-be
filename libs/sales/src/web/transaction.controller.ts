import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '@app/platform';
import { TransactionQueryService } from '../application/transaction-query.service';
import {
  ReceiptSearchQueryDto,
  TransactionQueryDto,
} from './dto/transaction-query.dto';

@Controller('transactions')
export class TransactionController {
  constructor(
    private readonly transactionQueryService: TransactionQueryService,
  ) {}

  @Get()
  @Roles('OWNER', 'CASHIER')
  async list(
    @CurrentUser() actor: AuthUser,
    @Query() query: TransactionQueryDto,
  ) {
    return this.transactionQueryService.list(actor, query);
  }

  // Dideklarasikan sebelum ':id' agar route literal menang (Express match by order).
  @Get('search')
  @Roles('OWNER', 'CASHIER')
  async search(
    @CurrentUser() actor: AuthUser,
    @Query() query: ReceiptSearchQueryDto,
  ) {
    return this.transactionQueryService.searchByTransactionNumber(
      actor,
      query.transaction_number,
    );
  }

  @Get(':id')
  @Roles('OWNER', 'CASHIER')
  async detail(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.transactionQueryService.detail(actor, id);
  }
}
