// memverifikasi operasi CRUD CategoryRepository pada catalog module.
import { PrismaWriteService } from '@app/platform';
import { CategoryRepository, CategoryListFilter } from './category.repository';

function makeMockPrisma() {
  return {
    category: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
  } as unknown as PrismaWriteService;
}

describe('CategoryRepository', () => {
  let repo: CategoryRepository;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = makeMockPrisma();
    repo = new CategoryRepository(mockPrisma);
  });

  describe('findByIdInMerchant', () => {
    it('mengembalikan category jika milik merchant', async () => {
      const cat = { id: 'cat-001', merchantId: 'mch-001', name: 'Minuman' };
      (mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(cat);

      const result = await repo.findByIdInMerchant('cat-001', 'mch-001');

      expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-001', merchantId: 'mch-001' },
      });
      expect(result).toBe(cat);
    });
  });

  describe('findByNameInMerchant', () => {
    it('mencari category berdasarkan nama dalam merchant', async () => {
      (mockPrisma.category.findFirst as jest.Mock).mockResolvedValue({ id: 'cat-001', name: 'Minuman' });

      await repo.findByNameInMerchant('mch-001', 'Minuman');

      expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
        where: { merchantId: 'mch-001', name: 'Minuman' },
      });
    });
  });

  describe('create', () => {
    it('membuat category baru', async () => {
      const created = { id: 'cat-001', merchantId: 'mch-001', name: 'Minuman' };
      (mockPrisma.category.create as jest.Mock).mockResolvedValue(created);

      const result = await repo.create('mch-001', 'Minuman');

      expect(mockPrisma.category.create).toHaveBeenCalledWith({
        data: { merchantId: 'mch-001', name: 'Minuman' },
      });
      expect(result).toBe(created);
    });
  });

  describe('find', () => {
    it('mengembalikan daftar kategori dengan filter isActive', async () => {
      const filter: CategoryListFilter = { isActive: true };
      (mockPrisma.category.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repo.find('mch-001', filter, 0, 10);

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: { merchantId: 'mch-001', isActive: true },
        skip: 0,
        take: 10,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      });
      expect(result).toEqual([]);
    });
  });

  describe('count', () => {
    it('menghitung jumlah kategori berdasarkan filter', async () => {
      const filter: CategoryListFilter = {};
      (mockPrisma.category.count as jest.Mock).mockResolvedValue(3);

      const result = await repo.count('mch-001', filter);

      expect(mockPrisma.category.count).toHaveBeenCalledWith({
        where: { merchantId: 'mch-001', isActive: undefined },
      });
      expect(result).toBe(3);
    });
  });

  describe('update', () => {
    it('mengupdate category berdasarkan id', async () => {
      const data = { name: 'Makanan' };
      const updated = { id: 'cat-001', name: 'Makanan' };
      (mockPrisma.category.update as jest.Mock).mockResolvedValue(updated);

      const result = await repo.update('cat-001', data as never);

      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-001' },
        data,
      });
      expect(result).toBe(updated);
    });
  });
});
