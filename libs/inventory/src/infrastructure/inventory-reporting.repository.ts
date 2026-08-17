import { Injectable } from '@nestjs/common';
import { PrismaReadService } from '@app/platform';
import {
  InventoryLowStockItem,
  InventoryOperationalData,
  InventoryReportingQuery,
} from '../application/ports/inventory-reporting-read.port';

@Injectable()
export class InventoryReportingRepository {
  constructor(private readonly prismaRead: PrismaReadService) {}

  async getOperationalData(
    query: InventoryReportingQuery,
  ): Promise<InventoryOperationalData> {
    const items = await this.prismaRead.inventory.findMany({
      where: {
        merchantId: query.merchantId,
        ...(query.outletId ? { outletId: query.outletId } : {}),
      },
      select: {
        quantity: true,
        lowStockThresholdOverride: true,
        product: {
          select: {
            lowStockThreshold: true,
          },
        },
      },
    });

    let lowStockItemCount = 0;
    let outOfStockItemCount = 0;

    for (const item of items) {
      if (item.quantity === 0) {
        outOfStockItemCount++;
      } else {
        const effectiveThreshold =
          item.lowStockThresholdOverride ?? item.product.lowStockThreshold;
        if (item.quantity <= effectiveThreshold) {
          lowStockItemCount++;
        }
      }
    }

    return {
      inventoryItemCount: items.length,
      lowStockItemCount,
      outOfStockItemCount,
    };
  }

  async listLowStock(
    query: InventoryReportingQuery,
  ): Promise<InventoryLowStockItem[]> {
    const items = await this.prismaRead.inventory.findMany({
      where: {
        merchantId: query.merchantId,
        ...(query.outletId ? { outletId: query.outletId } : {}),
      },
      select: {
        quantity: true,
        lowStockThresholdOverride: true,
        outletId: true,
        productId: true,
        outlet: {
          select: {
            name: true,
          },
        },
        product: {
          select: {
            name: true,
            lowStockThreshold: true,
          },
        },
      },
    });

    const lowStockItems: InventoryLowStockItem[] = [];

    for (const item of items) {
      const effectiveThreshold =
        item.lowStockThresholdOverride ?? item.product.lowStockThreshold;
      if (item.quantity <= effectiveThreshold) {
        lowStockItems.push({
          productId: item.productId,
          name: item.product.name,
          outletId: item.outletId,
          outletName: item.outlet.name,
          quantity: item.quantity,
          baseLowStockThreshold: item.product.lowStockThreshold,
          lowStockThresholdOverride: item.lowStockThresholdOverride,
          effectiveLowStockThreshold: effectiveThreshold,
        });
      }
    }

    // Urutkan dari stok terendah (FR-INV-007)
    return lowStockItems.sort((a, b) => a.quantity - b.quantity);
  }
}
