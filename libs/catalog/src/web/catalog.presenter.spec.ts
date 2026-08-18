import {
  toCategoryDto,
  toProductDto,
  toProductOutletPriceDto,
} from './catalog.presenter';

describe('catalog.presenter', () => {
  it('toCategoryDto memetakan camelCase ke snake_case', () => {
    const result = toCategoryDto({
      id: 'cat-1',
      merchantId: 'm-1',
      name: 'Makanan',
      isActive: true,
    });
    expect(result).toEqual({
      id: 'cat-1',
      merchant_id: 'm-1',
      name: 'Makanan',
      is_active: true,
    });
  });

  it('toProductDto memetakan semua field', () => {
    const result = toProductDto({
      id: 'prod-1',
      merchantId: 'm-1',
      categoryId: 'cat-1',
      categoryName: 'Makanan',
      name: 'Nasi Goreng',
      price: '25000.00',
      lowStockThreshold: 10,
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-06-01'),
    });
    expect(result).toEqual({
      id: 'prod-1',
      merchant_id: 'm-1',
      category_id: 'cat-1',
      category_name: 'Makanan',
      name: 'Nasi Goreng',
      price: '25000.00',
      low_stock_threshold: 10,
      is_active: true,
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-06-01'),
    });
  });

  it('toProductOutletPriceDto memetakan field harga outlet', () => {
    const result = toProductOutletPriceDto({
      productId: 'p-1',
      outletId: 'o-1',
      price: '22000.00',
      updatedAt: new Date('2026-03-15'),
    });
    expect(result).toEqual({
      product_id: 'p-1',
      outlet_id: 'o-1',
      price: '22000.00',
      updated_at: new Date('2026-03-15'),
    });
  });
});
