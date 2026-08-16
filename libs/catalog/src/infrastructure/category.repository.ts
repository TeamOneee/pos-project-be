import { Category, Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaWriteService } from '@app/platform';

export interface CategoryListFilter {
  isActive?: boolean;
}

@Injectable()
// menyimpan dan membaca category melalui prisma write service.
// repository tidak menerima actor sehingga service wajib memasok merchant scope.
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
      where: this.toWhere(merchantId, filter),
      skip,
      take,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  count(merchantId: string, filter: CategoryListFilter): Promise<number> {
    return this.prisma.category.count({
      where: this.toWhere(merchantId, filter),
    });
  }

  update(
    categoryId: string,
    data: Prisma.CategoryUncheckedUpdateInput,
  ): Promise<Category> {
    return this.prisma.category.update({ where: { id: categoryId }, data });
  }

  private toWhere(
    merchantId: string,
    filter: CategoryListFilter,
  ): Prisma.CategoryWhereInput {
    // membatasi query ke merchant tanpa pernah memakai scope dari client.
    // query yang sama dipakai find dan count agar metadata pagination akurat.
    return {
      merchantId,
      isActive: filter.isActive,
    };
  }
}
