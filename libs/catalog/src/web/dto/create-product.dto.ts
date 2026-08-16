import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export const DECIMAL_MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

// memvalidasi request product baru sesuai FR-CAT-002, FR-CAT-003, dan DR-011A.
export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama produk wajib diisi.' })
  @MaxLength(150)
  name: string;

  @IsString()
  @Matches(DECIMAL_MONEY_PATTERN, {
    message: 'price harus decimal nonnegatif dengan maksimal dua desimal.',
  })
  price: string;

  @IsUUID('4', { message: 'category_id harus UUID.' })
  category_id: string;

  @IsInt()
  @Min(0)
  low_stock_threshold: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
