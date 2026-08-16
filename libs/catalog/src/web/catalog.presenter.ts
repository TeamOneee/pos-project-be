import {
  CategoryResult,
  OutletPriceResult,
  ProductResult,
} from '../application/catalog.models';
import { CategoryDto } from './dto/category.dto';
import { ProductOutletPriceDto } from './dto/product-outlet-price.dto';
import { ProductDto } from './dto/product.dto';

// mengubah result application menjadi response api berformat snake_case.
export function toCategoryDto(result: CategoryResult): CategoryDto {
  return {
    id: result.id,
    merchant_id: result.merchantId,
    name: result.name,
    is_active: result.isActive,
  };
}

// mengubah result application menjadi response product api.
export function toProductDto(result: ProductResult): ProductDto {
  return {
    id: result.id,
    merchant_id: result.merchantId,
    category_id: result.categoryId,
    category_name: result.categoryName,
    name: result.name,
    price: result.price,
    low_stock_threshold: result.lowStockThreshold,
    is_active: result.isActive,
    created_at: result.createdAt,
    updated_at: result.updatedAt,
  };
}

// mengubah result application menjadi response harga override api.
export function toProductOutletPriceDto(
  result: OutletPriceResult,
): ProductOutletPriceDto {
  return {
    product_id: result.productId,
    outlet_id: result.outletId,
    price: result.price,
    updated_at: result.updatedAt,
  };
}
