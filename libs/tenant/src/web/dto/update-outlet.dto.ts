import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// FR-TEN-004: semua opsional, minimal 1 diisi (divalidasi di service).
export class UpdateOutletDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Nama outlet tidak boleh kosong.' })
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'], {
    message: 'Status hanya ACTIVE atau INACTIVE.',
  })
  status?: 'ACTIVE' | 'INACTIVE';
}
