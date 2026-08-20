import { Injectable, Logger } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import {
  ApiError,
  AuthUser,
  ErrorCode,
  PageRequestDto,
  PageResponseDto,
} from '@app/platform';
import { normalizeEmail } from './email.util';
import { PasswordService } from './password.service';
import { OutletRepository } from '../infrastructure/outlet.repository';
import { UserRepository } from '../infrastructure/user.repository';
import { CreateStaffDto } from '../web/dto/create-staff.dto';
import { StaffListQueryDto } from '../web/dto/staff-list-query.dto';
import { StaffDto } from '../web/dto/staff.dto';
import { UpdateStaffDto } from '../web/dto/update-staff.dto';

export function toStaffDto(user: User): StaffDto {
  return {
    user_id: user.id,
    merchant_id: user.merchantId,
    outlet_id: user.outletId,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

// FR-AUTH-011-014, FR-TEN-005-006, BR-011
@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);
  constructor(
    private readonly userRepository: UserRepository,
    private readonly outletRepository: OutletRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async create(actor: AuthUser, dto: CreateStaffDto): Promise<StaffDto> {
    if (dto.role === 'ADMIN' && dto.outlet_id != null) {
      throw ApiError.validation('Admin tidak boleh memiliki outlet.', [
        { field: 'outlet_id', reason: 'role ADMIN harus outlet_id kosong.' },
      ]);
    }

    const emailNormalized = normalizeEmail(dto.email);
    const existing = await this.userRepository.findByEmail(emailNormalized);
    if (existing) {
      throw ApiError.conflict(
        ErrorCode.EMAIL_ALREADY_REGISTERED,
        'Email sudah terdaftar.',
        [{ field: 'email', reason: 'Email sudah terdaftar.' }],
      );
    }

    let outletId: string | null = null;
    if (dto.role === 'CASHIER') {
      if (!dto.outlet_id) {
        throw ApiError.validation('Kasir wajib memiliki outlet aktif.', [
          { field: 'outlet_id', reason: 'Wajib untuk role CASHIER.' },
        ]);
      }
      const outlet = await this.outletRepository.findActiveInMerchant(
        dto.outlet_id,
        actor.merchantId,
      );
      if (!outlet) {
        throw ApiError.notFound('Outlet tidak ditemukan.'); // FR-TEN-010: disamarkan
      }
      outletId = outlet.id;
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.userRepository.create({
      merchantId: actor.merchantId,
      outletId,
      name: dto.name.trim(),
      email: emailNormalized,
      passwordHash,
      role: dto.role,
      status: 'ACTIVE',
    });

    this.logger.log(
      {
        userId: user.id,
        email: emailNormalized,
        role: dto.role,
        outletId,
        createdBy: actor.userId,
      },
      'staff created',
    );

    return toStaffDto(user);
  }

  async list(
    actor: AuthUser,
    query: StaffListQueryDto,
    page: PageRequestDto,
  ): Promise<PageResponseDto<StaffDto>> {
    const filter = {
      role: query.role,
      status: query.status,
    };
    const [content, total] = await Promise.all([
      this.userRepository.findStaff(
        actor.merchantId,
        filter,
        page.skip,
        page.take,
      ),
      this.userRepository.countStaff(actor.merchantId, filter),
    ]);
    return PageResponseDto.from(
      content.map(toStaffDto),
      page.page,
      page.size,
      total,
    );
  }

  async update(
    actor: AuthUser,
    userId: string,
    dto: UpdateStaffDto,
  ): Promise<StaffDto> {
    const hasChange =
      dto.role !== undefined ||
      dto.outlet_id !== undefined ||
      dto.status !== undefined ||
      dto.new_password !== undefined;
    if (!hasChange) {
      throw ApiError.validation('Minimal satu field harus diisi.');
    }

    const user = await this.userRepository.findStaffById(
      userId,
      actor.merchantId,
    );
    if (!user) {
      throw ApiError.notFound('Staf tidak ditemukan.'); // FR-TEN-010: disamarkan
    }

    const role = dto.role ?? user.role;
    let outletId = dto.outlet_id !== undefined ? dto.outlet_id : user.outletId;

    if (role === 'ADMIN') {
      if (outletId != null) {
        throw ApiError.validation('Admin tidak boleh memiliki outlet.', [
          { field: 'outlet_id', reason: 'role ADMIN harus outlet_id kosong.' },
        ]);
      }
      outletId = null;
    }

    if (role === 'CASHIER') {
      if (!outletId) {
        throw ApiError.validation('Kasir wajib memiliki outlet aktif.', [
          { field: 'outlet_id', reason: 'Wajib untuk role CASHIER.' },
        ]);
      }
      const outlet = await this.outletRepository.findActiveInMerchant(
        outletId,
        actor.merchantId,
      );
      if (!outlet) {
        throw ApiError.notFound('Outlet tidak ditemukan.'); // FR-TEN-010: disamarkan
      }
    }

    const data: Prisma.UserUncheckedUpdateInput = {};
    if (dto.role !== undefined) {
      data.role = role;
    }
    if (dto.outlet_id !== undefined || role === 'ADMIN') {
      data.outletId = outletId;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.new_password !== undefined) {
      data.passwordHash = await this.passwordService.hash(dto.new_password);
    }

    const updated = await this.userRepository.updateStaff(user.id, data);

    this.logger.log(
      { userId: user.id, updatedBy: actor.userId, changes: Object.keys(data) },
      'staff updated',
    );

    return toStaffDto(updated);
  }
}
