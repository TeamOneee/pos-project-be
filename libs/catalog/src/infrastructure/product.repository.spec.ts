// memverifikasi operasi CRUD ProductRepository pada catalog module (FR-CAT-001/002).
import { PrismaWriteService } from '@app/platform';
import { ProductRepository, ProductListFilter } from './product.repository';

function makeMockPrisma() {
  return {
    product: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaWriteService;
}

describe('ProductRepository', () => {
  let repo: ProductRepository;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = makeMockPrisma();
    repo = new ProductRepository(mockPrisma);
  });

  describe('create', () => {
    it('membuat produk baru dengan include category', async () => {
      const data = {
        merchantId: 'mch-001',
        name: 'Kopi Susu',
        categoryId: 'cat-001',
        basePrice: '25000',
      };
      const created = {
        id: 'p-001',
        ...data,
        category: { id: 'cat-001', name: 'Minuman' },
      };
      (mockPrisma.product.create as jest.Mock).mockResolvedValue(created);

      const result = await repo.create(data as never);

      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data,
        include: { category: true },
      });
      expect(result).toBe(created);
    });
  });

  describe('findByIdInMerchant', () => {
    it('mengembalikan produk dengan category jika milik merchant', async () => {
      const product = {
        id: 'p-001',
        merchantId: 'mch-001',
        category: { id: 'cat-001' },
      };
      (mockPrisma.product.findFirst as jest.Mock).mockResolvedValue(product);

      const result = await repo.findByIdInMerchant('p-001', 'mch-001');

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'p-001', merchantId: 'mch-001' },
        include: { category: true },
      });
      expect(result).toBe(product);
    });

    it('mengembalikan null jika tidak ditemukan', async () => {
      (mockPrisma.product.findFirst as jest.Mock).mockResolvedValue(null);
      const result = await repo.findByIdInMerchant('p-999', 'mch-001');
      expect(result).toBeNull();
    });
  });

  describe('findByIdsInMerchant', () => {
    it('mengembalikan produk berdasarkan array id', async () => {
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repo.findByIdsInMerchant(
        ['p-001', 'p-002'],
        'mch-001',
      );

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['p-001', 'p-002'] }, merchantId: 'mch-001' },
        include: { category: true },
      });
      expect(result).toEqual([]);
    });

    it('mengembalikan array kosong jika productIds kosong', async () => {
      const result = await repo.findByIdsInMerchant([], 'mch-001');
      expect(result).toEqual([]);
      expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
    });
  });

  describe('find', () => {
    it('mengembalikan daftar produk dengan filter search dan categoryId', async () => {
      const filter: ProductListFilter = {
        search: 'kopi',
        categoryId: 'cat-001',
        isActive: true,
      };
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repo.find('mch-001', filter, 0, 10);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          merchantId: 'mch-001',
          categoryId: 'cat-001',
          isActive: true,
          name: { contains: 'kopi', mode: 'insensitive' },
        },
        include: { category: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 10,
      });
      expect(result).toEqual([]);
    });

    it('tidak menambahkan filter name jika search kosong', async () => {
      const filter: ProductListFilter = {};
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([]);

      await repo.find('mch-001', filter, 0, 10);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ name: expect.anything() }),
        }),
      );
    });
  });

  describe('count', () => {
    it('menghitung jumlah produk berdasarkan filter', async () => {
      const filter: ProductListFilter = { isActive: true };
      (mockPrisma.product.count as jest.Mock).mockResolvedValue(8);

      const result = await repo.count('mch-001', filter);

      expect(mockPrisma.product.count).toHaveBeenCalledWith({
        where: { merchantId: 'mch-001', categoryId: undefined, isActive: true },
      });
      expect(result).toBe(8);
    });
  });

  describe('update', () => {
    it('mengupdate produk berdasarkan id dengan include category', async () => {
      const data = { name: 'Kopi Susu V2' };
      const updated = {
        id: 'p-001',
        name: 'Kopi Susu V2',
        category: { id: 'cat-001' },
      };
      (mockPrisma.product.update as jest.Mock).mockResolvedValue(updated);

      const result = await repo.update('p-001', data);

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p-001' },
        data,
        include: { category: true },
      });
      expect(result).toBe(updated);
    });
  });
});
