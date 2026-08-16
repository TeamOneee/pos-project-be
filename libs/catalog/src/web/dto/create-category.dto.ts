import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// memvalidasi request category baru sesuai FR-CAT-001 dan DR-010.
export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama kategori wajib diisi.' })
  @MaxLength(100)
  name: string;
}
