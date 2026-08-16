import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// FR-TEN-004: buat outlet; outlet baru selalu status ACTIVE.
export class CreateOutletDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama outlet wajib diisi.' })
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;
}
