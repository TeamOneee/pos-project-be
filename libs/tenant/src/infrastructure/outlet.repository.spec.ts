// memverifikasi operasi CRUD OutletRepository pada tenant module (DR-007, FR-TEN-004/008).
import { PrismaWriteService } from '@app/platform';
import {
  OutletRepository,
  CreateOutletData,
  OutletListFilter,
} from './outlet.repository';

function makeMockPrisma() {
  return {
    outlet: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaWriteService;
}

describe('OutletRepository', () => {
  let repo: OutletRepository;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = makeMockPrisma();
    repo = new OutletRepository(mockPrisma);
  });

  describe('findByIdInMerchant', () => {
    it('mengembalikan outlet jika milik merchant', async () => {
      const outlet = { id: 'out-001', merchantId: 'mch-001' };
      (mockPrisma.outlet.findFirst as jest.Mock).mockResolvedValue(outlet);

      const result = await repo.findByIdInMerchant('out-001', 'mch-001');

      expect(mockPrisma.outlet.findFirst).toHaveBeenCalledWith({
        where: { id: 'out-001', merchantId: 'mch-001' },
      });
      expect(result).toBe(outlet);
    });

    it('mengembalikan null jika outlet tidak ada', async () => {
      (mockPrisma.outlet.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repo.findByIdInMerchant('out-999', 'mch-001');
      expect(result).toBeNull();
    });
  });

  describe('findByNameInMerchant', () => {
    it('mencari outlet berdasarkan nama dalam merchant', async () => {
      (mockPrisma.outlet.findFirst as jest.Mock).mockResolvedValue({
        id: 'out-001',
        name: 'Outlet A',
      });

      await repo.findByNameInMerchant('Outlet A', 'mch-001');

      expect(mockPrisma.outlet.findFirst).toHaveBeenCalledWith({
        where: { merchantId: 'mch-001', name: 'Outlet A', id: undefined },
      });
    });

    it('DR-007: mengecualikan outlet tertentu saat rename (excludeOutletId)', async () => {
      (mockPrisma.outlet.findFirst as jest.Mock).mockResolvedValue(null);

      await repo.findByNameInMerchant('Outlet A', 'mch-001', 'out-001');

      expect(mockPrisma.outlet.findFirst).toHaveBeenCalledWith({
        where: {
          merchantId: 'mch-001',
          name: 'Outlet A',
          id: { not: 'out-001' },
        },
      });
    });
  });

  describe('create', () => {
    it('membuat outlet baru', async () => {
      const data: CreateOutletData = {
        merchantId: 'mch-001',
        name: 'Outlet A',
        address: null,
      };
      const created = { id: 'out-001', ...data };
      (mockPrisma.outlet.create as jest.Mock).mockResolvedValue(created);

      const result = await repo.create(data);

      expect(mockPrisma.outlet.create).toHaveBeenCalledWith({ data });
      expect(result).toBe(created);
    });
  });

  describe('find', () => {
    it('mengembalikan daftar outlet dengan filter status', async () => {
      const filter: OutletListFilter = { status: 'ACTIVE' };
      (mockPrisma.outlet.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repo.find('mch-001', filter, 0, 10);

      expect(mockPrisma.outlet.findMany).toHaveBeenCalledWith({
        where: { merchantId: 'mch-001', status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual([]);
    });
  });

  describe('count', () => {
    it('menghitung jumlah outlet berdasarkan filter', async () => {
      const filter: OutletListFilter = { status: 'ACTIVE' };
      (mockPrisma.outlet.count as jest.Mock).mockResolvedValue(3);

      const result = await repo.count('mch-001', filter);

      expect(mockPrisma.outlet.count).toHaveBeenCalledWith({
        where: { merchantId: 'mch-001', status: 'ACTIVE' },
      });
      expect(result).toBe(3);
    });
  });

  describe('update', () => {
    it('mengupdate outlet berdasarkan id', async () => {
      const data = { name: 'Outlet Baru' };
      const updated = { id: 'out-001', name: 'Outlet Baru' };
      (mockPrisma.outlet.update as jest.Mock).mockResolvedValue(updated);

      const result = await repo.update('out-001', data);

      expect(mockPrisma.outlet.update).toHaveBeenCalledWith({
        where: { id: 'out-001' },
        data,
      });
      expect(result).toBe(updated);
    });
  });
});
