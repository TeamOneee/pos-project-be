import { Injectable } from '@nestjs/common';
import { Prisma, Category } from '@prisma/client';
import {
  ApiError,
  AuthUser,
  PageRequestDto,
  PageResponseDto,
} from '@app/platform';
import {
  CategoryListFilter,
  CategoryRepository,
} from '../infrastructure/category.repository';
import {
  CategoryQuery,
  CategoryResult,
  CreateCategoryCommand,
  UpdateCategoryCommand,
} from './catalog.models';

function toCategoryResult(category: Category): CategoryResult {
  return {
    id: category.id,
    merchantId: category.merchantId,
    name: category.name,
    isActive: category.isActive,
  };
}

function isCategoryNameConflict(error: unknown): boolean {
  // menerjemahkan race condition unique index menjadi error bisnis yang stabil.
  // pre-check nama tetap dipakai agar pesan normal tidak perlu menunggu database gagal.
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

// mengelola lifecycle category dalam merchant actor.
// seluruh hasil dan perubahan selalu dibatasi ke merchant dari jwt actor.
@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async create(
    actor: AuthUser,
    command: CreateCategoryCommand,
  ): Promise<CategoryResult> {
    // menolak nama kosong lalu menyimpan category baru.
    const name = this.requireName(command.name);
    await this.assertNameAvailable(actor.merchantId, name);
    try {
      return toCategoryResult(
        await this.categoryRepository.create(actor.merchantId, name),
      );
    } catch (error: unknown) {
      if (isCategoryNameConflict(error)) {
        throw ApiError.validation('Nama kategori sudah digunakan.', [
          { field: 'name', reason: 'Nama harus unik dalam Merchant.' },
        ]);
      }
      throw error;
    }
  }

  async list(
    actor: AuthUser,
    query: CategoryQuery,
    page: PageRequestDto,
  ): Promise<PageResponseDto<CategoryResult>> {
    // membatasi cashier pada category aktif meski query meminta sebaliknya.
    // owner dan admin dapat melihat category aktif maupun nonaktif.
    const filter: CategoryListFilter = {
      isActive: actor.role === 'CASHIER' ? true : query.isActive,
    };
    const [content, total] = await Promise.all([
      this.categoryRepository.find(
        actor.merchantId,
        filter,
        page.skip,
        page.take,
      ),
      this.categoryRepository.count(actor.merchantId, filter),
    ]);
    return PageResponseDto.from(
      content.map(toCategoryResult),
      page.page,
      page.size,
      total,
    );
  }

  async update(
    actor: AuthUser,
    categoryId: string,
    command: UpdateCategoryCommand,
  ): Promise<CategoryResult> {
    // menolak patch kosong dan memperbarui category milik merchant actor.
    if (command.name === undefined && command.isActive === undefined) {
      throw ApiError.validation('Minimal satu field harus diisi.');
    }
    const category = await this.categoryRepository.findByIdInMerchant(
      categoryId,
      actor.merchantId,
    );
    if (!category) {
      throw ApiError.notFound('Kategori tidak ditemukan.');
    }

    const data: Prisma.CategoryUncheckedUpdateInput = {};
    if (command.name !== undefined) {
      const name = this.requireName(command.name);
      if (name !== category.name) {
        await this.assertNameAvailable(actor.merchantId, name);
      }
      data.name = name;
    }
    if (command.isActive !== undefined) {
      data.isActive = command.isActive;
    }
    try {
      return toCategoryResult(
        await this.categoryRepository.update(category.id, data),
      );
    } catch (error: unknown) {
      if (isCategoryNameConflict(error)) {
        throw ApiError.validation('Nama kategori sudah digunakan.', [
          { field: 'name', reason: 'Nama harus unik dalam Merchant.' },
        ]);
      }
      throw error;
    }
  }

  private requireName(value: string): string {
    // menormalisasi nama lalu menolak nilai yang hanya berisi spasi.
    const name = value.trim();
    if (!name) {
      throw ApiError.validation('Nama kategori wajib diisi.', [
        { field: 'name', reason: 'Nama tidak boleh kosong.' },
      ]);
    }
    return name;
  }

  private async assertNameAvailable(
    merchantId: string,
    name: string,
  ): Promise<void> {
    // menjaga nama category tetap unik dalam satu merchant.
    const existing = await this.categoryRepository.findByNameInMerchant(
      merchantId,
      name,
    );
    if (existing) {
      throw ApiError.validation('Nama kategori sudah digunakan.', [
        { field: 'name', reason: 'Nama harus unik dalam Merchant.' },
      ]);
    }
  }
}
