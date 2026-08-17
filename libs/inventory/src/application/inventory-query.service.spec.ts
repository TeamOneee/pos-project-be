import { AuthUser } from '@app/platform';
import { InventoryRepository } from '../infrastructure/inventory.repository';
import { InventoryQueryService } from './inventory-query.service';

const actor: AuthUser = {
  userId: 'owner-1',
  merchantId: 'merchant-1',
  role: 'OWNER',
  outletId: null,
};

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'inv-1',
  merchantId: 'merchant-1',
  outletId: 'outlet-1',
  productId: 'product-1',
  quantity: 3,
  lowStockThresholdOverride: null,
  updatedAt: new Date('2026-01-01'),
  product: { name: 'Es Teh', lowStockThreshold: 5 },
  outlet: { name: 'Outlet Pusat' },
  ...overrides,
});

const page = { page: 0, size: 20, skip: 0, take: 20 };

// memverifikasi pemetaan baris stok, threshold efektif, dan filter FR-INV-002/007.
describe('InventoryQueryService', () => {
  const inventoryRepo = { findByMerchantWithDetails: jest.fn() };
  let service: InventoryQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryQueryService(
      inventoryRepo as unknown as InventoryRepository,
    );
  });

  it('FR-INV-007: threshold efektif memakai override bila tersedia', async () => {
    inventoryRepo.findByMerchantWithDetails.mockResolvedValue([
      makeRow({ lowStockThresholdOverride: 2, quantity: 3 }),
    ]);
    const result = await service.list(actor, {}, page);
    expect(result.content[0]).toMatchObject({
      baseLowStockThreshold: 5,
      lowStockThresholdOverride: 2,
      effectiveLowStockThreshold: 2,
      isLowStock: false,
    });
  });

  it('FR-INV-007: fallback ke threshold dasar Product bila tanpa override', async () => {
    inventoryRepo.findByMerchantWithDetails.mockResolvedValue([
      makeRow({ quantity: 5 }),
    ]);
    const result = await service.list(actor, {}, page);
    expect(result.content[0]).toMatchObject({
      effectiveLowStockThreshold: 5,
      isLowStock: true,
    });
  });

  it('FR-INV-002: query selalu dibatasi Merchant actor', async () => {
    inventoryRepo.findByMerchantWithDetails.mockResolvedValue([
      makeRow({ outletId: 'outlet-1' }),
    ]);
    await service.list(
      actor,
      { outletId: 'outlet-1', productId: 'product-1' },
      page,
    );
    expect(inventoryRepo.findByMerchantWithDetails).toHaveBeenCalledWith(
      'merchant-1',
      { outletId: 'outlet-1', productId: 'product-1' },
    );
  });

  it('FR-INV-007: lowStockOnly hanya menyisakan stok rendah', async () => {
    inventoryRepo.findByMerchantWithDetails.mockResolvedValue([
      makeRow({ id: 'inv-low', quantity: 2, lowStockThresholdOverride: 5 }),
      makeRow({ id: 'inv-ok', quantity: 10, lowStockThresholdOverride: 5 }),
    ]);
    const result = await service.list(actor, { lowStockOnly: true }, page);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].id).toBe('inv-low');
  });

  it('menerapkan pagination pada hasil terfilter', async () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      makeRow({ id: `inv-${i}` }),
    );
    inventoryRepo.findByMerchantWithDetails.mockResolvedValue(rows);
    const result = await service.list(
      actor,
      {},
      { page: 1, size: 10, skip: 10, take: 10 },
    );
    expect(result.content).toHaveLength(10);
    expect(result.total_elements).toBe(25);
  });
});
