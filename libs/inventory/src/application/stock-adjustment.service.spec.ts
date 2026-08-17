import { AuthUser, PrismaWriteService } from '@app/platform';
import { TenantAuthorizationService } from '@app/tenant';
import { InventoryRepository } from '../infrastructure/inventory.repository';
import { StockMovementRepository } from '../infrastructure/stock-movement.repository';
import { StockAdjustmentService } from './stock-adjustment.service';

const actor: AuthUser = {
  userId: 'owner-1',
  merchantId: 'merchant-1',
  role: 'OWNER',
  outletId: null,
};
const outlet = { id: 'outlet-1', status: 'ACTIVE' } as const;

const makeRow = (overrides = {}) => ({
  id: 'inv-1',
  merchantId: 'merchant-1',
  outletId: 'outlet-1',
  productId: 'product-1',
  quantity: 0,
  lowStockThresholdOverride: null,
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

// memverifikasi aturan penyesuaian stok (FR-INV-003/004, FR-INV-008)
// sebelum menyentuh database; repository dimock.
describe('StockAdjustmentService', () => {
  const prisma = { $transaction: jest.fn() };
  const tenantAuth = { assertOutletOwnedByMerchant: jest.fn() };
  const productRead = { getProductsForSaleValidation: jest.fn() };
  const inventoryRepo = {
    findByOutletAndProduct: jest.fn(),
    updateQuantityConditional: jest.fn(),
    create: jest.fn(),
  };
  const movementRepo = { create: jest.fn() };
  let service: StockAdjustmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
    );
    service = new StockAdjustmentService(
      prisma as unknown as PrismaWriteService,
      tenantAuth as unknown as TenantAuthorizationService,
      productRead,
      inventoryRepo as unknown as InventoryRepository,
      movementRepo as unknown as StockMovementRepository,
    );
    tenantAuth.assertOutletOwnedByMerchant.mockResolvedValue(outlet);
    productRead.getProductsForSaleValidation.mockResolvedValue([
      { id: 'product-1', merchantId: 'merchant-1' },
    ]);
  });

  it('FR-INV-008: menolak delta 0', async () => {
    const error = await service
      .adjust(actor, {
        outletId: 'outlet-1',
        productId: 'product-1',
        delta: 0,
        reason: 'cek',
      })
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('VALIDATION_ERROR');
    expect(movementRepo.create).not.toHaveBeenCalled();
  });

  it('menolak reason kosong untuk ADJUSTMENT', async () => {
    const error = await service
      .adjust(actor, {
        outletId: 'outlet-1',
        productId: 'product-1',
        delta: 5,
        reason: '   ',
      })
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('VALIDATION_ERROR');
  });

  it('FR-TEN-004: menolak Outlet nonaktif', async () => {
    tenantAuth.assertOutletOwnedByMerchant.mockResolvedValue({
      ...outlet,
      status: 'INACTIVE',
    });
    const error = await service
      .adjust(actor, {
        outletId: 'outlet-1',
        productId: 'product-1',
        delta: 5,
        reason: 'cek',
      })
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('FORBIDDEN');
  });

  it('menolak Product yang tidak ditemukan', async () => {
    productRead.getProductsForSaleValidation.mockResolvedValue([]);
    const error = await service
      .adjust(actor, {
        outletId: 'outlet-1',
        productId: 'product-99',
        delta: 5,
        reason: 'cek',
      })
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('NOT_FOUND');
  });

  it('FR-INV-003: membuat stok baru + movement saat belum ada Inventory', async () => {
    inventoryRepo.findByOutletAndProduct.mockResolvedValue(null);
    inventoryRepo.create.mockResolvedValue(makeRow({ quantity: 100 }));
    movementRepo.create.mockResolvedValue({
      id: 'move-1',
      merchantId: 'merchant-1',
      outletId: 'outlet-1',
      productId: 'product-1',
      type: 'ADJUSTMENT',
      delta: 100,
      quantityBefore: 0,
      quantityAfter: 100,
      reason: 'Stok awal',
      actorUserId: 'owner-1',
      createdAt: new Date('2026-01-01'),
    });

    const result = await service.adjust(actor, {
      outletId: 'outlet-1',
      productId: 'product-1',
      delta: 100,
      reason: 'Stok awal',
    });

    expect(result).toMatchObject({
      movementId: 'move-1',
      quantityBefore: 0,
      quantityAfter: 100,
      delta: 100,
    });
    expect(inventoryRepo.create).toHaveBeenCalledWith(
      {},
      {
        merchantId: 'merchant-1',
        outletId: 'outlet-1',
        productId: 'product-1',
        quantity: 100,
      },
    );
    expect(movementRepo.create).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        type: 'ADJUSTMENT',
        quantityBefore: 0,
        quantityAfter: 100,
        actorUserId: 'owner-1',
      }),
    );
  });

  it('FR-INV-004: menambah stok existing dengan before/after dari update atomik', async () => {
    inventoryRepo.findByOutletAndProduct.mockResolvedValue(
      makeRow({ quantity: 50 }),
    );
    inventoryRepo.updateQuantityConditional.mockResolvedValue({
      quantityBefore: 50,
      quantityAfter: 80,
    });
    movementRepo.create.mockResolvedValue({
      id: 'move-2',
      quantityBefore: 50,
      quantityAfter: 80,
      createdAt: new Date('2026-01-01'),
    });

    const result = await service.adjust(actor, {
      outletId: 'outlet-1',
      productId: 'product-1',
      delta: 30,
      reason: 'Restok',
    });

    expect(result).toMatchObject({ quantityBefore: 50, quantityAfter: 80 });
    expect(inventoryRepo.create).not.toHaveBeenCalled();
  });

  it('FR-INV-004/AT-004: menolak hasil stok negatif', async () => {
    inventoryRepo.findByOutletAndProduct.mockResolvedValue(
      makeRow({ quantity: 10 }),
    );
    inventoryRepo.updateQuantityConditional.mockResolvedValue(null);

    const error = await service
      .adjust(actor, {
        outletId: 'outlet-1',
        productId: 'product-1',
        delta: -30,
        reason: 'Rusak',
      })
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('VALIDATION_ERROR');
    expect(movementRepo.create).not.toHaveBeenCalled();
  });

  it('menolak delta negatif saat stok baru (belum ada Inventory)', async () => {
    inventoryRepo.findByOutletAndProduct.mockResolvedValue(null);
    const error = await service
      .adjust(actor, {
        outletId: 'outlet-1',
        productId: 'product-1',
        delta: -5,
        reason: 'Rusak',
      })
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('VALIDATION_ERROR');
    expect(inventoryRepo.create).not.toHaveBeenCalled();
  });
});
