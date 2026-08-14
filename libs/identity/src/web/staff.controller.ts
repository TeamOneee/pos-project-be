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
} from '@app/platform';
import { AuthUser } from '@app/platform';
import { StaffService } from '../application/staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { StaffListQueryDto } from './dto/staff-list-query.dto';
import { StaffDto } from './dto/staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Controller('staff')
@Roles('OWNER')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  // FR-AUTH-011-013, FR-TEN-005-006
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateStaffDto,
  ): Promise<StaffDto> {
    return this.staffService.create(actor, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  list(
    @CurrentUser() actor: AuthUser,
    @Query() query: StaffListQueryDto,
    @Query() page: PageRequestDto,
  ): Promise<PageResponseDto<StaffDto>> {
    return this.staffService.list(actor, query, page);
  }

  // FR-AUTH-014
  @Patch(':user_id')
  @HttpCode(HttpStatus.OK)
  update(
    @CurrentUser() actor: AuthUser,
    @Param('user_id', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateStaffDto,
  ): Promise<StaffDto> {
    return this.staffService.update(actor, userId, dto);
  }
}
