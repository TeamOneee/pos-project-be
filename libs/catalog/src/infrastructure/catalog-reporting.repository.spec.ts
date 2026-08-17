// memverifikasi query katalog produk dan summary pada CatalogReportingRepository.
import { PrismaReadService } from '@app/platform';
import { CatalogReportingRepository } from './catalog-reporting.repository';

function makeMockPrismaRead() {
  return {
    product: { findMany: jest.fn(), count: jest.fn() },
    category: { count: jest.fn() },
  } as unknown as PrismaReadService;
}

describe('CatalogReportingRepository', () => {
  let repo: CatalogReportingRepository;
  let mockPrismaRead: ReturnType<typeof makeMockPrismaRead>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaRead = makeMockPrismaRead();
    repo = new CatalogReportingRepository(mockPrismaRead);
  });

  describe('findSellableProducts', () => {
    it('mengembalikan produk aktif dengan kategori aktif milik merchant', async () => {
      const products = [{ id: 'p-1', name: 'Kopi Susu' }, { id: 'p-2', name: 'Teh Manis' }];
      (mockPrismaRead.product.findMany as jest.Mock).mockResolvedValue(products);

      const result = await repo.findSellableProducts('mch-001');

      expect(mockPrismaRead.product.findMany).toHaveBeenCalledWith({
        where: { merchantId: 'mch-001', isActive: true, category: { isActive: true } },
        select: { id: true, name: true },
        orderBy: { id: 'asc' },
      });
      expect(result).toHaveLength(2);
    });

    it('mengembalikan array kosong jika tidak ada produk sellable', async () => {
      (mockPrismaRead.product.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repo.findSellableProducts('mch-999');
      expect(result).toEqual([]);
    });
  });

  describe('findCatalogSummary', () => {
    it('menghitung activeProductCount, inactiveProductCount, inactiveCategoryCount', async () => {
      (mockPrismaRead.product.count as jest.Mock)
        .mockResolvedValueOnce(5)  // active
        .mockResolvedValueOnce(2); // inactive
      (mockPrismaRead.category.count as jest.Mock).mockResolvedValue(1);

      const result = await repo.findCatalogSummary('mch-001');

      expect(result).toEqual({
        activeProductCount: 5,
        inactiveProductCount: 2,
        inactiveCategoryCount: 1,
      });
    });
  });
});
