import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ApiError, ErrorCode } from '@app/platform';
import { PrismaWriteService } from '@app/platform';
import { RefreshTokenRepository } from '../infrastructure/refresh-token.repository';
import { UserRepository } from '../infrastructure/user.repository';
import { normalizeEmail } from './email.util';
import { PasswordService } from './password.service';
import { TokenService, TokenUserClaims } from './token.service';
import { AuthTokensDto } from '../web/dto/auth-tokens.dto';
import { LoginDto } from '../web/dto/login.dto';
import { LogoutDto } from '../web/dto/logout.dto';
import { RefreshDto } from '../web/dto/refresh.dto';
import { RegisterDto } from '../web/dto/register.dto';
import { RegisterResponseDto } from '../web/dto/register-response.dto';

const LOGIN_FAILED_MESSAGE =
  'Email atau password salah, atau akun tidak aktif.'; // FR-AUTH-006: pesan disamarkan

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  // FR-AUTH-001-004, FR-TEN-001-003: Merchant + User OWNER dibuat atomik.
  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const emailNormalized = normalizeEmail(dto.email);

    const existing = await this.userRepository.findByEmail(emailNormalized);
    if (existing) {
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
      await tx.merchant.create({
        data: {
          id: merchantId,
          ownerUserId: userId, // tidak ada FK, hanya unique; owner dibuat pada transaksi yang sama
          name: dto.merchant_name,
        },
      });
      await tx.user.create({
        data: {
          id: userId,
          merchantId,
          outletId: null,
          emailNormalized,
          emailOriginal: dto.email.trim(),
          passwordHash,
          fullName: dto.name.trim(),
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });
    });

    return {
      user_id: userId,
      merchant_id: merchantId,
      email: emailNormalized,
      role: 'OWNER',
    };
  }

  // FR-AUTH-005-007, FR-AUTH-010
  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.userRepository.findByEmail(
      normalizeEmail(dto.email),
    );
    if (!user) {
      throw ApiError.unauthenticated(LOGIN_FAILED_MESSAGE);
    }

    const passwordValid = await this.passwordService.verify(
      user.passwordHash,
      dto.password,
    );
    if (!passwordValid) {
      throw ApiError.unauthenticated(LOGIN_FAILED_MESSAGE);
    }
    if (user.status !== 'ACTIVE') {
      throw ApiError.unauthenticated(LOGIN_FAILED_MESSAGE);
    }

    return this.issueTokens(user);
  }

  // FR-AUTH-007/008: refresh token valid & berotasi (revoke lama, terbitkan baru).
  async refresh(dto: RefreshDto): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const tokenHash = this.tokenService.hashRefreshToken(dto.refresh_token);
    const record =
      await this.refreshTokenRepository.findActiveByHash(tokenHash);
    if (
      !record ||
      record.revokedAt !== null ||
      record.expiresAt.getTime() <= Date.now()
    ) {
      throw ApiError.unauthenticated(
        'Sesi tidak valid atau sudah kedaluwarsa.',
      );
    }

    const user = await this.userRepository.findById(record.userId);
    if (!user || user.status !== 'ACTIVE') {
      await this.refreshTokenRepository.revokeById(record.id);
      throw ApiError.unauthenticated(
        'Sesi tidak valid atau sudah kedaluwarsa.',
      );
    }

    await this.refreshTokenRepository.revokeById(record.id);

    const access = this.tokenService.signAccessToken(this.toClaims(user));
    const refresh = this.tokenService.signRefreshToken(this.toClaims(user));
    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: this.tokenService.hashRefreshToken(refresh.token),
      expiresAt: new Date(Date.now() + refresh.expiresInSeconds * 1_000),
    });

    return {
      access_token: access.token,
      refresh_token: refresh.token,
      expires_in: access.expiresInSeconds,
    };
  }

  // FR-AUTH-008: logout mencabut refresh token (FR-AUTH-008).
  async logout(dto: LogoutDto): Promise<void> {
    if (!dto.refresh_token) {
      return;
    }
    const record = await this.refreshTokenRepository.findActiveByHash(
      this.tokenService.hashRefreshToken(dto.refresh_token),
    );
    if (record) {
      await this.refreshTokenRepository.revokeById(record.id);
    }
  }

  private async issueTokens(user: User): Promise<AuthTokensDto> {
    const access = this.tokenService.signAccessToken(this.toClaims(user));
    const refresh = this.tokenService.signRefreshToken(this.toClaims(user));
    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: this.tokenService.hashRefreshToken(refresh.token),
      expiresAt: new Date(Date.now() + refresh.expiresInSeconds * 1_000),
    });
    return {
      access_token: access.token,
      refresh_token: refresh.token,
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
