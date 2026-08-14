import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// memvalidasi perubahan category sesuai FR-CAT-001 dan BR-019.
export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Nama kategori tidak boleh kosong.' })
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
