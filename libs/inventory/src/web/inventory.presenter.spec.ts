import {
  toInventoryDto,
  toAdjustmentDto,
  toThresholdDto,
  toMovementDto,
  toCatalogProductDto,
} from './inventory.presenter';

const now = new Date('2026-08-18T10:00:00.000Z');

describe('inventory.presenter', () => {
  it('toInventoryDto memetakan InventoryRowResult ke snake_case', () => {
    const result = toInventoryDto({
      id: 'inv-1',
      outletId: 'o-1',
      outletName: 'Outlet Pusat',
      productId: 'p-1',
      productName: 'Nasi Goreng',
      quantity: 50,
      baseLowStockThreshold: 10,
      lowStockThresholdOverride: null,
      effectiveLowStockThreshold: 10,
      isLowStock: false,
      updatedAt: now,
    });
    expect(result).toEqual({
      id: 'inv-1',
      outlet_id: 'o-1',
      outlet_name: 'Outlet Pusat',
      product_id: 'p-1',
      product_name: 'Nasi Goreng',
      quantity: 50,
      base_low_stock_threshold: 10,
      low_stock_threshold_override: null,
      effective_low_stock_threshold: 10,
      is_low_stock: false,
      updated_at: now.toISOString(),
    });
  });

  it('toAdjustmentDto memetakan AdjustmentResult', () => {
    const result = toAdjustmentDto({
      movementId: 'mov-1',
      outletId: 'o-1',
      productId: 'p-1',
      quantityBefore: 50,
      quantityAfter: 45,
      delta: -5,
      reason: 'Penjualan',
      actorUserId: 'u-1',
      createdAt: now,
    });
    expect(result).toEqual({
      movement_id: 'mov-1',
      outlet_id: 'o-1',
      product_id: 'p-1',
      quantity_before: 50,
      quantity_after: 45,
      delta: -5,
      reason: 'Penjualan',
      actor_user_id: 'u-1',
      created_at: now.toISOString(),
    });
  });

  it('toThresholdDto memetakan LowStockThresholdResult', () => {
    const result = toThresholdDto({
      productId: 'p-1',
      outletId: 'o-1',
      baseLowStockThreshold: 10,
      lowStockThresholdOverride: 5,
      effectiveLowStockThreshold: 5,
      updatedAt: now,
    });
    expect(result).toEqual({
      product_id: 'p-1',
      outlet_id: 'o-1',
      base_low_stock_threshold: 10,
      low_stock_threshold_override: 5,
      effective_low_stock_threshold: 5,
      updated_at: now.toISOString(),
    });
  });

  it('toMovementDto memetakan StockMovementResult', () => {
    const result = toMovementDto({
      id: 'mov-1',
      outletId: 'o-1',
      productId: 'p-1',
      type: 'SALE',
      delta: -5,
      quantityBefore: 50,
      quantityAfter: 45,
      reason: 'Penjualan',
      transactionId: 't-1',
      actorUserId: 'u-1',
      createdAt: now,
    });
    expect(result).toEqual({
      id: 'mov-1',
      outlet_id: 'o-1',
      product_id: 'p-1',
      type: 'SALE',
      delta: -5,
      quantity_before: 50,
      quantity_after: 45,
      reason: 'Penjualan',
      transaction_id: 't-1',
      actor_user_id: 'u-1',
      created_at: now.toISOString(),
    });
  });

  it('toCatalogProductDto memetakan CatalogProductResult', () => {
    const result = toCatalogProductDto({
      id: 'p-1',
      name: 'Nasi Goreng',
      price: '25000.00',
      categoryId: 'cat-1',
      stockQuantity: 30,
    });
    expect(result).toEqual({
      id: 'p-1',
      name: 'Nasi Goreng',
      price: '25000.00',
      category_id: 'cat-1',
      stock_quantity: 30,
    });
  });
});
