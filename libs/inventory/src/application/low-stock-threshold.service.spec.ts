import { AuthUser, PrismaWriteService } from '@app/platform';
import { TenantAuthorizationService } from '@app/tenant';
import { InventoryRepository } from '../infrastructure/inventory.repository';
import { LowStockThresholdService } from './low-stock-threshold.service';

const actor: AuthUser = {
  userId: 'owner-1',
  merchantId: 'merchant-1',
  role: 'OWNER',
  outletId: null,
};
const outlet = { id: 'outlet-1', status: 'ACTIVE' } as const;

const makeThresholdRow = (overrides = {}) => ({
  id: 'inv-1',
  merchantId: 'merchant-1',
  outletId: 'outlet-1',
  productId: 'product-1',
  quantity: 0,
  lowStockThresholdOverride: 5,
  updatedAt: new Date('2026-01-01'),
  product: { name: 'Es Teh', lowStockThreshold: 10 },
  outlet: { name: 'Outlet Pusat' },
  ...overrides,
});

// memverifikasi set/hapus ambang stok rendah (FR-INV-007A, DR-011A).
describe('LowStockThresholdService', () => {
  const prisma = { $transaction: jest.fn() };
  const tenantAuth = { assertOutletOwnedByMerchant: jest.fn() };
  const productRead = { getProductsForSaleValidation: jest.fn() };
  const inventoryRepo = {
    upsertThreshold: jest.fn(),
    clearThreshold: jest.fn(),
  };
  let service: LowStockThresholdService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
    );
    service = new LowStockThresholdService(
      prisma as unknown as PrismaWriteService,
      tenantAuth as unknown as TenantAuthorizationService,
      productRead,
      inventoryRepo as unknown as InventoryRepository,
    );
    tenantAuth.assertOutletOwnedByMerchant.mockResolvedValue(outlet);
    productRead.getProductsForSaleValidation.mockResolvedValue([
      { id: 'product-1' },
    ]);
  });

  it('FR-INV-007A: set threshold override dan hitung threshold efektif', async () => {
    inventoryRepo.upsertThreshold.mockResolvedValue(makeThresholdRow());
    const result = await service.setThreshold(
      actor,
      'product-1',
      'outlet-1',
      5,
    );
    expect(result).toMatchObject({
      productId: 'product-1',
      outletId: 'outlet-1',
      baseLowStockThreshold: 10,
      lowStockThresholdOverride: 5,
      effectiveLowStockThreshold: 5,
    });
    expect(inventoryRepo.upsertThreshold).toHaveBeenCalledWith(
      {},
      {
        merchantId: 'merchant-1',
        outletId: 'outlet-1',
        productId: 'product-1',
        threshold: 5,
      },
    );
  });

  it('FR-TEN-004: menolak Outlet nonaktif', async () => {
    tenantAuth.assertOutletOwnedByMerchant.mockResolvedValue({
      ...outlet,
      status: 'INACTIVE',
    });
    const error = await service
      .setThreshold(actor, 'product-1', 'outlet-1', 5)
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('FORBIDDEN');
    expect(inventoryRepo.upsertThreshold).not.toHaveBeenCalled();
  });

  it('menolak Product yang tidak ditemukan', async () => {
    productRead.getProductsForSaleValidation.mockResolvedValue([]);
    const error = await service
      .setThreshold(actor, 'product-99', 'outlet-1', 5)
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('NOT_FOUND');
  });

  it('FR-INV-007A: hapus override mengembalikan threshold dasar', async () => {
    inventoryRepo.clearThreshold.mockResolvedValue({ count: 1 });
    await service.deleteThreshold(actor, 'product-1', 'outlet-1');
    expect(inventoryRepo.clearThreshold).toHaveBeenCalledWith(
      {},
      'merchant-1',
      'outlet-1',
      'product-1',
    );
  });
});
