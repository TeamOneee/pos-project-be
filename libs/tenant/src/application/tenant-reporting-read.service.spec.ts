import { AccountStatus, Merchant, Outlet } from '@prisma/client';
import { TenantReportingReadService } from './tenant-reporting-read.service';
import { TenantReportingRepository } from '../infrastructure/tenant-reporting.repository';

const merchant = (): Merchant => ({
  id: 'merchant-1',
  ownerUserId: 'owner-1',
  name: 'Merchant',
  timezone: 'Asia/Jakarta',
  status: AccountStatus.ACTIVE,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-02T00:00:00.000Z'),
});

const outlet = (status: AccountStatus = AccountStatus.ACTIVE): Outlet => ({
  id: 'outlet-1',
  merchantId: 'merchant-1',
  name: 'Outlet A',
  address: null,
  status,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-03T00:00:00.000Z'),
});

// memverifikasi context timezone dan outlet tetap terisolasi per merchant.
describe('TenantReportingReadService', () => {
  const repository = {
    findActiveMerchant: jest.fn(),
    findOutlets: jest.fn(),
  };
  const service = new TenantReportingReadService(
    repository as unknown as TenantReportingRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it('FR-REP-004/009: mengembalikan timezone dan outlet aktif merchant', async () => {
    repository.findActiveMerchant.mockResolvedValue(merchant());
    repository.findOutlets.mockResolvedValue([outlet()]);
    const result = await service.getContext('merchant-1');
    expect(result).toMatchObject({
      timezone: 'Asia/Jakarta',
    });
    expect(result.outlets).toHaveLength(1);
  });

  it('menyertakan outlet nonaktif agar histori dan analytics owner tidak hilang', async () => {
    repository.findActiveMerchant.mockResolvedValue(merchant());
    repository.findOutlets.mockResolvedValue([outlet(AccountStatus.INACTIVE)]);
    const result = await service.getContext('merchant-1');
    expect(result.outlets).toEqual([{ id: 'outlet-1', name: 'Outlet A' }]);
  });

  it('FR-REP-009: menyamarkan outlet lintas merchant sebagai not found', async () => {
    repository.findActiveMerchant.mockResolvedValue(merchant());
    repository.findOutlets.mockResolvedValue([]);
    await expect(
      service.getContext('merchant-1', 'outlet-other'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(repository.findOutlets).toHaveBeenCalledWith(
      'merchant-1',
      'outlet-other',
    );
  });
});
