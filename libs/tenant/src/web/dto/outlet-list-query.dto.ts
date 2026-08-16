import { IsIn, IsOptional } from 'class-validator';

export class OutletListQueryDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'], {
    message: 'Filter status hanya ACTIVE atau INACTIVE.',
  })
  status?: 'ACTIVE' | 'INACTIVE';
}
