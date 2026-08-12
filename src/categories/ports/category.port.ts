import { Category } from '@prisma/client';

/**
 * Public contract yang disediakan Category Module untuk module lain.
 */
export interface CategoryPort {
  findById(categoryId: string): Promise<Category | null>;

  ensureMerchantOwnership(
    categoryId: string,
    merchantId: string,
  ): Promise<Category>;

  createCategory(merchantId: string, name: string): Promise<Category>;

  listByMerchant(merchantId: string): Promise<Category[]>;
}
