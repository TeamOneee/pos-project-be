import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  PASSWORD_PATTERN,
  PASSWORD_RULE_MESSAGE,
} from '../../application/password.service';

// FR-AUTH-011-012, FR-TEN-005-006
export class CreateStaffDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama staf wajib diisi.' })
  @MaxLength(150)
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Email wajib diisi.' })
  email: string;

  @IsString()
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_RULE_MESSAGE })
  password: string;

  @IsIn(['ADMIN', 'CASHIER'], {
    message: 'Role staf hanya ADMIN atau CASHIER.',
  })
  role: 'ADMIN' | 'CASHIER';

  @IsOptional()
  @IsUUID('4', { message: 'outlet_id harus UUID.' })
  outlet_id?: string;
}
