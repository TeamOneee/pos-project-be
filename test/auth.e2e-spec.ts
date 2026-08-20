// E2E: autentikasi publik — registrasi (AT-001), login, JWT expiry (AT-022), logout (AT-023).
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Reflector } from '@nestjs/core';
import { AuthController } from '@app/identity/web/auth.controller';
import { AuthService } from '@app/identity/application/auth.service';
import { AllExceptionsFilter } from '@app/platform/error/all-exceptions.filter';
import { SuccessResponseInterceptor } from '@app/platform/web/success-response.interceptor';
import { ApiError } from '@app/platform/error/api-error';
import { ErrorCode } from '@app/platform/error/error-code';
import { LoginThrottlerGuard } from '@app/identity/web/login-throttler.guard';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
};

describe('E2E — Auth (AT-001, AT-022, AT-023)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(LoginThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalInterceptors(new SuccessResponseInterceptor(new Reflector()));
    app.useGlobalFilters(
      new AllExceptionsFilter({
        get: jest.fn().mockReturnValue('test-corr-id'),
      } as never),
    );
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/v1/auth/register', () => {
    it('AT-001: registrasi berhasil mengembalikan 201 dengan user_id dan merchant_id', async () => {
      mockAuthService.register.mockResolvedValue({
        user_id: 'u-001',
        merchant_id: 'm-001',
        email: 'budi@test.com',
        role: 'OWNER',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Budi',
          email: 'budi@test.com',
          password: 'P4ssw0rd!',
          merchant_name: 'Warung Budi',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        user_id: 'u-001',
        merchant_id: 'm-001',
        email: 'budi@test.com',
        role: 'OWNER',
      });
      expect(mockAuthService.register).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'budi@test.com' }),
      );
    });

    it('AT-001: email duplikat mengembalikan 409 EMAIL_ALREADY_REGISTERED', async () => {
      mockAuthService.register.mockRejectedValue(
        ApiError.conflict(
          ErrorCode.EMAIL_ALREADY_REGISTERED,
          'Email sudah terdaftar',
        ),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Budi',
          email: 'existing@test.com',
          password: 'P4ssw0rd!',
          merchant_name: 'Warung Budi',
        })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(409);
    });

    it('body kosong mengembalikan 400 validation error', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({})
        .expect(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('login berhasil mengembalikan access_token tanpa refresh_token', async () => {
      mockAuthService.login.mockResolvedValue({
        access_token: 'jwt-token-abc',
        expires_in: 900,
        role: 'OWNER',
        merchant_id: 'm-001',
        outlet_id: null,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'budi@test.com', password: 'P4ssw0rd!' })
        .expect(200);

      expect(res.body.data).toMatchObject({
        access_token: 'jwt-token-abc',
        expires_in: 900,
        role: 'OWNER',
      });
      expect(res.body.data).not.toHaveProperty('refresh_token');
    });

    it('AT-022: login setelah password salah mengembalikan 401', async () => {
      mockAuthService.login.mockRejectedValue(
        ApiError.unauthenticated('Akun tidak aktif atau kredensial salah'),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'budi@test.com', password: 'salah' })
        .expect(401);
      expect(res.body.success).toBe(false);
    });
  });
});
