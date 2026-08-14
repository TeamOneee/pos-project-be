import { Injectable } from '@nestjs/common';
import { Prisma, ProductOutletPrice } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';

@Injectable()
// menyimpan dan membaca harga override dengan scope merchant, outlet, dan product.
export class OutletPriceRepository {
  constructor(private readonly prisma: PrismaWriteService) {}

  findByOutletAndProductIds(
    merchantId: string,
    outletId: string,
    productIds: string[],
  ): Promise<ProductOutletPrice[]> {
    if (productIds.length === 0) {
      return Promise.resolve<ProductOutletPrice[]>([]);
    }
    const where: Prisma.ProductOutletPriceWhereInput = {
      merchantId,
      outletId,
      productId: { in: productIds },
    };
    const query = {
      where,
    } satisfies Prisma.ProductOutletPriceFindManyArgs;
    return this.prisma.productOutletPrice.findMany(query);
  }

  upsert(
    merchantId: string,
    outletId: string,
    productId: string,
    price: Prisma.Decimal,
  ): Promise<ProductOutletPrice> {
    return this.prisma.productOutletPrice.upsert({
      where: { outletId_productId: { outletId, productId } },
      create: { merchantId, outletId, productId, price },
      update: { price },
    });
  }

  async delete(
    merchantId: string,
    outletId: string,
    productId: string,
  ): Promise<boolean> {
    const result = await this.prisma.productOutletPrice.deleteMany({
      where: { merchantId, outletId, productId },
    });
    return result.count === 1;
  }
}
