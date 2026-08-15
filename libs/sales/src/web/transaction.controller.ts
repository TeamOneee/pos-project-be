import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '@app/platform';
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'CASHIER')
  @Get()
  async list(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: TransactionQueryDto,
  ) {
    return this.transactionQueryService.list(actor, query);
  }

  // Dideklarasikan sebelum ':id' agar route literal menang (Express match by order).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'CASHIER')
  @Get('search')
  async search(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ReceiptSearchQueryDto,
  ) {
    return this.transactionQueryService.searchByReceipt(
      actor,
      query.receipt_number,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'CASHIER')
  @Get(':id')
  async detail(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.transactionQueryService.detail(actor, id);
  }
}
