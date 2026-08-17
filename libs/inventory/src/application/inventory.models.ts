// DTO internal (camelCase) antara web -> application dan application -> web.
// Pemetaan ke payload API snake_case dilakukan di layer web (06 §5.1).

export interface InventoryListFilter {
  outletId?: string;
  productId?: string;
  lowStockOnly?: boolean;
}

export interface AdjustStockCommand {
  outletId: string;
  productId: string;
  delta: number;
  reason: string;
}

export interface StockMovementListFilter {
  outletId?: string;
  productId?: string;
  type?: 'ADJUSTMENT' | 'SALE';
  dateFrom?: string;
  dateTo?: string;
}

export interface OutletCatalogQuery {
  outletId: string;
  search?: string;
  categoryId?: string;
}

export interface InventoryRowResult {
  id: string;
  outletId: string;
  outletName: string;
  productId: string;
  productName: string;
  quantity: number;
  baseLowStockThreshold: number;
  lowStockThresholdOverride: number | null;
  effectiveLowStockThreshold: number;
  isLowStock: boolean;
  updatedAt: Date;
}

export interface AdjustmentResult {
  movementId: string;
  outletId: string;
  productId: string;
  quantityBefore: number;
  quantityAfter: number;
  delta: number;
  reason: string;
  actorUserId: string;
  createdAt: Date;
}

export interface LowStockThresholdResult {
  productId: string;
  outletId: string;
  baseLowStockThreshold: number;
  lowStockThresholdOverride: number | null;
  effectiveLowStockThreshold: number;
  updatedAt: Date;
}

export interface StockMovementResult {
  id: string;
  outletId: string;
  productId: string;
  type: 'ADJUSTMENT' | 'SALE';
  delta: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string | null;
  transactionId: string | null;
  actorUserId: string;
  createdAt: Date;
}

export interface CatalogProductResult {
  id: string;
  name: string;
  price: string;
  categoryId: string;
  stockQuantity: number;
}
