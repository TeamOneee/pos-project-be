import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { PageRequestDto } from '@app/platform';

export class InventoryQueryDto extends PageRequestDto {
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
