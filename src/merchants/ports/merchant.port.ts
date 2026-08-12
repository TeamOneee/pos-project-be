import { Merchant, Prisma } from '@prisma/client';

/**
 * Token DI untuk MerchantPort. Dipakai oleh module lain (contoh: Auth) agar
 * bergantung pada kontrak, bukan pada implementasi konkret MerchantsService.
 */
export const MERCHANT_PORT = 'MERCHANT_PORT';

/**
 * Public contract yang disediakan Merchant Module untuk module lain.
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

  updateName(
    merchantId: string,
    name: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Merchant>;
}
