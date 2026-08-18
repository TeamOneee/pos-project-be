import { Injectable } from '@nestjs/common';
import { Prisma, StockMovement, StockMovementType } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';

export interface StockMovementListFilter {
  outletId?: string;
  productId?: string;
  type?: StockMovementType;
  dateFrom?: string;
  dateTo?: string;
}

// riwayat perubahan stok per Outlet/Product (FR-INV-003); bukan audit trail umum.
@Injectable()
export class StockMovementRepository {
  constructor(private readonly prisma: PrismaWriteService) {}

  create(
    tx: Prisma.TransactionClient,
    data: Prisma.StockMovementUncheckedCreateInput,
  ): Promise<StockMovement> {
    return tx.stockMovement.create({ data });
  }

  // batch insert riwayat stok untuk seluruh line checkout (type=SALE) dalam
  // satu statement, mengurangi round-trip transaksi checkout.
  createMany(
    tx: Prisma.TransactionClient,
    data: Prisma.StockMovementUncheckedCreateInput[],
  ): Promise<Prisma.BatchPayload> {
    return tx.stockMovement.createMany({ data });
  }

  findByMerchant(
    merchantId: string,
    filter: StockMovementListFilter,
    skip: number,
    take: number,
  ): Promise<StockMovement[]> {
    return this.prisma.stockMovement.findMany({
      where: this.buildWhere(merchantId, filter),
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  countByMerchant(
    merchantId: string,
    filter: StockMovementListFilter,
  ): Promise<number> {
    return this.prisma.stockMovement.count({
      where: this.buildWhere(merchantId, filter),
    });
  }

  private buildWhere(
    merchantId: string,
    filter: StockMovementListFilter,
  ): Prisma.StockMovementWhereInput {
    const where: Prisma.StockMovementWhereInput = { merchantId };
    if (filter.outletId) where.outletId = filter.outletId;
    if (filter.productId) where.productId = filter.productId;
    if (filter.type) where.type = filter.type;
    if (filter.dateFrom || filter.dateTo) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (filter.dateFrom) createdAt.gte = new Date(filter.dateFrom);
      if (filter.dateTo) createdAt.lte = new Date(filter.dateTo);
      where.createdAt = createdAt;
    }
    return where;
  }
}
