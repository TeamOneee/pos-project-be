import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
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
  @IsIn([UserRole.ADMIN, UserRole.CASHIER], {
    message: 'role harus ADMIN atau CASHIER (OWNER hanya lewat register)',
  })
  role: UserRole;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  status?: UserStatus;
}
