// memverifikasi operasi CRUD StockMovementRepository pada inventory module (FR-INV-003).
import { StockMovementType } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';
import { StockMovementRepository, StockMovementListFilter } from './stock-movement.repository';

function makeMockPrisma() {
  return {
    stockMovement: { findMany: jest.fn(), count: jest.fn() },
  } as unknown as PrismaWriteService;
}

function makeMockTx() {
  return {
    stockMovement: { create: jest.fn(), createMany: jest.fn() },
  } as { stockMovement: { create: jest.Mock; createMany: jest.Mock } };
}

describe('StockMovementRepository', () => {
  let repo: StockMovementRepository;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = makeMockPrisma();
    repo = new StockMovementRepository(mockPrisma);
  });

  describe('create', () => {
    it('membuat stock movement baru dari tx client', async () => {
      const mockTx = makeMockTx();
      const data = { merchantId: 'mch-001', outletId: 'out-001', productId: 'p-001', type: 'SALE' as StockMovementType, quantity: -2, referenceId: 'txn-001' };
      const created = { id: 'sm-001', ...data };
      (mockTx.stockMovement.create as jest.Mock).mockResolvedValue(created);

      const result = await repo.create(mockTx as never, data as never);

      expect(mockTx.stockMovement.create).toHaveBeenCalledWith({ data });
      expect(result).toBe(created);
    });
  });

  describe('createMany', () => {
    it('membuat beberapa stock movement sekaligus', async () => {
      const mockTx = makeMockTx();
      const data = [
        { merchantId: 'mch-001', outletId: 'out-001', productId: 'p-001', type: 'SALE' as StockMovementType, quantity: -2, referenceId: 'txn-001' },
        { merchantId: 'mch-001', outletId: 'out-001', productId: 'p-002', type: 'SALE' as StockMovementType, quantity: -1, referenceId: 'txn-001' },
      ];
      (mockTx.stockMovement.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await repo.createMany(mockTx as never, data as never);

      expect(mockTx.stockMovement.createMany).toHaveBeenCalledWith({ data });
      expect(result).toEqual({ count: 2 });
    });
  });

  describe('findByMerchant', () => {
    it('mengembalikan daftar stock movement dengan filter dan order by desc', async () => {
      const filter: StockMovementListFilter = { outletId: 'out-001', type: 'SALE' };
      (mockPrisma.stockMovement.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repo.findByMerchant('mch-001', filter, 0, 10);

      expect(mockPrisma.stockMovement.findMany).toHaveBeenCalledWith({
        where: { merchantId: 'mch-001', outletId: 'out-001', type: 'SALE' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual([]);
    });

    it('menerapkan filter dateFrom dan dateTo', async () => {
      const filter: StockMovementListFilter = { dateFrom: '2026-08-01', dateTo: '2026-08-31' };
      (mockPrisma.stockMovement.findMany as jest.Mock).mockResolvedValue([]);

      await repo.findByMerchant('mch-001', filter, 0, 10);

      expect(mockPrisma.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2026-08-01'),
              lte: new Date('2026-08-31'),
            },
          }),
        }),
      );
    });
  });

  describe('countByMerchant', () => {
    it('menghitung jumlah stock movement berdasarkan filter', async () => {
      const filter: StockMovementListFilter = { productId: 'p-001' };
      (mockPrisma.stockMovement.count as jest.Mock).mockResolvedValue(15);

      const result = await repo.countByMerchant('mch-001', filter);

      expect(mockPrisma.stockMovement.count).toHaveBeenCalledWith({
        where: { merchantId: 'mch-001', productId: 'p-001' },
      });
      expect(result).toBe(15);
    });
  });
});
