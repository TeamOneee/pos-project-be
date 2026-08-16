import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ApiError,
  AuthUser,
  ErrorCode,
  Money,
  PageRequestDto,
  PageResponseDto,
} from '@app/platform';
import { CategoryRepository } from '../infrastructure/category.repository';
import {
  ProductListFilter,
  ProductRepository,
  ProductWithCategory,
} from '../infrastructure/product.repository';
import {
  CreateProductCommand,
  ProductQuery,
  ProductResult,
  UpdateProductCommand,
} from './catalog.models';

function toProductResult(product: ProductWithCategory): ProductResult {
  return {
    id: product.id,
    merchantId: product.merchantId,
    categoryId: product.categoryId,
    categoryName: product.category.name,
    name: product.name,
    price: Money.of(product.price).toString(),
    lowStockThreshold: product.lowStockThreshold,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

// mengelola product master dan category aktif dalam merchant actor.
@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async create(
    actor: AuthUser,
    command: CreateProductCommand,
  ): Promise<ProductResult> {
    // memvalidasi category lalu menyimpan product master baru.
    await this.assertActiveCategory(actor.merchantId, command.categoryId);
    const product = await this.productRepository.create({
      merchantId: actor.merchantId,
      categoryId: command.categoryId,
      name: this.requireName(command.name),
      price: new Prisma.Decimal(command.price),
      lowStockThreshold: command.lowStockThreshold,
      isActive: command.isActive ?? true,
    });
    return toProductResult(product);
  }

  async list(
    actor: AuthUser,
    query: ProductQuery,
    page: PageRequestDto,
  ): Promise<PageResponseDto<ProductResult>> {
    // membaca product master dengan filter dan pagination merchant actor.
    const filter: ProductListFilter = {
      search: query.search?.trim() || undefined,
      categoryId: query.categoryId,
      isActive: query.isActive,
    };
    const [content, total] = await Promise.all([
      this.productRepository.find(
        actor.merchantId,
        filter,
        page.skip,
        page.take,
      ),
      this.productRepository.count(actor.merchantId, filter),
    ]);
    return PageResponseDto.from(
      content.map(toProductResult),
      page.page,
      page.size,
      total,
    );
  }

  async update(
    actor: AuthUser,
    productId: string,
    command: UpdateProductCommand,
  ): Promise<ProductResult> {
    // menolak patch kosong lalu memperbarui product milik merchant actor.
    if (
      command.name === undefined &&
      command.price === undefined &&
      command.categoryId === undefined &&
      command.lowStockThreshold === undefined &&
      command.isActive === undefined
    ) {
      throw ApiError.validation('Minimal satu field harus diisi.');
    }

    const product = await this.productRepository.findByIdInMerchant(
      productId,
      actor.merchantId,
    );
    if (!product) {
      throw ApiError.notFound('Produk tidak ditemukan.');
    }

    const data: Prisma.ProductUncheckedUpdateInput = {};
    if (command.name !== undefined) data.name = this.requireName(command.name);
    if (command.price !== undefined) {
      data.price = new Prisma.Decimal(command.price);
    }
    if (command.lowStockThreshold !== undefined) {
      data.lowStockThreshold = command.lowStockThreshold;
    }
    if (command.isActive !== undefined) data.isActive = command.isActive;
    if (command.categoryId !== undefined) {
      await this.assertActiveCategory(actor.merchantId, command.categoryId);
      data.categoryId = command.categoryId;
    }

    return toProductResult(
      await this.productRepository.update(product.id, data),
    );
  }

  private requireName(value: string): string {
    // menormalisasi nama lalu menolak nilai yang hanya berisi spasi.
    const name = value.trim();
    if (!name) {
      throw ApiError.validation('Nama produk wajib diisi.', [
        { field: 'name', reason: 'Nama tidak boleh kosong.' },
      ]);
    }
    return name;
  }

  private async assertActiveCategory(
    merchantId: string,
    categoryId: string,
  ): Promise<void> {
    // memastikan category ada, aktif, dan milik merchant yang sama.
    const category = await this.categoryRepository.findByIdInMerchant(
      categoryId,
      merchantId,
    );
    if (!category) {
      throw ApiError.notFound('Kategori tidak ditemukan.');
    }
    if (!category.isActive) {
      throw ApiError.conflict(
        ErrorCode.CATEGORY_INACTIVE,
        'Kategori tidak aktif dan tidak dapat dipilih.',
        [{ field: 'category_id', reason: 'CATEGORY_INACTIVE' }],
      );
    }
  }
}
