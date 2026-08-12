import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RegisterMerchantDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class RegisterUserDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(4, { message: 'minimal length name is 4 character' })
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'minimal length password is 8 character' })
  password: string;
}

export class RegisterDto {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => RegisterMerchantDto)
  merchant: RegisterMerchantDto;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => RegisterUserDto)
  user: RegisterUserDto;
}
