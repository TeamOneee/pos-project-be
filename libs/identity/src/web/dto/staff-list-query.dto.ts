import { IsIn, IsOptional } from 'class-validator';

export class StaffListQueryDto {
  @IsOptional()
  @IsIn(['ADMIN', 'CASHIER'], {
    message: 'Filter role hanya ADMIN atau CASHIER.',
  })
  role?: 'ADMIN' | 'CASHIER';

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'], {
    message: 'Filter status hanya ACTIVE atau INACTIVE.',
  })
  status?: 'ACTIVE' | 'INACTIVE';
}
