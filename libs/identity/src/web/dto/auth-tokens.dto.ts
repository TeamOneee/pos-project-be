import { UserRole } from '@app/platform';

export class AuthTokensDto {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  role: UserRole;
  merchant_id: string;
  outlet_id: string | null;
}
