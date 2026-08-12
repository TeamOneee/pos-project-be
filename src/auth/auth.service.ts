import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { USER_PORT } from 'src/users/ports/user.port';
import type { UserPort } from 'src/users/ports/user.port';
import { MERCHANT_PORT } from 'src/merchants/ports/merchant.port';
import type { MerchantPort } from 'src/merchants/ports/merchant.port';
import { UnitOfWork } from 'src/common/transactions/unit-of-work';
import { hashing } from 'src/common/helpers/hash.helper';
import { UserRole } from 'src/common/types/role';
import { JwtPayload } from './types/jwt-payload';
import { UserPublic } from './types/user-public';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    private configService: ConfigService,
    @Inject(USER_PORT) private usersPort: UserPort,
    @Inject(MERCHANT_PORT) private merchantsPort: MerchantPort,
    private unitOfWork: UnitOfWork,
  ) {}

  async signToken(payload: JwtPayload) {
    return this.jwt.signAsync(
      {
        sub: payload.userId,
        email: payload.email,
        role: payload.role,
        merchantId: payload.merchantId,
        outletId: payload.outletId ?? null,
      },
      {
        secret: this.configService.get<string>('SECRET_JWT'),
        expiresIn: '7d',
      },
    );
  }

  async register(dto: RegisterDto) {
    await this.usersPort.ensureEmailAvailable(dto.user.email);

    const result = await this.unitOfWork.run(async (tx) => {
      const merchant = await this.merchantsPort.createMerchant(
        dto.merchant.name,
        tx,
      );

      const user = await this.usersPort.createUser(
        {
          name: dto.user.name,
          email: dto.user.email,
          password: await hashing.hash(dto.user.password),
          merchantId: merchant.merchantId,
          role: UserRole.OWNER,
        },
        tx,
      );

      return { merchant, user };
    });

    const accessToken = await this.signToken(this.toPayload(result.user));

    return {
      merchant: result.merchant,
      user: this.toPublic(result.user),
      accessToken,
    };
  }

  async signin(dto: LoginDto) {
    const user = await this.usersPort.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await hashing.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.signToken(this.toPayload(user));

    return {
      accessToken,
      user: this.toPublic(user),
    };
  }

  private toPayload(user: User): JwtPayload {
    return {
      userId: user.userId,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId,
      outletId: user.outletId ?? undefined,
    };
  }

  private toPublic(user: User): UserPublic {
    return {
      userId: user.userId,
      merchantId: user.merchantId,
      outletId: user.outletId,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
