import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { posUserLoginsTotal } from '../platform.metrics';
import { UserRole } from './user-role';

export interface JwtClaims {
  sub: string;
  merchant_id: string;
  role: UserRole;
  outlet_id: string | null;
}

export interface AuthUser {
  userId: string;
  merchantId: string;
  role: UserRole;
  outletId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: JwtClaims): AuthUser {
    if (!payload.sub || !payload.merchant_id || !payload.role) {
      throw new UnauthorizedException('Token tidak valid.');
    }
    posUserLoginsTotal.inc({ role: payload.role });
    return {
      userId: payload.sub,
      merchantId: payload.merchant_id,
      role: payload.role,
      outletId: payload.outlet_id ?? null,
    };
  }
}
