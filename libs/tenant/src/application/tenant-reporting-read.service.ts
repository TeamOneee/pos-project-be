import { Injectable } from '@nestjs/common';
import { ApiError } from '@app/platform';
import { TenantReportingRepository } from '../infrastructure/tenant-reporting.repository';
import {
  TenantReportingContext,
  TenantReportingReadPort,
} from './ports/tenant-reporting-read.port';

@Injectable()
// membatasi context reporting pada merchant sambil mempertahankan histori outlet.
export class TenantReportingReadService extends TenantReportingReadPort {
  constructor(private readonly repository: TenantReportingRepository) {
    super();
  }

  async getContext(
    merchantId: string,
    outletId?: string,
  ): Promise<TenantReportingContext> {
    // outlet nonaktif tetap diload karena Owner dapat membaca histori dan analyticsnya.
    // menyamarkan merchant tidak aktif atau tidak ditemukan sebagai resource absent.
    const [merchant, outlets] = await Promise.all([
      this.repository.findActiveMerchant(merchantId),
      this.repository.findOutlets(merchantId, outletId),
    ]);
    if (!merchant) {
      throw ApiError.notFound('Merchant tidak ditemukan.');
    }
    if (outletId && outlets.length === 0) {
      throw ApiError.notFound('Outlet tidak ditemukan.');
    }
    return {
      timezone: merchant.timezone,
      outlets: outlets.map((outlet) => ({
        id: outlet.id,
        name: outlet.name,
      })),
    };
  }
}
