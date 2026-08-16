import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@app/platform';

export interface TokenUserClaims {
  userId: string;
  merchantId: string;
  role: UserRole;
  outletId: string | null;
}

export interface SignedAccessToken {
  token: string;
  expiresInSeconds: number;
}

const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 900;

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // FR-AUTH-007/008: satu access token 900 detik; tanpa refresh token/revocation.
  signAccessToken(user: TokenUserClaims): SignedAccessToken {
    const token = this.jwtService.sign(
      {
        sub: user.userId,
        merchant_id: user.merchantId,
        role: user.role,
        outlet_id: user.outletId,
      },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      },
    );
    return { token, expiresInSeconds: ACCESS_TOKEN_EXPIRES_IN_SECONDS };
  }
}
