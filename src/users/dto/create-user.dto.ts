import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole, UserStatus } from 'src/common/types/role';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  merchantId: string;

  @IsNotEmpty()
  @IsString()
  role: UserRole;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  status?: UserStatus;
}
