// Implementasi StockReservationPort — atomic conditional update (quantity >= x) dalam
// transaksi checkout yang sama (05 §6.1, AT-004). Gagal pada salah satu line => rollback penuh.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InsufficientStockError } from '@app/platform';
import {
  StockReservationPort,
  StockReservationResult,
} from './stock-reservation.port';

@Injectable()
export class StockReservationService implements StockReservationPort {
  async reserveForSale(
    tx: Prisma.TransactionClient,
    params: {
      merchantId: string;
      outletId: string;
      actorUserId: string;
      lines: { productId: string; quantity: number }[];
    },
  ): Promise<StockReservationResult[]> {
    const results: StockReservationResult[] = [];

    for (const line of params.lines) {
      const row = await tx.inventory.findUnique({
        where: {
          outletId_productId: {
            outletId: params.outletId,
            productId: line.productId,
          },
        },
      });

      if (!row || row.merchantId !== params.merchantId) {
        throw new InsufficientStockError([
          {
            field: 'items[].product_id',
            reason: `stock=0, requested=${line.quantity}`,
          },
        ]);
      }
      if (row.quantity < line.quantity) {
        throw new InsufficientStockError([
          {
            field: 'items[].product_id',
            reason: `stock=${row.quantity}, requested=${line.quantity}`,
          },
        ]);
      }

      const res = await tx.inventory.updateMany({
        where: { id: row.id, quantity: { gte: line.quantity } },
        data: { quantity: { decrement: line.quantity } },
      });
      if (res.count === 0) {
        throw new InsufficientStockError([
          {
            field: 'items[].product_id',
            reason: `stock changed concurrently for ${line.productId}`,
          },
        ]);
      }

      const quantityAfter = row.quantity - line.quantity;
      await tx.stockMovement.create({
        data: {
          merchantId: params.merchantId,
          outletId: params.outletId,
          productId: line.productId,
          type: 'SALE',
          delta: -line.quantity,
          quantityBefore: row.quantity,
          quantityAfter,
          reason: null,
          referenceId: null,
          actorUserId: params.actorUserId,
        },
      });

      results.push({
        productId: line.productId,
        quantityBefore: row.quantity,
        quantityAfter,
      });
    }

    return results;
  }
}
