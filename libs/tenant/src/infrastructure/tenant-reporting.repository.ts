import { Injectable } from '@nestjs/common';
import { Merchant, Outlet } from '@prisma/client';
import { PrismaReadService } from '@app/platform';

// repository pembacaan merchant dan outlet dari read replica untuk modul reporting.
@Injectable()
export class TenantReportingRepository {
  constructor(private readonly prisma: PrismaReadService) {}

  // membaca merchant berstatus active dari read replica.
  findActiveMerchant(merchantId: string): Promise<Merchant | null> {
    return this.prisma.merchant.findFirst({
      where: { id: merchantId, status: 'ACTIVE' },
    });
  }

  // membaca seluruh outlet merchant tanpa filter status agar data analitik historis tidak hilang.
  findOutlets(merchantId: string, outletId?: string): Promise<Outlet[]> {
    return this.prisma.outlet.findMany({
      where: { merchantId, id: outletId },
      orderBy: { name: 'asc' },
    });
  }
}
