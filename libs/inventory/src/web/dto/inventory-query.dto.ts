import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { PageQueryDto } from './pagination.dto';

export class InventoryQueryDto extends PageQueryDto {
  @IsOptional()
  @IsUUID()
  outlet_id?: string;

  @IsOptional()
  @IsUUID()
  product_id?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  low_stock_only?: boolean;
}
