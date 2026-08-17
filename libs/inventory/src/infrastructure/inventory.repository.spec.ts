// memverifikasi operasi CRUD InventoryRepository pada inventory module (FR-INV-001/004).
import { Prisma } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';
import { InventoryRepository, InventoryListFilter } from './inventory.repository';

function makeMockPrisma() {
  return {
    inventory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  } as unknown as PrismaWriteService;
}

function makeMockTx() {
  return {
    inventory: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  } as { inventory: { findUnique: jest.Mock; create: jest.Mock; upsert: jest.Mock; updateMany: jest.Mock }; $queryRaw: jest.Mock };
}

describe('InventoryRepository', () => {
  let repo: InventoryRepository;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = makeMockPrisma();
    repo = new InventoryRepository(mockPrisma);
  });

  describe('findByMerchantWithDetails', () => {
    it('mengembalikan inventory dengan product dan outlet details', async () => {
      const items = [{ id: 'inv-1', quantity: 10, product: { name: 'Kopi', lowStockThreshold: 5 }, outlet: { name: 'Outlet A' } }];
      (mockPrisma.inventory.findMany as jest.Mock).mockResolvedValue(items);

      const result = await repo.findByMerchantWithDetails('mch-001', {});

      expect(mockPrisma.inventory.findMany).toHaveBeenCalledWith({
        where: { merchantId: 'mch-001' },
        include: {
          product: { select: { name: true, lowStockThreshold: true } },
          outlet: { select: { name: true } },
        },
      });
      expect(result).toHaveLength(1);
    });

    it('menerapkan filter outletId dan productId jika disediakan', async () => {
      (mockPrisma.inventory.findMany as jest.Mock).mockResolvedValue([]);

      await repo.findByMerchantWithDetails('mch-001', { outletId: 'out-001', productId: 'p-001' });

      expect(mockPrisma.inventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { merchantId: 'mch-001', outletId: 'out-001', productId: 'p-001' },
        }),
      );
    });
  });

  describe('findInOutlet', () => {
    it('mengembalikan semua inventory dalam outlet', async () => {
      (mockPrisma.inventory.findMany as jest.Mock).mockResolvedValue([]);

      await repo.findInOutlet('mch-001', 'out-001');

      expect(mockPrisma.inventory.findMany).toHaveBeenCalledWith({
        where: { merchantId: 'mch-001', outletId: 'out-001' },
      });
    });
  });

  describe('findByOutletAndProduct', () => {
    it('mengembalikan inventory dari tx client', async () => {
      const mockTx = makeMockTx();
      (mockTx.inventory.findUnique as jest.Mock).mockResolvedValue({ id: 'inv-1', quantity: 5 });

      const result = await repo.findByOutletAndProduct(mockTx as never, 'out-001', 'p-001');

      expect(mockTx.inventory.findUnique).toHaveBeenCalledWith({
        where: { outletId_productId: { outletId: 'out-001', productId: 'p-001' } },
      });
      expect(result).toEqual({ id: 'inv-1', quantity: 5 });
    });
  });

  describe('create', () => {
    it('membuat inventory baru dari tx client', async () => {
      const mockTx = makeMockTx();
      const data = { merchantId: 'mch-001', outletId: 'out-001', productId: 'p-001', quantity: 10 };
      const created = { id: 'inv-1', ...data };
      (mockTx.inventory.create as jest.Mock).mockResolvedValue(created);

      const result = await repo.create(mockTx as never, data as never);

      expect(mockTx.inventory.create).toHaveBeenCalledWith({ data });
      expect(result).toBe(created);
    });
  });

  describe('upsertThreshold', () => {
    it('membuat atau update threshold pada inventory', async () => {
      const mockTx = makeMockTx();
      const data = { merchantId: 'mch-001', outletId: 'out-001', productId: 'p-001', threshold: 5 };
      const result = { id: 'inv-1', lowStockThresholdOverride: 5, product: { name: 'Kopi', lowStockThreshold: 10 }, outlet: { name: 'A' } };
      (mockTx.inventory.upsert as jest.Mock).mockResolvedValue(result);

      const output = await repo.upsertThreshold(mockTx as never, data);

      expect(mockTx.inventory.upsert).toHaveBeenCalledWith({
        where: { outletId_productId: { outletId: 'out-001', productId: 'p-001' } },
        create: { merchantId: 'mch-001', outletId: 'out-001', productId: 'p-001', quantity: 0, lowStockThresholdOverride: 5 },
        update: { lowStockThresholdOverride: 5 },
        include: {
          product: { select: { name: true, lowStockThreshold: true } },
          outlet: { select: { name: true } },
        },
      });
      expect(output).toBe(result);
    });
  });

  describe('clearThreshold', () => {
    it('menghapus lowStockThresholdOverride', async () => {
      const mockTx = makeMockTx();
      (mockTx.inventory.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await repo.clearThreshold(mockTx as never, 'mch-001', 'out-001', 'p-001');

      expect(mockTx.inventory.updateMany).toHaveBeenCalledWith({
        where: { merchantId: 'mch-001', outletId: 'out-001', productId: 'p-001' },
        data: { lowStockThresholdOverride: null },
      });
      expect(result).toEqual({ count: 1 });
    });
  });

  describe('updateQuantityConditional', () => {
    it('mengembalikan quantityBefore dan quantityAfter jika update berhasil (FR-INV-004)', async () => {
      const mockTx = makeMockTx();
      (mockTx.$queryRaw as jest.Mock).mockResolvedValue([
        { quantity_before: 10, quantity_after: 8 },
      ]);

      const result = await repo.updateQuantityConditional(mockTx as never, {
        inventoryId: 'inv-1',
        delta: -2,
      });

      expect(result).toEqual({ quantityBefore: 10, quantityAfter: 8 });
      expect(mockTx.$queryRaw).toHaveBeenCalled();
    });

    it('mengembalikan null jika saldo akan negatif', async () => {
      const mockTx = makeMockTx();
      (mockTx.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await repo.updateQuantityConditional(mockTx as never, {
        inventoryId: 'inv-1',
        delta: -100,
      });

      expect(result).toBeNull();
    });
  });

  describe('bulkUpdateQuantityConditional', () => {
    it('mengembalikan array kosong jika lines kosong', async () => {
      const mockTx = makeMockTx();

      const result = await repo.bulkUpdateQuantityConditional(mockTx as never, {
        merchantId: 'mch-001',
        outletId: 'out-001',
        lines: [],
      });

      expect(result).toEqual([]);
      expect(mockTx.$queryRaw).not.toHaveBeenCalled();
    });

    it('melakukan bulk update untuk beberapa line', async () => {
      const mockTx = makeMockTx();
      (mockTx.$queryRaw as jest.Mock).mockResolvedValue([
        { product_id: 'p-001', quantity_before: 10, quantity_after: 8 },
        { product_id: 'p-002', quantity_before: 5, quantity_after: 3 },
      ]);

      const result = await repo.bulkUpdateQuantityConditional(mockTx as never, {
        merchantId: 'mch-001',
        outletId: 'out-001',
        lines: [{ productId: 'p-001', delta: -2 }, { productId: 'p-002', delta: -2 }],
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ productId: 'p-001', quantityBefore: 10, quantityAfter: 8 });
      expect(mockTx.$queryRaw).toHaveBeenCalled();
    });
  });
});
