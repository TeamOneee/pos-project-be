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
  it('FR-CAT-001: hanya ADMIN dapat memutasi Category', () => {
    expect(methodMetadata(CategoryController.prototype, 'create')).toEqual([
      'ADMIN',
    ]);
    expect(methodMetadata(CategoryController.prototype, 'update')).toEqual([
      'ADMIN',
    ]);
  });

  it('FR-CAT-004/008: hanya OWNER/ADMIN membaca Product master; CASHIER tidak memiliki endpoint mutasi', () => {
    expect(methodMetadata(ProductController.prototype, 'list')).toEqual([
      'OWNER',
      'ADMIN',
    ]);
    expect(methodMetadata(ProductController.prototype, 'create')).toEqual([
      'ADMIN',
    ]);
    expect(methodMetadata(ProductController.prototype, 'update')).toEqual([
      'ADMIN',
    ]);
    expect(
      methodMetadata(ProductController.prototype, 'upsertOutletPrice'),
    ).toEqual(['ADMIN']);
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
