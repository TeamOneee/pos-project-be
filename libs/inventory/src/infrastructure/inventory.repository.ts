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

export interface BulkQuantityResult {
  productId: string;
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

  // batch conditional atomic update: satu statement UPDATE ... FROM (VALUES ...)
  // untuk seluruh line checkout (FR-INV-004, AT-004). Mengurangi round-trip per
  // item (3 query/item -> 1 statement) sehingga durasi transaksi checkout pendek.
  async bulkUpdateQuantityConditional(
    tx: Prisma.TransactionClient,
    params: {
      merchantId: string;
      outletId: string;
      lines: { productId: string; delta: number }[];
    },
  ): Promise<BulkQuantityResult[]> {
    if (params.lines.length === 0) return [];
    // Urutkan line by product_id agar semua transaksi konkuren mengunci baris
    // inventory dalam urutan global yang sama -> meminimalkan deadlock (40P01).
    const sorted = [...params.lines].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    );
    const values = sorted.map(
      (l) =>
        Prisma.sql`(${l.productId}, ${params.outletId}, ${params.merchantId}, ${l.delta}::INTEGER)`,
    );
    const rows = await tx.$queryRaw<
      Array<{
        product_id: string;
        quantity_before: number;
        quantity_after: number;
      }>
    >`
      UPDATE "inventory" i
      SET "quantity" = i."quantity" + v.delta, "updated_at" = NOW()
      FROM (VALUES ${Prisma.join(values)}) AS v(product_id, outlet_id, merchant_id, delta)
      WHERE i."outlet_id" = v.outlet_id
        AND i."product_id" = v.product_id
        AND i."merchant_id" = v.merchant_id
        AND i."quantity" + v.delta >= 0
      RETURNING
        i."product_id" AS product_id,
        (i."quantity" - v.delta)::INTEGER AS quantity_before,
        i."quantity"::INTEGER AS quantity_after
    `;
    return rows.map((r) => ({
      productId: r.product_id,
      quantityBefore: Number(r.quantity_before),
      quantityAfter: Number(r.quantity_after),
    }));
  }
}
