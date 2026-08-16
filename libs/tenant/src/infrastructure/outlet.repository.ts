import { Injectable } from '@nestjs/common';
import { AccountStatus, Outlet, Prisma } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';

export interface CreateOutletData {
  merchantId: string;
  name: string;
  address: string | null;
}

export interface OutletListFilter {
  status?: AccountStatus;
}

@Injectable()
export class OutletRepository {
  constructor(private readonly prisma: PrismaWriteService) {}

  findByIdInMerchant(
    outletId: string,
    merchantId: string,
  ): Promise<Outlet | null> {
    return this.prisma.outlet.findFirst({
      where: { id: outletId, merchantId },
    });
  }

  create(data: CreateOutletData): Promise<Outlet> {
    return this.prisma.outlet.create({ data });
  }

  find(
    merchantId: string,
    filter: OutletListFilter,
    skip: number,
    take: number,
  ): Promise<Outlet[]> {
    return this.prisma.outlet.findMany({
      where: { merchantId, status: filter.status },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  count(merchantId: string, filter: OutletListFilter): Promise<number> {
    return this.prisma.outlet.count({
      where: { merchantId, status: filter.status },
    });
  }

  update(
    outletId: string,
    data: Prisma.OutletUncheckedUpdateInput,
  ): Promise<Outlet> {
    return this.prisma.outlet.update({ where: { id: outletId }, data });
  }
}
