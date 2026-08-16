import { IsString, Matches } from 'class-validator';
import { DECIMAL_MONEY_PATTERN } from './create-product.dto';

export class UpsertProductOutletPriceDto {
  @IsString()
  @Matches(DECIMAL_MONEY_PATTERN, {
    message: 'price harus decimal nonnegatif dengan maksimal dua desimal.',
  })
  price: string;
}
