// [kontrak] StockReservationPort — dimiliki modul inventory, dipakai sales saat checkout (06 §5.4).
// Dipanggil DI DALAM transaksi checkout (tx milik pemanggil); port tidak commit/rollback.
// Tidak melempar untuk kekurangan stok — hasil dikembalikan via `ok: false` agar
// orchestrator memutuskan rollback dan memetakan ke HTTP 409 INSUFFICIENT_STOCK.
import { Prisma } from '@prisma/client';

export interface ReserveForSaleLine {
  productId: string;
  quantity: number;
}

export interface InsufficientStockItem {
  productId: string;
  requested: number;
  available: number;
}

export type StockReservationResult =
  { ok: true } | { ok: false; insufficient: InsufficientStockItem[] };

export interface StockReservationContext {
  merchantId: string;
  outletId: string;
  /** Transaction yang sedang di-commit; ditulis ke stock_movement type=SALE. */
  transactionId: string;
  /** Pelaku checkout; wajib untuk stock_movement.actor_user_id (FR-INV-003). */
  actorUserId: string;
  tx: Prisma.TransactionClient;
  lines: ReserveForSaleLine[];
}

export abstract class StockReservationPort {
  abstract reserveForSale(
    ctx: StockReservationContext,
  ): Promise<StockReservationResult>;
}
