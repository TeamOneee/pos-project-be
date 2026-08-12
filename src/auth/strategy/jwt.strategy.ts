import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { USER_PORT } from 'src/users/ports/user.port';
import type { UserPort } from 'src/users/ports/user.port';

export interface JwtTokenPayload {
  sub: string;
  email: string;
  role: string;
  merchantId: string;
  outletId?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(USER_PORT) private usersPort: UserPort,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('SECRET_JWT'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtTokenPayload) {
    const user = await this.usersPort.findById(payload.sub);

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      userId: user.userId,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId,
      outletId: user.outletId ?? undefined,
    };
  }
}
