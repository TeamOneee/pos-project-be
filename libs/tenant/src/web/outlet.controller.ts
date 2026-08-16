import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CurrentUser,
  PageRequestDto,
  PageResponseDto,
  Roles,
  SuccessMessage,
} from '@app/platform';
import { AuthUser } from '@app/platform';
import { OutletService } from '../application/outlet.service';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { OutletDto } from './dto/outlet.dto';
import { OutletListQueryDto } from './dto/outlet-list-query.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';

// FR-TEN-004-008: manajemen outlet milik merchant pemanggil (scope dari JWT).
@Controller('outlets')
export class OutletController {
  constructor(private readonly outletService: OutletService) {}

  @Post()
  @Roles('OWNER')
  @HttpCode(HttpStatus.CREATED)
  @SuccessMessage('Outlet berhasil dibuat.')
  create(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateOutletDto,
  ): Promise<OutletDto> {
    return this.outletService.create(actor, dto);
  }

  @Get()
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Daftar outlet berhasil dimuat.')
  list(
    @CurrentUser() actor: AuthUser,
    @Query() query: OutletListQueryDto,
    @Query() page: PageRequestDto,
  ): Promise<PageResponseDto<OutletDto>> {
    return this.outletService.list(actor, query, page);
  }

  @Patch(':id')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Outlet berhasil diperbarui.')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) outletId: string,
    @Body() dto: UpdateOutletDto,
  ): Promise<OutletDto> {
    return this.outletService.update(actor, outletId, dto);
  }
}
