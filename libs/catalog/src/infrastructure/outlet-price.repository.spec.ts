// memverifikasi query dan upsert OutletPriceRepository pada catalog module.
import { Prisma } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';
import { OutletPriceRepository } from './outlet-price.repository';

function makeMockPrisma() {
  return {
    productOutletPrice: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  } as unknown as PrismaWriteService;
}

describe('OutletPriceRepository', () => {
  let repo: OutletPriceRepository;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = makeMockPrisma();
    repo = new OutletPriceRepository(mockPrisma);
  });

  describe('findByOutletAndProductIds', () => {
    it('mengembalikan harga override berdasarkan outlet dan productIds', async () => {
      const prices = [
        {
          id: 'pop-001',
          productId: 'p-001',
          outletId: 'out-001',
          price: new Prisma.Decimal('12000'),
        },
      ];
      (mockPrisma.productOutletPrice.findMany as jest.Mock).mockResolvedValue(
        prices,
      );

      const result = await repo.findByOutletAndProductIds(
        'mch-001',
        'out-001',
        ['p-001', 'p-002'],
      );

      expect(mockPrisma.productOutletPrice.findMany).toHaveBeenCalledWith({
        where: {
          merchantId: 'mch-001',
          outletId: 'out-001',
          productId: { in: ['p-001', 'p-002'] },
        },
      });
      expect(result).toHaveLength(1);
    });

    it('mengembalikan array kosong jika productIds kosong', async () => {
      const result = await repo.findByOutletAndProductIds(
        'mch-001',
        'out-001',
        [],
      );
      expect(result).toEqual([]);
      expect(mockPrisma.productOutletPrice.findMany).not.toHaveBeenCalled();
    });
  });

  describe('upsert', () => {
    it('membuat atau update harga override', async () => {
      const upserted = { id: 'pop-001', price: new Prisma.Decimal('15000') };
      (mockPrisma.productOutletPrice.upsert as jest.Mock).mockResolvedValue(
        upserted,
      );

      const result = await repo.upsert(
        'mch-001',
        'out-001',
        'p-001',
        new Prisma.Decimal('15000'),
      );

      expect(mockPrisma.productOutletPrice.upsert).toHaveBeenCalledWith({
        where: {
          outletId_productId: { outletId: 'out-001', productId: 'p-001' },
        },
        create: {
          merchantId: 'mch-001',
          outletId: 'out-001',
          productId: 'p-001',
          price: new Prisma.Decimal('15000'),
        },
        update: { price: new Prisma.Decimal('15000') },
      });
      expect(result).toBe(upserted);
    });
  });

  describe('delete', () => {
    it('mengembalikan true jika berhasil menghapus', async () => {
      (mockPrisma.productOutletPrice.deleteMany as jest.Mock).mockResolvedValue(
        { count: 1 },
      );

      const result = await repo.delete('mch-001', 'out-001', 'p-001');

      expect(result).toBe(true);
    });

    it('mengembalikan false jika tidak ada yang terhapus', async () => {
      (mockPrisma.productOutletPrice.deleteMany as jest.Mock).mockResolvedValue(
        { count: 0 },
      );

      const result = await repo.delete('mch-001', 'out-001', 'p-999');

      expect(result).toBe(false);
    });
  });
});
