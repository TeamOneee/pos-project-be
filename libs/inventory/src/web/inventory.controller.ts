import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '@app/platform';
import { InventoryQueryService } from '../application/inventory-query.service';
import { StockAdjustmentService } from '../application/stock-adjustment.service';
import { LowStockThresholdService } from '../application/low-stock-threshold.service';
import { StockMovementQueryService } from '../application/stock-movement-query.service';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { SetLowStockThresholdDto } from './dto/low-stock-threshold.dto';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto';

@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryQueryService: InventoryQueryService,
    private readonly stockAdjustmentService: StockAdjustmentService,
    private readonly lowStockThresholdService: LowStockThresholdService,
    private readonly stockMovementQueryService: StockMovementQueryService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @Get()
  async list(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: InventoryQueryDto,
  ) {
    return this.inventoryQueryService.list(actor, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('adjustments')
  async adjust(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: AdjustStockDto,
  ) {
    return this.stockAdjustmentService.adjust(actor, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':product_id/outlets/:outlet_id/low-stock-threshold')
  async setThreshold(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('product_id') productId: string,
    @Param('outlet_id') outletId: string,
    @Body() dto: SetLowStockThresholdDto,
  ) {
    return this.lowStockThresholdService.setThreshold(
      actor,
      productId,
      outletId,
      dto.threshold,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(204)
  @Delete(':product_id/outlets/:outlet_id/low-stock-threshold')
  async deleteThreshold(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('product_id') productId: string,
    @Param('outlet_id') outletId: string,
  ) {
    return this.lowStockThresholdService.deleteThreshold(
      actor,
      productId,
      outletId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @Get('movements')
  async movements(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: StockMovementQueryDto,
  ) {
    return this.stockMovementQueryService.list(actor, query);
  }
}
