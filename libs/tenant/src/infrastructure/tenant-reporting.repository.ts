import { Injectable } from '@nestjs/common';
import { Merchant, Outlet } from '@prisma/client';
import { PrismaReadService } from '@app/platform';

@Injectable()
// membaca merchant dan outlet dari read replica untuk dashboard reporting.
export class TenantReportingRepository {
  constructor(private readonly prisma: PrismaReadService) {}

  findActiveMerchant(merchantId: string): Promise<Merchant | null> {
    return this.prisma.merchant.findFirst({
      where: { id: merchantId, status: 'ACTIVE' },
    });
  }

  findOutlets(merchantId: string, outletId?: string): Promise<Outlet[]> {
    // sengaja tanpa filter status agar outlet tertutup tetap muncul pada analytics historis.
    return this.prisma.outlet.findMany({
      where: { merchantId, id: outletId },
      orderBy: { name: 'asc' },
    });
  }
}
