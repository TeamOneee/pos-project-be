import {
  AdjustmentResult,
  CatalogProductResult,
  InventoryRowResult,
  LowStockThresholdResult,
  StockMovementResult,
} from '../application/inventory.models';
import {
  AdjustmentResultDto,
  CatalogProductDto,
  InventoryItemDto,
  LowStockThresholdDto,
  StockMovementDto,
} from './dto/inventory-response.dto';

// memetakan hasil application (camelCase) ke payload API snake_case (06 §5.1).
export function toInventoryDto(r: InventoryRowResult): InventoryItemDto {
  return {
    id: r.id,
    outlet_id: r.outletId,
    outlet_name: r.outletName,
    product_id: r.productId,
    product_name: r.productName,
    quantity: r.quantity,
    base_low_stock_threshold: r.baseLowStockThreshold,
    low_stock_threshold_override: r.lowStockThresholdOverride,
    effective_low_stock_threshold: r.effectiveLowStockThreshold,
    is_low_stock: r.isLowStock,
    updated_at: r.updatedAt.toISOString(),
  };
}

export function toAdjustmentDto(r: AdjustmentResult): AdjustmentResultDto {
  return {
    movement_id: r.movementId,
    outlet_id: r.outletId,
    product_id: r.productId,
    quantity_before: r.quantityBefore,
    quantity_after: r.quantityAfter,
    delta: r.delta,
    reason: r.reason,
    actor_user_id: r.actorUserId,
    created_at: r.createdAt.toISOString(),
  };
}

export function toThresholdDto(
  r: LowStockThresholdResult,
): LowStockThresholdDto {
  return {
    product_id: r.productId,
    outlet_id: r.outletId,
    base_low_stock_threshold: r.baseLowStockThreshold,
    low_stock_threshold_override: r.lowStockThresholdOverride,
    effective_low_stock_threshold: r.effectiveLowStockThreshold,
    updated_at: r.updatedAt.toISOString(),
  };
}

export function toMovementDto(r: StockMovementResult): StockMovementDto {
  return {
    id: r.id,
    outlet_id: r.outletId,
    product_id: r.productId,
    type: r.type,
    delta: r.delta,
    quantity_before: r.quantityBefore,
    quantity_after: r.quantityAfter,
    reason: r.reason,
    transaction_id: r.transactionId,
    actor_user_id: r.actorUserId,
    created_at: r.createdAt.toISOString(),
  };
}

export function toCatalogProductDto(
  r: CatalogProductResult,
): CatalogProductDto {
  return {
    id: r.id,
    name: r.name,
    price: r.price,
    category_id: r.categoryId,
    stock_quantity: r.stockQuantity,
  };
}
