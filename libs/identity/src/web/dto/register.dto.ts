import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  PASSWORD_PATTERN,
  PASSWORD_RULE_MESSAGE,
} from '../../application/password.service';

// FR-AUTH-001-003
export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama owner wajib diisi.' })
  @MaxLength(150)
  name: string;

  @IsEmail({}, { message: 'Format email tidak valid.' })
  email: string;

  @IsString()
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_RULE_MESSAGE })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama merchant wajib diisi.' })
  @MaxLength(150)
  merchant_name: string;
}
