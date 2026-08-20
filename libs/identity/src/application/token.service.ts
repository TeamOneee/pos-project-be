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

function parseExpiresInSeconds(val?: string | number): number {
  if (!val) return 900;
  if (typeof val === 'number') return val;
  const match = /^(\d+)([smhd])?$/i.exec(String(val).trim());
  if (!match) return 900;
  const num = Number.parseInt(match[1], 10);
  const unit = match[2]?.toLowerCase();
  switch (unit) {
    case 's':
      return num;
    case 'm':
      return num * 60;
    case 'h':
      return num * 3600;
    case 'd':
      return num * 86400;
    default:
      return num;
  }
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // FR-AUTH-007/008: satu access token (default 900 detik / configurable); tanpa refresh token/revocation.
  signAccessToken(user: TokenUserClaims): SignedAccessToken {
    const expiresInSeconds = parseExpiresInSeconds(
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN'),
    );
    const token = this.jwtService.sign(
      {
        sub: user.userId,
        merchant_id: user.merchantId,
        role: user.role,
        outlet_id: user.outletId,
      },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: expiresInSeconds,
      },
    );
    return { token, expiresInSeconds };
  }
}
