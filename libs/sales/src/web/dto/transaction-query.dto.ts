import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PageRequestDto } from '@app/platform';

export class TransactionQueryDto extends PageRequestDto {
  @IsOptional()
  @IsString()
  date_from?: string;

  @IsOptional()
  @IsString()
  date_to?: string;

  @IsOptional()
  @IsUUID()
  outlet_id?: string;
}

export class ReceiptSearchQueryDto {
  @IsString()
  @IsNotEmpty()
  transaction_number!: string;
}

export class TransactionStatusQueryDto {
  @IsString()
  @IsNotEmpty()
  checkout_request_id!: string;
}
