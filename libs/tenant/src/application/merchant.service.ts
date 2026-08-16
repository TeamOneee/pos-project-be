import { Injectable } from '@nestjs/common';
import { Merchant, Prisma } from '@prisma/client';
import { ApiError } from '@app/platform';
import { AuthUser } from '@app/platform';
import { MerchantRepository } from '../infrastructure/merchant.repository';
import { MerchantDto } from '../web/dto/merchant.dto';
import { UpdateMerchantDto } from '../web/dto/update-merchant.dto';

export function toMerchantDto(merchant: Merchant): MerchantDto {
  return {
    id: merchant.id,
    name: merchant.name,
    timezone: merchant.timezone,
    status: merchant.status,
  };
}

@Injectable()
export class MerchantService {
  constructor(private readonly merchantRepository: MerchantRepository) {}

  async getProfile(actor: AuthUser): Promise<MerchantDto> {
    const merchant = await this.merchantRepository.findById(actor.merchantId);
    if (!merchant) {
      throw ApiError.notFound('Merchant tidak ditemukan.'); // FR-TEN-010: disamarkan
    }
    return toMerchantDto(merchant);
  }

  async updateProfile(
    actor: AuthUser,
    dto: UpdateMerchantDto,
  ): Promise<MerchantDto> {
    if (dto.name === undefined) {
      throw ApiError.validation('Minimal satu field harus diisi.');
    }

    const data: Prisma.MerchantUncheckedUpdateInput = {
      name: dto.name.trim(),
    };
    const merchant = await this.merchantRepository.update(
      actor.merchantId,
      data,
    );
    return toMerchantDto(merchant);
  }
}
