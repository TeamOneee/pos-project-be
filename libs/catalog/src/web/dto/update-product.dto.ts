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
import { DECIMAL_MONEY_PATTERN } from './create-product.dto';

// memvalidasi perubahan product sesuai FR-CAT-005 dan FR-CAT-007.
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Nama produk tidak boleh kosong.' })
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(DECIMAL_MONEY_PATTERN, {
    message: 'price harus decimal nonnegatif dengan maksimal dua desimal.',
  })
  price?: string;

  @IsOptional()
  @IsUUID('4', { message: 'category_id harus UUID.' })
  category_id?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  low_stock_threshold?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
