import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '@app/platform';
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER')
  @Post('checkout')
  async checkout(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CheckoutDto,
  ) {
    return this.checkoutService.checkout(actor, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER')
  @Get('transactions/status')
  async status(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: TransactionStatusQueryDto,
  ) {
    return this.idempotencyQueryService.getStatus(actor, query);
  }
}
