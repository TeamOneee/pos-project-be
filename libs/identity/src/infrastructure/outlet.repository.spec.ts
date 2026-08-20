// memverifikasi query outlet aktif milik merchant pada identity module (FR-TEN-005/006).
import { PrismaReadService } from '@app/platform';
import { OutletRepository } from './outlet.repository';

function makeMockPrisma() {
  return { outlet: { findFirst: jest.fn() } } as unknown as PrismaReadService;
}

describe('OutletRepository', () => {
  let repo: OutletRepository;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = makeMockPrisma();
    repo = new OutletRepository(mockPrisma);
  });

  describe('findActiveInMerchant', () => {
    it('mengembalikan outlet jika status ACTIVE dan milik merchant', async () => {
      const outlet = { id: 'out-001', merchantId: 'mch-001', status: 'ACTIVE' };
      (mockPrisma.outlet.findFirst as jest.Mock).mockResolvedValue(outlet);

      const result = await repo.findActiveInMerchant('out-001', 'mch-001');

      expect(mockPrisma.outlet.findFirst).toHaveBeenCalledWith({
        where: { id: 'out-001', merchantId: 'mch-001', status: 'ACTIVE' },
      });
      expect(result).toBe(outlet);
    });

    it('mengembalikan null jika outlet tidak ditemukan', async () => {
      (mockPrisma.outlet.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repo.findActiveInMerchant('out-999', 'mch-001');

      expect(result).toBeNull();
    });
  });
});
