// Implementasi StockReservationPort — conditional atomic update (quantity >= x)
// dalam transaksi checkout yang sama (05 §6.1, AT-004). Mengembalikan ok:false
// bila ada line yang tidak terpenuhi, tidak melempar (06 §5.4).
import { Injectable } from '@nestjs/common';
import { posStockMovementsTotal } from '@app/platform/platform.metrics';
import { InventoryRepository } from '../infrastructure/inventory.repository';
import { StockMovementRepository } from '../infrastructure/stock-movement.repository';
import {
  InsufficientStockItem,
  StockReservationContext,
  StockReservationPort,
  StockReservationResult,
} from './stock-reservation.port';

@Injectable()
export class StockReservationService implements StockReservationPort {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly stockMovementRepository: StockMovementRepository,
  ) {}

  async reserveForSale(
    ctx: StockReservationContext,
  ): Promise<StockReservationResult> {
    // Batch conditional atomic update seluruh line dalam satu statement
    // (FR-INV-004, AT-004): setiap row hanya ter-update bila hasil tidak negatif.
    const updated =
      await this.inventoryRepository.bulkUpdateQuantityConditional(ctx.tx, {
        merchantId: ctx.merchantId,
        outletId: ctx.outletId,
        lines: ctx.lines.map((l) => ({
          productId: l.productId,
          delta: -l.quantity,
        })),
      });

    const updatedByProductId = new Map(updated.map((u) => [u.productId, u]));
    const requestedByProductId = new Map(
      ctx.lines.map((l) => [l.productId, l.quantity]),
    );

    const insufficient: InsufficientStockItem[] = ctx.lines
      .filter((l) => !updatedByProductId.has(l.productId))
      .map((l) => ({
        productId: l.productId,
        requested: l.quantity,
        available: 0,
      }));

    if (insufficient.length > 0) {
      // hanya pada jalur error: baca saldo terkini untuk pesan yang akurat
      const current = await ctx.tx.inventory.findMany({
        where: {
          merchantId: ctx.merchantId,
          outletId: ctx.outletId,
          productId: { in: insufficient.map((i) => i.productId) },
        },
        select: { productId: true, quantity: true },
      });
      const quantityByProductId = new Map(
        current.map((r) => [r.productId, r.quantity]),
      );
      return {
        ok: false,
        insufficient: insufficient.map((i) => ({
          ...i,
          available: quantityByProductId.get(i.productId) ?? 0,
        })),
      };
    }

    await this.stockMovementRepository.createMany(
      ctx.tx,
      updated.map((u) => ({
        merchantId: ctx.merchantId,
        outletId: ctx.outletId,
        productId: u.productId,
        type: 'SALE',
        delta: -(requestedByProductId.get(u.productId) ?? 0),
        quantityBefore: u.quantityBefore,
        quantityAfter: u.quantityAfter,
        reason: null,
        transactionId: ctx.transactionId,
        actorUserId: ctx.actorUserId,
      })),
    );

    posStockMovementsTotal.inc({ type: 'SALE' }, updated.length);

    return { ok: true };
  }
}
