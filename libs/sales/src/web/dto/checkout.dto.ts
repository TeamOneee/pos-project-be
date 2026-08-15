import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CheckoutItemDto {
  @IsString()
  @IsNotEmpty()
  product_id!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  expected_unit_price?: string;
}

export class PaymentRequestDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount!: string;
}

export class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  idempotency_key!: string;

  @IsString()
  @IsNotEmpty()
  outlet_id!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @ValidateNested()
  @Type(() => PaymentRequestDto)
  payment!: PaymentRequestDto;
}
