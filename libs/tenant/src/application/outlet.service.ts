import { Injectable } from '@nestjs/common';
import { Outlet, Prisma } from '@prisma/client';
import {
  ApiError,
  AuthUser,
  PageRequestDto,
  PageResponseDto,
} from '@app/platform';
import {
  OutletListFilter,
  OutletRepository,
} from '../infrastructure/outlet.repository';
import { TenantAuthorizationService } from './tenant-authorization.service';
import { CreateOutletDto } from '../web/dto/create-outlet.dto';
import { OutletDto } from '../web/dto/outlet.dto';
import { OutletListQueryDto } from '../web/dto/outlet-list-query.dto';
import { UpdateOutletDto } from '../web/dto/update-outlet.dto';

export function toOutletDto(outlet: Outlet): OutletDto {
  return {
    id: outlet.id,
    merchant_id: outlet.merchantId,
    name: outlet.name,
    address: outlet.address,
    status: outlet.status,
    created_at: outlet.createdAt,
    updated_at: outlet.updatedAt,
  };
}

@Injectable()
export class OutletService {
  constructor(
    private readonly outletRepository: OutletRepository,
    private readonly tenantAuthorizationService: TenantAuthorizationService,
  ) {}

  // FR-TEN-004: outlet baru selalu status ACTIVE.
  async create(actor: AuthUser, dto: CreateOutletDto): Promise<OutletDto> {
    const outlet = await this.outletRepository.create({
      merchantId: actor.merchantId,
      name: dto.name.trim(),
      address: dto.address?.trim() ?? null,
    });
    return toOutletDto(outlet);
  }

  // FR-TEN-004, FR-TEN-007: daftar outlet merchant dengan filter status & paginasi.
  async list(
    actor: AuthUser,
    query: OutletListQueryDto,
    page: PageRequestDto,
  ): Promise<PageResponseDto<OutletDto>> {
    const filter: OutletListFilter = { status: query.status };
    const [content, total] = await Promise.all([
      this.outletRepository.find(
        actor.merchantId,
        filter,
        page.skip,
        page.take,
      ),
      this.outletRepository.count(actor.merchantId, filter),
    ]);
    return PageResponseDto.from(
      content.map(toOutletDto),
      page.page,
      page.size,
      total,
    );
  }

  // FR-TEN-004, FR-TEN-008: update outlet; ID wajib dicocokkan ke merchant (FR-TEN-010).
  async update(
    actor: AuthUser,
    outletId: string,
    dto: UpdateOutletDto,
  ): Promise<OutletDto> {
    const hasChange =
      dto.name !== undefined ||
      dto.address !== undefined ||
      dto.status !== undefined;
    if (!hasChange) {
      throw ApiError.validation('Minimal satu field harus diisi.');
    }

    const current =
      await this.tenantAuthorizationService.assertOutletOwnedByMerchant(
        outletId,
        actor.merchantId,
      );

    const name = dto.name?.trim() ?? current.name;
    const status = dto.status ?? current.status;
    // 07 §2.2: mengaktifkan outlet dengan nama yang bertabrakan outlet aktif lain = VALIDATION_ERROR.
    if (status === 'ACTIVE' && current.status !== 'ACTIVE') {
      const clash = await this.outletRepository.findActiveByNameInMerchant(
        name,
        actor.merchantId,
        outletId,
      );
      if (clash) {
        throw ApiError.validation(
          'Nama outlet sudah dipakai outlet aktif lain.',
          [{ field: 'name', reason: 'Konflik nama dengan outlet aktif.' }],
        );
      }
    }

    const data: Prisma.OutletUncheckedUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = name;
    }
    if (dto.address !== undefined) {
      data.address = dto.address?.trim() ?? null;
    }
    if (dto.status !== undefined) {
      data.status = status;
    }

    const outlet = await this.outletRepository.update(outletId, data);
    return toOutletDto(outlet);
  }
}
