import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AuthUser, CurrentUser, PageResponseDto, Roles } from '@app/platform';
import { InventoryQueryService } from '../application/inventory-query.service';
import { StockAdjustmentService } from '../application/stock-adjustment.service';
import { LowStockThresholdService } from '../application/low-stock-threshold.service';
import { StockMovementQueryService } from '../application/stock-movement-query.service';
import {
  toAdjustmentDto,
  toInventoryDto,
  toMovementDto,
  toThresholdDto,
} from './inventory.presenter';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { SetLowStockThresholdDto } from './dto/low-stock-threshold.dto';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto';

@Controller('inventory')
// modul inventory (FR-INV-001-008): daftar stok, adjustment, threshold, riwayat movement.
export class InventoryController {
  constructor(
    private readonly inventoryQueryService: InventoryQueryService,
    private readonly stockAdjustmentService: StockAdjustmentService,
    private readonly lowStockThresholdService: LowStockThresholdService,
    private readonly stockMovementQueryService: StockMovementQueryService,
  ) {}

  @Get()
  @Roles('OWNER', 'ADMIN')
  async list(
    @CurrentUser() actor: AuthUser,
    @Query() query: InventoryQueryDto,
  ) {
    const page = await this.inventoryQueryService.list(
      actor,
      {
        outletId: query.outlet_id,
        productId: query.product_id,
        lowStockOnly: query.low_stock_only,
      },
      query,
    );
    return PageResponseDto.from(
      page.content.map(toInventoryDto),
      page.page,
      page.size,
      page.total_elements,
    );
  }

  @Post('adjustments')
  @Roles('ADMIN', 'OWNER')
  @HttpCode(HttpStatus.CREATED)
  async adjust(@CurrentUser() actor: AuthUser, @Body() dto: AdjustStockDto) {
    return toAdjustmentDto(
      await this.stockAdjustmentService.adjust(actor, {
        outletId: dto.outlet_id,
        productId: dto.product_id,
        delta: dto.delta,
        reason: dto.reason,
      }),
    );
  }

  @Put(':product_id/outlets/:outlet_id/low-stock-threshold')
  @Roles('ADMIN', 'OWNER')
  async setThreshold(
    @CurrentUser() actor: AuthUser,
    @Param('product_id', ParseUUIDPipe) productId: string,
    @Param('outlet_id', ParseUUIDPipe) outletId: string,
    @Body() dto: SetLowStockThresholdDto,
  ) {
    return toThresholdDto(
      await this.lowStockThresholdService.setThreshold(
        actor,
        productId,
        outletId,
        dto.threshold,
      ),
    );
  }

  @Delete(':product_id/outlets/:outlet_id/low-stock-threshold')
  @Roles('ADMIN', 'OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteThreshold(
    @CurrentUser() actor: AuthUser,
    @Param('product_id', ParseUUIDPipe) productId: string,
    @Param('outlet_id', ParseUUIDPipe) outletId: string,
  ): Promise<void> {
    await this.lowStockThresholdService.deleteThreshold(
      actor,
      productId,
      outletId,
    );
  }

  @Get('movements')
  @Roles('OWNER', 'ADMIN')
  async movements(
    @CurrentUser() actor: AuthUser,
    @Query() query: StockMovementQueryDto,
  ) {
    const page = await this.stockMovementQueryService.list(
      actor,
      {
        outletId: query.outlet_id,
        productId: query.product_id,
        type: query.type,
        dateFrom: query.date_from,
        dateTo: query.date_to,
      },
      query,
    );
    return PageResponseDto.from(
      page.content.map(toMovementDto),
      page.page,
      page.size,
      page.total_elements,
    );
  }
}
