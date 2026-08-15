import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PageQueryDto } from './pagination.dto';

export class StockMovementQueryDto extends PageQueryDto {
  @IsOptional()
  @IsUUID()
  outlet_id?: string;

  @IsOptional()
  @IsUUID()
  product_id?: string;

  @IsOptional()
  @IsIn(['ADJUSTMENT', 'SALE'])
  type?: string;

  @IsOptional()
  @IsString()
  date_from?: string;

  @IsOptional()
  @IsString()
  date_to?: string;
}
