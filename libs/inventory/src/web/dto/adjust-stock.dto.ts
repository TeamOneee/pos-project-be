import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  NotEquals,
} from 'class-validator';

export class AdjustStockDto {
  @IsUUID()
  outlet_id!: string;

  @IsUUID()
  product_id!: string;

  @IsInt()
  @NotEquals(0)
  delta!: number;

  @IsString()
  @IsOptional()
  reason!: string;
}
