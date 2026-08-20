import { Injectable, Logger } from '@nestjs/common';
import { User } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ApiError, ErrorCode, PrismaWriteService } from '@app/platform';
import { UserRepository } from '../infrastructure/user.repository';
import { normalizeEmail } from './email.util';
import { PasswordService } from './password.service';
import { TokenService, TokenUserClaims } from './token.service';
import { AuthTokensDto } from '../web/dto/auth-tokens.dto';
import { LoginDto } from '../web/dto/login.dto';
import { RegisterDto } from '../web/dto/register.dto';
import { RegisterResponseDto } from '../web/dto/register-response.dto';

const LOGIN_FAILED_MESSAGE =
  'Email atau password salah, atau akun tidak aktif.'; // FR-AUTH-006: pesan disamarkan

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  // FR-AUTH-001-004, FR-TEN-001-003: Merchant + User OWNER dibuat atomik.
  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const email = normalizeEmail(dto.email);

    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      this.logger.warn(
        { email, reason: 'duplicate' },
        'register attempt rejected',
      );
      throw ApiError.conflict(
        ErrorCode.EMAIL_ALREADY_REGISTERED,
        'Email sudah terdaftar.',
        [{ field: 'email', reason: 'Email sudah terdaftar.' }],
      );
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const userId = randomUUID();
    const merchantId = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET CONSTRAINTS ALL DEFERRED`;

      await tx.user.create({
        data: {
          id: userId,
          merchantId,
          outletId: null,
          name: dto.name.trim(),
          email,
          passwordHash,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });
      await tx.merchant.create({
        data: {
          id: merchantId,
          ownerUserId: userId,
          name: dto.merchant_name,
        },
      });
    });

    this.logger.log(
      { userId, merchantId, email, merchantName: dto.merchant_name },
      'user registered',
    );

    return {
      user_id: userId,
      merchant_id: merchantId,
      email,
      role: 'OWNER',
    };
  }

  // FR-AUTH-005-007, FR-AUTH-010
  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.userRepository.findByEmail(
      normalizeEmail(dto.email),
    );
    if (!user) {
      this.logger.warn(
        { email: normalizeEmail(dto.email) },
        'login failed: user not found',
      );
      throw ApiError.unauthenticated(LOGIN_FAILED_MESSAGE);
    }

    const passwordValid = await this.passwordService.verify(
      user.passwordHash,
      dto.password,
    );
    if (!passwordValid) {
      this.logger.warn(
        { userId: user.id, email: user.email },
        'login failed: invalid password',
      );
      throw ApiError.unauthenticated(LOGIN_FAILED_MESSAGE);
    }
    if (user.status !== 'ACTIVE') {
      this.logger.warn(
        { userId: user.id, email: user.email, status: user.status },
        'login failed: inactive account',
      );
      throw ApiError.unauthenticated(LOGIN_FAILED_MESSAGE);
    }

    const access = this.tokenService.signAccessToken(this.toClaims(user));
    this.logger.log(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        merchantId: user.merchantId,
      },
      'user logged in',
    );
    return {
      access_token: access.token,
      expires_in: access.expiresInSeconds,
      role: user.role,
      merchant_id: user.merchantId,
      outlet_id: user.outletId,
    };
  }

  private toClaims(user: User): TokenUserClaims {
    return {
      userId: user.id,
      merchantId: user.merchantId,
      role: user.role,
      outletId: user.outletId,
    };
  }
}
