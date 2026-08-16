import { Injectable } from '@nestjs/common';
import { Merchant, Prisma } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';

@Injectable()
export class MerchantRepository {
  constructor(private readonly prisma: PrismaWriteService) {}

  findById(merchantId: string): Promise<Merchant | null> {
    return this.prisma.merchant.findUnique({ where: { id: merchantId } });
  }

  update(
    merchantId: string,
    data: Prisma.MerchantUncheckedUpdateInput,
  ): Promise<Merchant> {
    return this.prisma.merchant.update({ where: { id: merchantId }, data });
  }
}
