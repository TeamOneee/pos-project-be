import { Product } from '@prisma/client';

export interface ProductQuery {
  categoryId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Public contract yang disediakan Product Module untuk module lain.
 *
 * Catatan boundary: Product TIDAK memiliki stock. Operasi stock dilakukan
 * melalui Inventory Module.
 */
export interface ProductPort {
  findById(productId: string): Promise<Product | null>;

  findByIds(productIds: string[]): Promise<Product[]>;

  ensureActive(productId: string): Promise<Product>;

  listByMerchant(merchantId: string, query?: ProductQuery): Promise<Product[]>;
}
