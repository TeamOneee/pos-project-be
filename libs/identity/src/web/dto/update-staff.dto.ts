import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';
import {
  PASSWORD_PATTERN,
  PASSWORD_RULE_MESSAGE,
} from '../../application/password.service';

// FR-AUTH-014, BR-011: semua opsional, minimal 1 diisi (divalidasi di service).
export class UpdateStaffDto {
  @IsOptional()
  @IsIn(['ADMIN', 'CASHIER'], {
    message: 'Role staf hanya ADMIN atau CASHIER.',
  })
  role?: 'ADMIN' | 'CASHIER';

  @IsOptional()
  @ValidateIf((_obj, value: unknown) => value !== null)
  @IsUUID('4', { message: 'outlet_id harus UUID.' })
  outlet_id?: string | null;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'], {
    message: 'Status hanya ACTIVE atau INACTIVE.',
  })
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'new_password tidak boleh kosong.' })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_RULE_MESSAGE })
  new_password?: string;
}
