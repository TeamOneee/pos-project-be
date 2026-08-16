import { Category, Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaWriteService } from '@app/platform';

export interface CategoryListFilter {
  isActive?: boolean;
}

@Injectable()
// menyimpan dan membaca category melalui prisma write service.
export class CategoryRepository {
  constructor(private readonly prisma: PrismaWriteService) {}

  findByIdInMerchant(
    categoryId: string,
    merchantId: string,
  ): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { id: categoryId, merchantId },
    });
  }

  findByNameInMerchant(
    merchantId: string,
    name: string,
  ): Promise<Category | null> {
    return this.prisma.category.findFirst({ where: { merchantId, name } });
  }

  create(merchantId: string, name: string): Promise<Category> {
    return this.prisma.category.create({ data: { merchantId, name } });
  }

  find(
    merchantId: string,
    filter: CategoryListFilter,
    skip: number,
    take: number,
  ): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { merchantId, isActive: filter.isActive },
      skip,
      take,
    });
  }

  count(merchantId: string, filter: CategoryListFilter): Promise<number> {
    return this.prisma.category.count({
      where: { merchantId, isActive: filter.isActive },
    });
  }

  update(
    categoryId: string,
    data: Prisma.CategoryUncheckedUpdateInput,
  ): Promise<Category> {
    return this.prisma.category.update({ where: { id: categoryId }, data });
  }
}
