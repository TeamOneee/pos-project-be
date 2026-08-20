import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PageRequestDto } from '@app/platform';

export class StockMovementQueryDto extends PageRequestDto {
  @IsOptional()
  @IsUUID()
  outlet_id?: string;

  @IsOptional()
  @IsUUID()
  product_id?: string;

  @IsOptional()
  @IsIn(['ADJUSTMENT', 'SALE'])
  type?: 'ADJUSTMENT' | 'SALE';

  @IsOptional()
  @IsString()
  date_from?: string;

  @IsOptional()
  @IsString()
  date_to?: string;
}
