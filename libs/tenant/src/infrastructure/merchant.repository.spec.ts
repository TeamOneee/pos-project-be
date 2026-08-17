// memverifikasi operasi CRUD MerchantRepository pada tenant module.
import { PrismaWriteService } from '@app/platform';
import { MerchantRepository } from './merchant.repository';

function makeMockPrisma() {
  return {
    merchant: { findUnique: jest.fn(), update: jest.fn() },
  } as unknown as PrismaWriteService;
}

describe('MerchantRepository', () => {
  let repo: MerchantRepository;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = makeMockPrisma();
    repo = new MerchantRepository(mockPrisma);
  });

  describe('findById', () => {
    it('mengembalikan merchant berdasarkan id', async () => {
      const merchant = { id: 'mch-001', name: 'Warung Budi' };
      (mockPrisma.merchant.findUnique as jest.Mock).mockResolvedValue(merchant);

      const result = await repo.findById('mch-001');

      expect(mockPrisma.merchant.findUnique).toHaveBeenCalledWith({ where: { id: 'mch-001' } });
      expect(result).toBe(merchant);
    });

    it('mengembalikan null jika merchant tidak ada', async () => {
      (mockPrisma.merchant.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repo.findById('mch-999');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('mengupdate merchant berdasarkan id', async () => {
      const data = { name: 'Warung Baru' };
      const updated = { id: 'mch-001', name: 'Warung Baru' };
      (mockPrisma.merchant.update as jest.Mock).mockResolvedValue(updated);

      const result = await repo.update('mch-001', data as never);

      expect(mockPrisma.merchant.update).toHaveBeenCalledWith({
        where: { id: 'mch-001' },
        data,
      });
      expect(result).toBe(updated);
    });
  });
});
