import { User } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { UserRepository } from '../infrastructure/user.repository';

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  merchantId: 'merchant-1',
  outletId: null,
  name: 'Budi',
  email: 'budi@warungku.id',
  passwordHash: 'argon2-hash',
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
  const passwordService = {
    hash: jest.fn(() => Promise.resolve('argon2-hash')),
    verify: jest.fn(() => Promise.resolve(true)),
  };
  const tokenService = {
    signAccessToken: jest.fn(() => ({
      token: 'access-token',
      expiresInSeconds: 900,
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      prisma as unknown as PrismaWriteService,
      userRepository as unknown as UserRepository,
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
    it('berhasil menerbitkan access token tanpa refresh token', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      const result = await service.login({
        email: 'budi@warungku.id',
        password: 'P4ssw0rd!',
      });
      expect(result).toMatchObject({
        access_token: 'access-token',
        expires_in: 900,
        role: 'OWNER',
        merchant_id: 'merchant-1',
        outlet_id: null,
      });
      expect(result).not.toHaveProperty('refresh_token');
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
});
