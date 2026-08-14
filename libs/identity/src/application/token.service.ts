import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@app/platform';
import { createHash } from 'node:crypto';

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

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  signAccessToken(user: TokenUserClaims): SignedAccessToken {
    const expiresIn = this.parseDuration(
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
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
        expiresIn,
      },
    );
    return { token, expiresInSeconds: expiresIn };
  }

  signRefreshToken(user: TokenUserClaims): {
    token: string;
    expiresInSeconds: number;
  } {
    const expiresIn = this.parseDuration(
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d',
    );
    const token = this.jwtService.sign(
      {
        sub: user.userId,
        merchant_id: user.merchantId,
        role: user.role,
        outlet_id: user.outletId,
      },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn,
      },
    );
    return { token, expiresInSeconds: expiresIn };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDuration(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value.trim());
    if (!match) {
      return 900;
    }
    const amount = Number.parseInt(match[1], 10);
    const unit = match[2];
    const multiplier: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3_600,
      d: 86_400,
    };
    return amount * (multiplier[unit] ?? 1);
  }
}
