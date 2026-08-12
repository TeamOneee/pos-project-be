import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMerchantDto {
  @IsNotEmpty()
  @IsString()
  merchantName: string;
}
