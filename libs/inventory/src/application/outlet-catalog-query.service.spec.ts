import { AuthUser } from '@app/platform';
import { ProductReadPort } from '@app/catalog';
import { TenantAuthorizationService } from '@app/tenant';
import { InventoryRepository } from '../infrastructure/inventory.repository';
import { OutletCatalogQueryService } from './outlet-catalog-query.service';

const owner: AuthUser = {
  userId: 'owner-1',
  merchantId: 'merchant-1',
  role: 'OWNER',
  outletId: null,
};
const cashier: AuthUser = {
  userId: 'cashier-1',
  merchantId: 'merchant-1',
  role: 'CASHIER',
  outletId: 'outlet-1',
};

const outlet = { id: 'outlet-1', status: 'ACTIVE' } as const;

const makeProduct = (overrides: Record<string, unknown> = {}) => ({
  id: 'product-1',
  merchantId: 'merchant-1',
  categoryId: 'category-1',
  name: 'Es Teh',
  isActive: true,
  isCategoryActive: true,
  effectivePrice: '5500.00',
  ...overrides,
});

const makeInventoryRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'inv-1',
  merchantId: 'merchant-1',
  outletId: 'outlet-1',
  productId: 'product-1',
  quantity: 8,
  lowStockThresholdOverride: null,
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

const page = { page: 0, size: 20, skip: 0, take: 20 };

// memverifikasi katalog jual per Outlet (FR-CAT-006): role, outlet aktif,
// filter Product aktif, pencarian, dan kategori.
describe('OutletCatalogQueryService', () => {
  const inventoryRepo = { findInOutlet: jest.fn() };
  const productRead = { getProductsForSaleValidation: jest.fn() };
  const tenantAuth = { assertOutletOwnedByMerchant: jest.fn() };
  let service: OutletCatalogQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OutletCatalogQueryService(
      inventoryRepo as unknown as InventoryRepository,
      productRead as unknown as ProductReadPort,
      tenantAuth as unknown as TenantAuthorizationService,
    );
    tenantAuth.assertOutletOwnedByMerchant.mockResolvedValue(outlet);
  });

  it('OD-010: CASHIER hanya boleh katalog Outlet tugasnya', async () => {
    const error = await service
      .catalog(cashier, { outletId: 'outlet-99' }, page)
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('FORBIDDEN');
  });

  it('FR-TEN-004: menolak Outlet nonaktif', async () => {
    tenantAuth.assertOutletOwnedByMerchant.mockResolvedValue({
      ...outlet,
      status: 'INACTIVE',
    });
    const error = await service
      .catalog(owner, { outletId: 'outlet-1' }, page)
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('FORBIDDEN');
  });

  it('FR-CAT-006: hanya Product aktif dengan stok yang dikembalikan', async () => {
    inventoryRepo.findInOutlet.mockResolvedValue([makeInventoryRow()]);
    productRead.getProductsForSaleValidation.mockResolvedValue([
      makeProduct(),
      makeProduct({ id: 'product-2', name: 'Kopi', isActive: false }),
    ]);
    const result = await service.catalog(owner, { outletId: 'outlet-1' }, page);
    expect(result.content).toEqual([
      {
        id: 'product-1',
        name: 'Es Teh',
        price: '5500.00',
        categoryId: 'category-1',
        stockQuantity: 8,
      },
    ]);
    expect(result.total_elements).toBe(1);
  });

  it('FR-CAT-006: mendukung filter pencarian nama dan kategori', async () => {
    inventoryRepo.findInOutlet.mockResolvedValue([
      makeInventoryRow(),
      makeInventoryRow({ productId: 'product-2' }),
    ]);
    productRead.getProductsForSaleValidation.mockResolvedValue([
      makeProduct(),
      makeProduct({ id: 'product-2', name: 'Kopi Susu', categoryId: 'category-2' }),
    ]);
    const result = await service.catalog(
      owner,
      { outletId: 'outlet-1', search: 'kopi', categoryId: 'category-2' },
      page,
    );
    expect(result.content).toHaveLength(1);
    expect(result.content[0].name).toBe('Kopi Susu');
  });

  it('mengembalikan halaman kosong bila Outlet belum punya Inventory', async () => {
    inventoryRepo.findInOutlet.mockResolvedValue([]);
    const result = await service.catalog(owner, { outletId: 'outlet-1' }, page);
    expect(result.content).toEqual([]);
    expect(productRead.getProductsForSaleValidation).not.toHaveBeenCalled();
  });
});