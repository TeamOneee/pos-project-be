export interface InventoryItemDto {
  id: string;
  outlet_id: string;
  outlet_name: string;
  product_id: string;
  product_name: string;
  quantity: number;
  base_low_stock_threshold: number;
  low_stock_threshold_override: number | null;
  effective_low_stock_threshold: number;
  is_low_stock: boolean;
  updated_at: string;
}

export interface StockMovementDto {
  id: string;
  outlet_id: string;
  product_id: string;
  type: 'ADJUSTMENT' | 'SALE';
  delta: number;
  quantity_before: number;
  quantity_after: number;
  reason: string | null;
  reference_id: string | null;
  actor_user_id: string;
  created_at: string;
}

export interface AdjustmentResultDto {
  movement_id: string;
  outlet_id: string;
  product_id: string;
  quantity_before: number;
  quantity_after: number;
  delta: number;
  reason: string;
  actor_user_id: string;
  created_at: string;
}

export interface LowStockThresholdDto {
  product_id: string;
  outlet_id: string;
  base_low_stock_threshold: number;
  low_stock_threshold_override: number | null;
  effective_low_stock_threshold: number;
  updated_at: string;
}

export interface CatalogProductDto {
  id: string;
  name: string;
  price: string;
  category_id: string;
  stock_quantity: number;
}
