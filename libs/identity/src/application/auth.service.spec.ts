import { User } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { RefreshTokenRepository } from '../infrastructure/refresh-token.repository';
import { UserRepository } from '../infrastructure/user.repository';

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  merchantId: 'merchant-1',
  outletId: null,
  emailNormalized: 'budi@warungku.id',
  emailOriginal: 'Budi@Warungku.id',
  passwordHash: 'argon2-hash',
  fullName: 'Budi',
  role: 'OWNER',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
});

const registerDto = {
  name: 'Budi',
  email: 'Budi@Warungku.id',
  password: 'P4ssw0rd!',
  merchant_name: 'Warung Budi',
};

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    $transaction: jest.fn(
      async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
        fn({
          merchant: {
            create: jest.fn((a: { data: { id: string } }) =>
              Promise.resolve({ id: a.data.id }),
            ),
          },
          user: {
            create: jest.fn((a: { data: { id: string } }) =>
              Promise.resolve({ id: a.data.id }),
            ),
          },
        }),
    ),
  };
  const userRepository = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
  };
  const refreshTokenRepository = {
    create: jest.fn(),
    findActiveByHash: jest.fn(),
    revokeById: jest.fn(),
  };
  const passwordService = {
    hash: jest.fn(() => Promise.resolve('argon2-hash')),
    verify: jest.fn(() => Promise.resolve(true)),
  };
  const tokenService = {
    signAccessToken: jest.fn(() => ({
      token: 'access-token',
      expiresInSeconds: 900,
    })),
    signRefreshToken: jest.fn(() => ({
      token: 'refresh-token',
      expiresInSeconds: 2_592_000,
    })),
    hashRefreshToken: jest.fn((t: string) => `hash:${t}`),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      prisma as unknown as PrismaWriteService,
      userRepository as unknown as UserRepository,
      refreshTokenRepository as unknown as RefreshTokenRepository,
      passwordService,
      tokenService as unknown as TokenService,
    );
  });

  describe('register (FR-AUTH-001-004)', () => {
    it('membuat Merchant + User OWNER secara atomik', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      const result = await service.register(registerDto);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        'budi@warungku.id',
      );
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toMatchObject({
        email: 'budi@warungku.id',
        role: 'OWNER',
      });
      expect(result.user_id).toBeTruthy();
      expect(result.merchant_id).toBeTruthy();
    });

    it('menolak email duplikat dengan EMAIL_ALREADY_REGISTERED', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      const err = await service.register(registerDto).catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('EMAIL_ALREADY_REGISTERED');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('login (FR-AUTH-005-007, 010)', () => {
    it('berhasil menerbitkan token pair', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      const result = await service.login({
        email: 'budi@warungku.id',
        password: 'P4ssw0rd!',
      });
      expect(result).toMatchObject({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        role: 'OWNER',
        merchant_id: 'merchant-1',
      });
      expect(refreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          tokenHash: 'hash:refresh-token',
        }),
      );
    });

    it('menyamarkan kegagalan password (FR-AUTH-006)', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      passwordService.verify.mockResolvedValue(false);
      const err = await service
        .login({ email: 'budi@warungku.id', password: 'salah' })
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('UNAUTHENTICATED');
      expect((err as { message: string }).message).toContain(
        'akun tidak aktif',
      );
    });

    it('menolak akun non-AKTIF dengan pesan yang sama', async () => {
      userRepository.findByEmail.mockResolvedValue(
        makeUser({ status: 'INACTIVE' }),
      );
      const err = await service
        .login({ email: 'budi@warungku.id', password: 'P4ssw0rd!' })
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('UNAUTHENTICATED');
    });
  });

  describe('refresh (FR-AUTH-007/008)', () => {
    it('merotasi token lama menjadi pasangan baru', async () => {
      refreshTokenRepository.findActiveByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'hash:old',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      });
      userRepository.findById.mockResolvedValue(makeUser());
      const result = await service.refresh({ refresh_token: 'old-token' });
      expect(refreshTokenRepository.revokeById).toHaveBeenCalledWith('rt-1');
      expect(refreshTokenRepository.create).toHaveBeenCalled();
      expect(result.access_token).toBe('access-token');
    });

    it('menolak token yang sudah kedaluwarsa', async () => {
      refreshTokenRepository.findActiveByHash.mockResolvedValue(null);
      const err = await service
        .refresh({ refresh_token: 'expired' })
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('UNAUTHENTICATED');
    });
  });

  describe('logout (FR-AUTH-008)', () => {
    it('mencabut refresh token yang valid', async () => {
      refreshTokenRepository.findActiveByHash.mockResolvedValue({ id: 'rt-1' });
      await service.logout({ refresh_token: 'tok' });
      expect(refreshTokenRepository.revokeById).toHaveBeenCalledWith('rt-1');
    });

    it('no-op bila refresh_token kosong', async () => {
      await service.logout({});
      expect(refreshTokenRepository.revokeById).not.toHaveBeenCalled();
    });
  });
});
