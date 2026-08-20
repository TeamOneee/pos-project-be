import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CheckoutItemDto {
  @IsUUID()
  product_id!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  expected_unit_price?: string;
}

// Request checkout (07 §5.4 CheckoutRequest): idempotency dijamin oleh
// checkout_request_id unik per merchant (OD-012), bukan tabel IdempotencyRecord.
export class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  checkout_request_id!: string;

  @IsUUID()
  outlet_id!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @IsEnum(PaymentMethod)
  payment_method!: PaymentMethod;
}
