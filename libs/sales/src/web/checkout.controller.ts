import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '@app/platform';
import { CheckoutService } from '../application/checkout.service';
import { IdempotencyQueryService } from '../application/idempotency-query.service';
import { CheckoutDto } from './dto/checkout.dto';
import { TransactionStatusQueryDto } from './dto/transaction-query.dto';

@Controller()
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly idempotencyQueryService: IdempotencyQueryService,
  ) {}

  @Post('checkout')
  @Roles('CASHIER', 'OWNER')
  async checkout(@CurrentUser() actor: AuthUser, @Body() dto: CheckoutDto) {
    return this.checkoutService.checkout(actor, dto);
  }

  @Get('transactions/status')
  @Roles('CASHIER', 'OWNER')
  async status(
    @CurrentUser() actor: AuthUser,
    @Query() query: TransactionStatusQueryDto,
  ) {
    return this.idempotencyQueryService.getStatus(actor, query);
  }
}
