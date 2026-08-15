// [kontrak] StockReservationPort — dimiliki modul inventory, dipakai sales saat checkout.
// Reservasi stok atomik dalam transaksi Prisma yang sama (conditional update quantity >= x, 05 §6.1).
import { Prisma } from '@prisma/client';

export interface ReserveForSaleLine {
  productId: string;
  quantity: number;
}

export interface StockReservationResult {
  productId: string;
  quantityBefore: number;
  quantityAfter: number;
}

export abstract class StockReservationPort {
  /**
   * Kurangi stok outlet secara atomik untuk setiap line dan tulis stock_movement type=SALE.
   * Melempar InsufficientStockError bila salah satu line tidak terpenuhi (rollback penuh).
   */
  abstract reserveForSale(
    tx: Prisma.TransactionClient,
    params: {
      merchantId: string;
      outletId: string;
      actorUserId: string;
      lines: ReserveForSaleLine[];
    },
  ): Promise<StockReservationResult[]>;
}
