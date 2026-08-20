import { PATH_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '@app/platform';
import { CategoryController } from './category.controller';
import { ProductController } from './product.controller';

function methodMetadata(target: object, propertyKey: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
  if (!descriptor || typeof descriptor.value !== 'function') {
    throw new Error(`Method ${propertyKey} tidak ditemukan.`);
  }
  return Reflect.getMetadata(ROLES_KEY, descriptor.value as object) as unknown;
}

// memverifikasi metadata endpoint tanpa menjalankan server http.
// test ini menjaga role dan path api tetap sesuai kontrak catalog.
describe('Catalog controller authorization metadata', () => {
  it('FR-CAT-001/BR-011B: OWNER dan ADMIN dapat memutasi Category', () => {
    expect(methodMetadata(CategoryController.prototype, 'create')).toEqual([
      'OWNER',
      'ADMIN',
    ]);
    expect(methodMetadata(CategoryController.prototype, 'update')).toEqual([
      'OWNER',
      'ADMIN',
    ]);
    expect(
      methodMetadata(CategoryController.prototype, 'list'),
    ).toBeUndefined();
  });

  it('FR-CAT-004/008: OWNER/ADMIN mengelola Product; CASHIER tidak memiliki endpoint mutasi', () => {
    expect(methodMetadata(ProductController.prototype, 'list')).toEqual([
      'OWNER',
      'ADMIN',
    ]);
    expect(methodMetadata(ProductController.prototype, 'create')).toEqual([
      'OWNER',
      'ADMIN',
    ]);
    expect(methodMetadata(ProductController.prototype, 'update')).toEqual([
      'OWNER',
      'ADMIN',
    ]);
    expect(
      methodMetadata(ProductController.prototype, 'upsertOutletPrice'),
    ).toEqual(['OWNER', 'ADMIN']);
    expect(
      methodMetadata(ProductController.prototype, 'removeOutletPrice'),
    ).toEqual(['OWNER', 'ADMIN']);
  });

  it('mengunci path publik API Catalog sesuai kontrak', () => {
    expect(Reflect.getMetadata(PATH_METADATA, CategoryController)).toBe(
      'categories',
    );
    expect(Reflect.getMetadata(PATH_METADATA, ProductController)).toBe(
      'products',
    );
  });
});
