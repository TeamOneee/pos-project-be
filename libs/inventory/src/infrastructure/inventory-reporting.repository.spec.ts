// memverifikasi query data operasional inventory dan low stock pada InventoryReportingRepository (FR-INV-007).
import { PrismaReadService } from '@app/platform';
import { InventoryReportingQuery } from '../application/ports/inventory-reporting-read.port';
import { InventoryReportingRepository } from './inventory-reporting.repository';

function makeMockPrismaRead() {
  return { inventory: { findMany: jest.fn() } } as unknown as PrismaReadService;
}

function makeQuery(
  overrides?: Partial<InventoryReportingQuery>,
): InventoryReportingQuery {
  return {
    merchantId: 'mch-001',
    ...overrides,
  };
}

describe('InventoryReportingRepository', () => {
  let repo: InventoryReportingRepository;
  let mockPrismaRead: ReturnType<typeof makeMockPrismaRead>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaRead = makeMockPrismaRead();
    repo = new InventoryReportingRepository(mockPrismaRead);
  });

  describe('getOperationalData', () => {
    it('menghitung inventoryItemCount, lowStockItemCount, outOfStockItemCount', async () => {
      (mockPrismaRead.inventory.findMany as jest.Mock).mockResolvedValue([
        {
          quantity: 0,
          lowStockThresholdOverride: null,
          product: { lowStockThreshold: 5 },
        }, // out of stock
        {
          quantity: 2,
          lowStockThresholdOverride: null,
          product: { lowStockThreshold: 5 },
        }, // low stock
        {
          quantity: 10,
          lowStockThresholdOverride: null,
          product: { lowStockThreshold: 5 },
        }, // normal
        {
          quantity: 3,
          lowStockThresholdOverride: 10,
          product: { lowStockThreshold: 5 },
        }, // low stock (override 10)
      ]);

      const result = await repo.getOperationalData(makeQuery());

      expect(result).toEqual({
        inventoryItemCount: 4,
        lowStockItemCount: 2,
        outOfStockItemCount: 1,
      });
    });

    it('menghitung benar jika semua stok aman', async () => {
      (mockPrismaRead.inventory.findMany as jest.Mock).mockResolvedValue([
        {
          quantity: 20,
          lowStockThresholdOverride: null,
          product: { lowStockThreshold: 5 },
        },
      ]);

      const result = await repo.getOperationalData(makeQuery());

      expect(result).toEqual({
        inventoryItemCount: 1,
        lowStockItemCount: 0,
        outOfStockItemCount: 0,
      });
    });

    it('menerapkan filter outletId jika disediakan', async () => {
      (mockPrismaRead.inventory.findMany as jest.Mock).mockResolvedValue([]);

      await repo.getOperationalData(makeQuery({ outletId: 'out-001' }));

      expect(mockPrismaRead.inventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ outletId: 'out-001' }),
        }),
      );
    });
  });

  describe('listLowStock', () => {
    it('mengembalikan item low stock diurutkan dari stok terendah (FR-INV-007)', async () => {
      (mockPrismaRead.inventory.findMany as jest.Mock).mockResolvedValue([
        {
          quantity: 3,
          lowStockThresholdOverride: null,
          outletId: 'out-001',
          productId: 'p-001',
          outlet: { name: 'Outlet A' },
          product: { name: 'Kopi', lowStockThreshold: 5 },
        },
        {
          quantity: 1,
          lowStockThresholdOverride: null,
          outletId: 'out-001',
          productId: 'p-002',
          outlet: { name: 'Outlet A' },
          product: { name: 'Teh', lowStockThreshold: 5 },
        },
        {
          quantity: 20,
          lowStockThresholdOverride: null,
          outletId: 'out-001',
          productId: 'p-003',
          outlet: { name: 'Outlet A' },
          product: { name: 'Roti', lowStockThreshold: 5 },
        },
      ]);

      const result = await repo.listLowStock(makeQuery());

      expect(result).toHaveLength(2);
      expect(result[0].quantity).toBe(1);
      expect(result[1].quantity).toBe(3);
      expect(result[0]).toEqual(
        expect.objectContaining({
          productId: 'p-002',
          name: 'Teh',
          outletName: 'Outlet A',
          baseLowStockThreshold: 5,
          effectiveLowStockThreshold: 5,
        }),
      );
    });

    it('menggunakan override threshold jika ada', async () => {
      (mockPrismaRead.inventory.findMany as jest.Mock).mockResolvedValue([
        {
          quantity: 8,
          lowStockThresholdOverride: 10,
          outletId: 'out-001',
          productId: 'p-001',
          outlet: { name: 'Outlet A' },
          product: { name: 'Kopi', lowStockThreshold: 5 },
        },
      ]);

      const result = await repo.listLowStock(makeQuery());

      expect(result).toHaveLength(1);
      expect(result[0].effectiveLowStockThreshold).toBe(10);
      expect(result[0].lowStockThresholdOverride).toBe(10);
    });

    it('mengembalikan array kosong jika tidak ada low stock', async () => {
      (mockPrismaRead.inventory.findMany as jest.Mock).mockResolvedValue([
        {
          quantity: 20,
          lowStockThresholdOverride: null,
          outletId: 'out-001',
          productId: 'p-001',
          outlet: { name: 'Outlet A' },
          product: { name: 'Kopi', lowStockThreshold: 5 },
        },
      ]);

      const result = await repo.listLowStock(makeQuery());
      expect(result).toEqual([]);
    });
  });
});
