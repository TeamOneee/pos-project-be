import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { CurrentUser, SuccessMessage } from '@app/platform';
import { AuthUser } from '@app/platform';
import { Roles } from '@app/platform';
import { MerchantService } from '../application/merchant.service';
import { MerchantDto } from './dto/merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';

// FR-TEN-001-003: profil merchant; GET semua role, PATCH hanya OWNER.
@Controller('merchant')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Profil merchant berhasil dimuat.')
  getProfile(@CurrentUser() actor: AuthUser): Promise<MerchantDto> {
    return this.merchantService.getProfile(actor);
  }

  @Patch()
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Merchant berhasil diperbarui.')
  updateProfile(
    @CurrentUser() actor: AuthUser,
    @Body() dto: UpdateMerchantDto,
  ): Promise<MerchantDto> {
    return this.merchantService.updateProfile(actor, dto);
  }
}
