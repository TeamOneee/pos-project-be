import { Prisma } from '@prisma/client';

export interface StockSnapshot {
  inventoryId: string;
  outletId: string;
  productId: string;
  quantity: number;
}

/**
 * Public contract yang disediakan Inventory Module untuk module lain.
 *
 * Inventory adalah owner dari stock. Module lain (contoh: Checkout/Transaction)
 * hanya boleh meminta kemampuan ini dan tidak boleh mengakses repository /
 * tabel inventory secara langsung.
 */
export interface InventoryPort {
  getStock(outletId: string, productId: string): Promise<number>;

  checkStock(
    outletId: string,
    productId: string,
    quantity: number,
  ): Promise<boolean>;

  decreaseStock(
    outletId: string,
    productId: string,
    quantity: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;

  increaseStock(
    outletId: string,
    productId: string,
    quantity: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;

  transferStock(
    fromOutletId: string,
    toOutletId: string,
    productId: string,
    quantity: number,
  ): Promise<void>;
}
