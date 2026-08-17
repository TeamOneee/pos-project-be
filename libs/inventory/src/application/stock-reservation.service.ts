// Implementasi StockReservationPort — conditional atomic update (quantity >= x)
// dalam transaksi checkout yang sama (05 §6.1, AT-004). Mengembalikan ok:false
// bila ada line yang tidak terpenuhi, tidak melempar (06 §5.4).
import { Injectable } from '@nestjs/common';
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
    const insufficient: InsufficientStockItem[] = [];

    for (const line of ctx.lines) {
      const row = await ctx.tx.inventory.findUnique({
        where: {
          outletId_productId: {
            outletId: ctx.outletId,
            productId: line.productId,
          },
        },
      });

      if (
        !row ||
        row.merchantId !== ctx.merchantId ||
        row.quantity < line.quantity
      ) {
        insufficient.push({
          productId: line.productId,
          requested: line.quantity,
          available:
            row && row.merchantId === ctx.merchantId ? row.quantity : 0,
        });
        continue;
      }

      const updated = await this.inventoryRepository.updateQuantityConditional(
        ctx.tx,
        { inventoryId: row.id, delta: -line.quantity },
      );
      if (!updated) {
        insufficient.push({
          productId: line.productId,
          requested: line.quantity,
          available: row.quantity,
        });
        continue;
      }

      await this.stockMovementRepository.create(ctx.tx, {
        merchantId: ctx.merchantId,
        outletId: ctx.outletId,
        productId: line.productId,
        type: 'SALE',
        delta: -line.quantity,
        quantityBefore: updated.quantityBefore,
        quantityAfter: updated.quantityAfter,
        reason: null,
        transactionId: ctx.transactionId,
        actorUserId: ctx.actorUserId,
      });
    }

    if (insufficient.length > 0) {
      return { ok: false, insufficient };
    }
    return { ok: true };
  }
}
