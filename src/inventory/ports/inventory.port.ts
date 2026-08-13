import { Prisma } from '@prisma/client';

export interface StockSnapshot {
  inventoryId: string;
  outletId: string;
  productId: string;
  quantity: number;
}

export type StockMovementType =
  | 'ADJUSTMENT'
  | 'SALE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT';

export interface StockMovementRecord {
  inventoryId: string;
  type: StockMovementType;
  before: number;
  after: number;
  delta: number;
  reason?: string;
  actorId: string;
  timestamp: Date;
}

export interface AdjustStockData {
  inventoryId: string;
  targetQuantity: number;
  reason: string;
  actorId: string;
}

/**
 * Public contract yang disediakan Inventory Module untuk module lain.
 *
 * Inventory adalah owner dari stock. Module lain (contoh: Checkout/Transaction)
 * hanya boleh meminta kemampuan ini dan tidak boleh mengakses repository /
 * tabel inventory secara langsung.
 *
 * Audit: setiap perubahan stok (adjustment manual, sale, transfer) wajib
 * tercatat di StockMovement (before/after/delta/reason/actor/timestamp) —
 * FR-INV-003, BR-019.
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

  adjustStock(
    data: AdjustStockData,
    tx?: Prisma.TransactionClient,
  ): Promise<StockMovementRecord>;

  transferStock(
    fromOutletId: string,
    toOutletId: string,
    productId: string,
    quantity: number,
    actorId: string,
    reason?: string,
  ): Promise<void>;
}
