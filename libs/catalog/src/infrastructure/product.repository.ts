import { Injectable } from '@nestjs/common';
import { Category, Prisma, Product } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';

export type ProductWithCategory = Product & { category: Category };

export interface ProductListFilter {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
}

@Injectable()
// menyimpan dan membaca product beserta category melalui prisma write service.
export class ProductRepository {
  constructor(private readonly prisma: PrismaWriteService) {}

  create(
    data: Prisma.ProductUncheckedCreateInput,
  ): Promise<ProductWithCategory> {
    return this.prisma.product.create({
      data,
      include: { category: true },
    });
  }

  findByIdInMerchant(
    productId: string,
    merchantId: string,
  ): Promise<ProductWithCategory | null> {
    return this.prisma.product.findFirst({
      where: { id: productId, merchantId },
      include: { category: true },
    });
  }

  findByIdsInMerchant(
    productIds: string[],
    merchantId: string,
  ): Promise<ProductWithCategory[]> {
    if (productIds.length === 0) {
      return Promise.resolve<ProductWithCategory[]>([]);
    }
    const where: Prisma.ProductWhereInput = {
      id: { in: productIds },
      merchantId,
    };
    const query = {
      where,
      include: { category: true },
    } satisfies Prisma.ProductFindManyArgs;
    return this.prisma.product.findMany(query);
  }

  find(
    merchantId: string,
    filter: ProductListFilter,
    skip: number,
    take: number,
  ): Promise<ProductWithCategory[]> {
    return this.prisma.product.findMany({
      where: {
        merchantId,
        categoryId: filter.categoryId,
        isActive: filter.isActive,
        ...(filter.search
          ? { name: { contains: filter.search, mode: 'insensitive' } }
          : {}),
      },
      include: { category: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
    });
  }

  count(merchantId: string, filter: ProductListFilter): Promise<number> {
    return this.prisma.product.count({
      where: {
        merchantId,
        categoryId: filter.categoryId,
        isActive: filter.isActive,
        ...(filter.search
          ? { name: { contains: filter.search, mode: 'insensitive' } }
          : {}),
      },
    });
  }

  update(
    productId: string,
    data: Prisma.ProductUncheckedUpdateInput,
  ): Promise<ProductWithCategory> {
    return this.prisma.product.update({
      where: { id: productId },
      data,
      include: { category: true },
    });
  }
}
