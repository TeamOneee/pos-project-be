import { UserRole } from '@app/platform';

// 07 §1.4 AuthTokens: hanya access token (tanpa refresh token, OD-011/FR-AUTH-008).
export class AuthTokensDto {
  access_token: string;
  expires_in: number;
  role: UserRole;
  merchant_id: string;
  outlet_id: string | null;
}
