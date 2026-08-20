import { Category, Prisma, Product } from '@prisma/client';
import { AuthUser } from '@app/platform';
import { ProductService } from './product.service';
import { CategoryRepository } from '../infrastructure/category.repository';
import {
  ProductRepository,
  ProductWithCategory,
} from '../infrastructure/product.repository';

const actor: AuthUser = {
  userId: 'admin-1',
  merchantId: 'merchant-1',
  role: 'ADMIN',
  outletId: null,
};
const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'category-1',
  merchantId: 'merchant-1',
  name: 'Makanan',
  isActive: true,
  ...overrides,
});
const makeProduct = (
  overrides: Partial<Product> = {},
): ProductWithCategory => ({
  id: 'product-1',
  merchantId: 'merchant-1',
  categoryId: 'category-1',
  name: 'Nasi Goreng',
  price: new Prisma.Decimal('15000.00'),
  lowStockThreshold: 5,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  category: makeCategory(),
  ...overrides,
});

// memverifikasi aturan product master sebelum data dikirim ke repository.
// category dimock agar test fokus pada merchant scope dan validasi bisnis.
describe('ProductService', () => {
  const products = {
    create: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    findByIdInMerchant: jest.fn(),
    update: jest.fn(),
  };
  const categories = { findByIdInMerchant: jest.fn() };
  let service: ProductService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductService(
      products as unknown as ProductRepository,
      categories as unknown as CategoryRepository,
    );
  });

  it('FR-CAT-002: membuat Product dengan harga exact dan threshold', async () => {
    categories.findByIdInMerchant.mockResolvedValue(makeCategory());
    products.create.mockResolvedValue(makeProduct());
    const result = await service.create(actor, {
      name: ' Nasi Goreng ',
      price: '15000.00',
      categoryId: 'category-1',
      lowStockThreshold: 5,
    });
    expect(result).toMatchObject({
      price: '15000.00',
      lowStockThreshold: 5,
      categoryName: 'Makanan',
    });
    expect(products.create).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: 'merchant-1',
        name: 'Nasi Goreng',
        isActive: true,
      }),
    );
  });

  it('FR-CAT-003/BR-019: menolak Category nonaktif untuk Product baru', async () => {
    categories.findByIdInMerchant.mockResolvedValue(
      makeCategory({ isActive: false }),
    );
    const error = await service
      .create(actor, {
        name: 'Nasi Goreng',
        price: '15000',
        categoryId: 'category-1',
        lowStockThreshold: 0,
      })
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('CATEGORY_INACTIVE');
    expect(products.create).not.toHaveBeenCalled();
  });

  it('FR-CAT-005: Admin dapat mengubah harga, threshold, dan status Product', async () => {
    products.findByIdInMerchant.mockResolvedValue(makeProduct());
    products.update.mockResolvedValue(
      makeProduct({
        price: new Prisma.Decimal('16000'),
        lowStockThreshold: 2,
        isActive: false,
      }),
    );
    const result = await service.update(actor, 'product-1', {
      price: '16000',
      lowStockThreshold: 2,
      isActive: false,
    });
    expect(result).toMatchObject({
      price: '16000.00',
      lowStockThreshold: 2,
      isActive: false,
    });
  });

  it('FR-CAT-004: list Product selalu dibatasi Merchant actor', async () => {
    products.find.mockResolvedValue([makeProduct()]);
    products.count.mockResolvedValue(1);
    const result = await service.list(
      actor,
      { search: 'nasi' },
      { page: 1, size: 10, skip: 0, take: 10 },
    );
    expect(result.total_elements).toBe(1);
    expect(products.find).toHaveBeenCalledWith(
      'merchant-1',
      { search: 'nasi', categoryId: undefined, isActive: undefined },
      0,
      10,
    );
  });

  it('menolak patch Product kosong dan Product lintas Merchant', async () => {
    const empty = await service
      .update(actor, 'product-1', {})
      .catch((e: unknown) => e);
    expect((empty as { code: string }).code).toBe('VALIDATION_ERROR');
    products.findByIdInMerchant.mockResolvedValue(null);
    const missing = await service
      .update(actor, 'product-9', { isActive: false })
      .catch((e: unknown) => e);
    expect((missing as { code: string }).code).toBe('NOT_FOUND');
  });

  it('FR-CAT-003: menolak nama Product yang hanya berisi spasi', async () => {
    categories.findByIdInMerchant.mockResolvedValue(makeCategory());
    const error = await service
      .create(actor, {
        name: '   ',
        price: '15000',
        categoryId: 'category-1',
        lowStockThreshold: 0,
      })
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('VALIDATION_ERROR');
    expect(products.create).not.toHaveBeenCalled();
  });
});
