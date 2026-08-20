import { Injectable } from '@nestjs/common';
import { ApiError } from '@app/platform';
import { TenantReportingRepository } from '../infrastructure/tenant-reporting.repository';
import {
  TenantReportingContext,
  TenantReportingReadPort,
} from './ports/tenant-reporting-read.port';

// membaca konteks tenant (timezone merchant dan daftar outlet) untuk pelaporan.
@Injectable()
export class TenantReportingReadService extends TenantReportingReadPort {
  constructor(private readonly repository: TenantReportingRepository) {
    super();
  }

  // mengambil timezone dan outlet merchant; outlet nonaktif tetap dimuat untuk riwayat historis.
  async getContext(
    merchantId: string,
    outletId?: string,
  ): Promise<TenantReportingContext> {
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
