import { Prisma } from '@prisma/client';
import { BaseRepository } from 'src/common/repositories/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

export class MerchantsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createMerchant(name: string, tx?: Prisma.TransactionClient) {
    return this.getPrismaClient(tx).merchant.create({
      data: { name },
    });
  }

  async findMerchantById(merchantId: string, tx?: Prisma.TransactionClient) {
    return this.getPrismaClient(tx).merchant.findUnique({
      where: { merchantId },
    });
  }

  async updateMerchant(
    merchantId: string,
    data: { name?: string; lowStockThreshold?: number },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getPrismaClient(tx).merchant.update({
      where: { merchantId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.lowStockThreshold !== undefined && {
          low_stock_threshold: data.lowStockThreshold,
        }),
      },
    });
  }
}
