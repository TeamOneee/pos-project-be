import { Merchant, Prisma } from '@prisma/client';

/**
 * Token DI untuk MerchantPort. Dipakai oleh module lain (contoh: Auth) agar
 * bergantung pada kontrak, bukan pada implementasi konkret MerchantsService.
 */
export const MERCHANT_PORT = 'MERCHANT_PORT';

/**
 * Public contract yang disediakan Merchant Module untuk module lain.
 *
 * `low_stock_threshold` adalah satu threshold global nonnegatif per Merchant
 * yang berlaku untuk seluruh Inventory Merchant (FR-INV-008, DR-011A).
 */
export interface MerchantPort {
  createMerchant(
    name: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Merchant>;

  findById(
    merchantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Merchant | null>;

  update(
    merchantId: string,
    data: { name?: string; lowStockThreshold?: number },
    tx?: Prisma.TransactionClient,
  ): Promise<Merchant>;
}
