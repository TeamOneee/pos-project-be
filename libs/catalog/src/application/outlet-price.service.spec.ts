import { Prisma, Product, ProductOutletPrice } from '@prisma/client';
import { AuthUser } from '@app/platform';
import { OutletPriceService } from './outlet-price.service';
import { OutletPriceRepository } from '../infrastructure/outlet-price.repository';
import { ProductRepository } from '../infrastructure/product.repository';
import { TenantAuthorizationService } from '@app/tenant';

const actor: AuthUser = {
  userId: 'admin-1',
  merchantId: 'merchant-1',
  role: 'ADMIN',
  outletId: null,
};
const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'product-1',
  merchantId: 'merchant-1',
  categoryId: 'category-1',
  name: 'Teh',
  price: new Prisma.Decimal('5000'),
  lowStockThreshold: 2,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
const override = (): ProductOutletPrice => ({
  id: 'override-1',
  merchantId: 'merchant-1',
  outletId: 'outlet-1',
  productId: 'product-1',
  price: new Prisma.Decimal('6000'),
  updatedAt: new Date(),
});

// memverifikasi perubahan harga override pada product dan outlet yang valid.
// tenant authorization dimock agar test fokus pada keputusan service catalog.
describe('OutletPriceService', () => {
  const products = { findByIdInMerchant: jest.fn() };
  const prices = { upsert: jest.fn(), delete: jest.fn() };
  const tenants = { assertOutletOwnedByMerchant: jest.fn() };
  let service: OutletPriceService;
  beforeEach(() => {
    jest.clearAllMocks();
    service = new OutletPriceService(
      products as unknown as ProductRepository,
      prices as unknown as OutletPriceRepository,
      tenants as unknown as TenantAuthorizationService,
    );
    products.findByIdInMerchant.mockResolvedValue(product());
    tenants.assertOutletOwnedByMerchant.mockResolvedValue({ id: 'outlet-1' });
  });

  it('FR-CAT-010: menyimpan override harga hanya setelah Outlet tervalidasi dalam Merchant', async () => {
    prices.upsert.mockResolvedValue(override());
    const result = await service.upsert(actor, 'product-1', 'outlet-1', {
      price: '6000',
    });
    expect(result.price).toBe('6000.00');
    expect(tenants.assertOutletOwnedByMerchant).toHaveBeenCalledWith(
      'outlet-1',
      'merchant-1',
      { requireActive: true },
    );
  });

  it('menyamarkan Product lintas Merchant sebagai NOT_FOUND', async () => {
    products.findByIdInMerchant.mockResolvedValue(null);
    const error = await service
      .upsert(actor, 'product-9', 'outlet-1', { price: '6000' })
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('NOT_FOUND');
  });

  it('menghapus override dan menolak ketika tidak ada', async () => {
    prices.delete.mockResolvedValue(false);
    const error = await service
      .remove(actor, 'product-1', 'outlet-1')
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('NOT_FOUND');
  });

  it('menolak override untuk Product nonaktif sebelum menulis harga', async () => {
    products.findByIdInMerchant.mockResolvedValue(product({ isActive: false }));
    const error = await service
      .upsert(actor, 'product-1', 'outlet-1', { price: '6000' })
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('PRODUCT_INACTIVE');
    expect(prices.upsert).not.toHaveBeenCalled();
    expect(tenants.assertOutletOwnedByMerchant).not.toHaveBeenCalled();
  });
});
