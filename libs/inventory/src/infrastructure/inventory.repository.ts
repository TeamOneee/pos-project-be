import { Injectable } from '@nestjs/common';
import { Inventory, Prisma } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';

export type InventoryWithDetails = Inventory & {
  product: { name: string; lowStockThreshold: number };
  outlet: { name: string };
};

export interface InventoryListFilter {
  outletId?: string;
  productId?: string;
}

export interface QuantityDeltaResult {
  quantityBefore: number;
  quantityAfter: number;
}

// menyimpan dan membaca saldo stok per kombinasi Product + Outlet (FR-INV-001).
@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaWriteService) {}

  findByMerchantWithDetails(
    merchantId: string,
    filter: InventoryListFilter,
  ): Promise<InventoryWithDetails[]> {
    const where: Prisma.InventoryWhereInput = { merchantId };
    if (filter.outletId) where.outletId = filter.outletId;
    if (filter.productId) where.productId = filter.productId;
    return this.prisma.inventory.findMany({
      where,
      include: {
        product: { select: { name: true, lowStockThreshold: true } },
        outlet: { select: { name: true } },
      },
    });
  }

  findInOutlet(merchantId: string, outletId: string): Promise<Inventory[]> {
    return this.prisma.inventory.findMany({
      where: { merchantId, outletId },
    });
  }

  findByOutletAndProduct(
    tx: Prisma.TransactionClient,
    outletId: string,
    productId: string,
  ): Promise<Inventory | null> {
    return tx.inventory.findUnique({
      where: { outletId_productId: { outletId, productId } },
    });
  }

  create(
    tx: Prisma.TransactionClient,
    data: Prisma.InventoryUncheckedCreateInput,
  ): Promise<Inventory> {
    return tx.inventory.create({ data });
  }

  upsertThreshold(
    tx: Prisma.TransactionClient,
    data: {
      merchantId: string;
      outletId: string;
      productId: string;
      threshold: number;
    },
  ): Promise<InventoryWithDetails> {
    return tx.inventory.upsert({
      where: {
        outletId_productId: {
          outletId: data.outletId,
          productId: data.productId,
        },
      },
      create: {
        merchantId: data.merchantId,
        outletId: data.outletId,
        productId: data.productId,
        quantity: 0,
        lowStockThresholdOverride: data.threshold,
      },
      update: { lowStockThresholdOverride: data.threshold },
      include: {
        product: { select: { name: true, lowStockThreshold: true } },
        outlet: { select: { name: true } },
      },
    });
  }

  clearThreshold(
    tx: Prisma.TransactionClient,
    merchantId: string,
    outletId: string,
    productId: string,
  ): Promise<{ count: number }> {
    return tx.inventory.updateMany({
      where: { merchantId, outletId, productId },
      data: { lowStockThresholdOverride: null },
    });
  }

  // conditional atomic update (FR-INV-004, AT-004): hanya berhasil bila hasil tidak
  // negatif; saldo before/after diambil dari UPDATE ... RETURNING yang sama (05 §6.1).
  async updateQuantityConditional(
    tx: Prisma.TransactionClient,
    params: { inventoryId: string; delta: number },
  ): Promise<QuantityDeltaResult | null> {
    const rows = await tx.$queryRaw<
      Array<{ quantity_before: number; quantity_after: number }>
    >`
      UPDATE "inventory"
      SET "quantity" = "quantity" + ${params.delta}::INTEGER, "updated_at" = NOW()
      WHERE "id" = ${params.inventoryId} AND "quantity" + ${params.delta}::INTEGER >= 0
      RETURNING ("quantity" - ${params.delta}::INTEGER)::INTEGER AS "quantity_before",
                "quantity"::INTEGER AS "quantity_after"
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      quantityBefore: row.quantity_before,
      quantityAfter: row.quantity_after,
    };
  }
}
