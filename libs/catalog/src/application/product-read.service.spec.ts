import { Category, Prisma, ProductOutletPrice } from '@prisma/client';
import { ProductReadService } from './product-read.service';
import {
  ProductRepository,
  ProductWithCategory,
} from '../infrastructure/product.repository';
import { OutletPriceRepository } from '../infrastructure/outlet-price.repository';
import { TenantAuthorizationService } from '@app/tenant';

const category = (isActive = true): Category => ({
  id: 'category-1',
  merchantId: 'merchant-1',
  name: 'Makanan',
  isActive,
  createdAt: new Date(),
  updatedAt: new Date(),
});
const product = (
  id: string,
  overrides: Partial<ProductWithCategory> = {},
): ProductWithCategory => ({
  id,
  merchantId: 'merchant-1',
  categoryId: 'category-1',
  name: id,
  price: new Prisma.Decimal('10000'),
  lowStockThreshold: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: category(),
  ...overrides,
});
const override = (): ProductOutletPrice => ({
  id: 'p-1',
  merchantId: 'merchant-1',
  outletId: 'outlet-1',
  productId: 'product-1',
  price: new Prisma.Decimal('12000'),
  createdAt: new Date(),
  updatedAt: new Date(),
});

// memverifikasi kontrak baca yang dipakai inventory dan sales.
// test memastikan harga efektif serta tenant scope diputuskan oleh catalog.
describe('ProductReadService / ProductReadPort', () => {
  const products = { findByIdsInMerchant: jest.fn() };
  const prices = { findByOutletAndProductIds: jest.fn() };
  const tenants = { assertOutletOwnedByMerchant: jest.fn() };
  let service: ProductReadService;
  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductReadService(
      products as unknown as ProductRepository,
      prices as unknown as OutletPriceRepository,
      tenants as unknown as TenantAuthorizationService,
    );
    tenants.assertOutletOwnedByMerchant.mockResolvedValue({ id: 'outlet-1' });
  });

  it('FR-CAT-011: mengembalikan harga override, fallback master, dan urutan input', async () => {
    products.findByIdsInMerchant.mockResolvedValue([
      product('product-1'),
      product('product-2'),
    ]);
    prices.findByOutletAndProductIds.mockResolvedValue([override()]);
    const result = await service.getProductsForSaleValidation({
      merchantId: 'merchant-1',
      outletId: 'outlet-1',
      productIds: ['product-2', 'product-1'],
    });
    expect(result.map((item) => [item.id, item.effectivePrice])).toEqual([
      ['product-2', '10000.00'],
      ['product-1', '12000.00'],
    ]);
    expect(prices.findByOutletAndProductIds).toHaveBeenCalledWith(
      'merchant-1',
      'outlet-1',
      ['product-2', 'product-1'],
    );
    expect(tenants.assertOutletOwnedByMerchant).toHaveBeenCalledWith(
      'outlet-1',
      'merchant-1',
      { requireActive: true },
    );
  });

  it('FR-CAT-006/BR-019: mengekspos status Product dan Category agar Sales menolak checkout', async () => {
    products.findByIdsInMerchant.mockResolvedValue([
      product('product-1', { isActive: false, category: category(false) }),
    ]);
    prices.findByOutletAndProductIds.mockResolvedValue([]);
    const [result] = await service.getProductsForSaleValidation({
      merchantId: 'merchant-1',
      outletId: 'outlet-1',
      productIds: ['product-1'],
    });
    expect(result).toMatchObject({ isActive: false, isCategoryActive: false });
  });

  it('menolak Outlet lintas Merchant atau nonaktif sebelum membaca harga/Product', async () => {
    tenants.assertOutletOwnedByMerchant.mockRejectedValue({
      code: 'NOT_FOUND',
    });
    const error = await service
      .getProductsForSaleValidation({
        merchantId: 'merchant-1',
        outletId: 'outlet-99',
        productIds: ['product-1'],
      })
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('NOT_FOUND');
    expect(products.findByIdsInMerchant).not.toHaveBeenCalled();
    expect(prices.findByOutletAndProductIds).not.toHaveBeenCalled();
  });
});
