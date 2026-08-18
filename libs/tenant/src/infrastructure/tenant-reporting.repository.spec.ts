// memverifikasi query merchant aktif dan outlet pada TenantReportingRepository (FR-REP-004/009).
import { PrismaReadService } from '@app/platform';
import { TenantReportingRepository } from './tenant-reporting.repository';

function makeMockPrismaRead() {
  return {
    merchant: { findFirst: jest.fn() },
    outlet: { findMany: jest.fn() },
  } as unknown as PrismaReadService;
}

describe('TenantReportingRepository', () => {
  let repo: TenantReportingRepository;
  let mockPrismaRead: ReturnType<typeof makeMockPrismaRead>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaRead = makeMockPrismaRead();
    repo = new TenantReportingRepository(mockPrismaRead);
  });

  describe('findActiveMerchant', () => {
    it('mengembalikan merchant berstatus ACTIVE', async () => {
      const merchant = { id: 'mch-001', status: 'ACTIVE', name: 'Warung Budi' };
      (mockPrismaRead.merchant.findFirst as jest.Mock).mockResolvedValue(
        merchant,
      );

      const result = await repo.findActiveMerchant('mch-001');

      expect(mockPrismaRead.merchant.findFirst).toHaveBeenCalledWith({
        where: { id: 'mch-001', status: 'ACTIVE' },
      });
      expect(result).toBe(merchant);
    });

    it('mengembalikan null jika merchant tidak aktif', async () => {
      (mockPrismaRead.merchant.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repo.findActiveMerchant('mch-999');
      expect(result).toBeNull();
    });
  });

  describe('findOutlets', () => {
    it('mengembalikan semua outlet merchant (tanpa filter status)', async () => {
      const outlets = [
        { id: 'out-001', name: 'Outlet A' },
        { id: 'out-002', name: 'Outlet B' },
      ];
      (mockPrismaRead.outlet.findMany as jest.Mock).mockResolvedValue(outlets);

      const result = await repo.findOutlets('mch-001');

      expect(mockPrismaRead.outlet.findMany).toHaveBeenCalledWith({
        where: { merchantId: 'mch-001', id: undefined },
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(2);
    });

    it('menerapkan filter outletId jika disediakan', async () => {
      (mockPrismaRead.outlet.findMany as jest.Mock).mockResolvedValue([]);

      await repo.findOutlets('mch-001', 'out-001');

      expect(mockPrismaRead.outlet.findMany).toHaveBeenCalledWith({
        where: { merchantId: 'mch-001', id: 'out-001' },
        orderBy: { name: 'asc' },
      });
    });

    it('mengembalikan array kosong jika tidak ada outlet', async () => {
      (mockPrismaRead.outlet.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repo.findOutlets('mch-001');
      expect(result).toEqual([]);
    });
  });
});
