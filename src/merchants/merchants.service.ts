import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MerchantsRepository } from './merchants.repository';
import { MerchantPort } from './ports/merchant.port';

@Injectable()
export class MerchantsService implements MerchantPort {
  constructor(private repo: MerchantsRepository) {}

  async createMerchant(name: string, tx?: Prisma.TransactionClient) {
    return this.repo.createMerchant(name, tx);
  }

  async findById(merchantId: string, tx?: Prisma.TransactionClient) {
    return this.repo.findMerchantById(merchantId, tx);
  }

  async updateName(
    merchantId: string,
    name: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.repo.updateMerchantName(merchantId, name, tx);
  }
}
