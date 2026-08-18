// E2E: merchant & outlet — AT-030 (merchant scope, outlet CRUD).
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { Reflector } from '@nestjs/core';
import { MerchantController } from '@app/tenant/web/merchant.controller';
import { OutletController } from '@app/tenant/web/outlet.controller';
import { MerchantService } from '@app/tenant/application/merchant.service';
import { OutletService } from '@app/tenant/application/outlet.service';
import { AllExceptionsFilter } from '@app/platform/error/all-exceptions.filter';
import { SuccessResponseInterceptor } from '@app/platform/web/success-response.interceptor';
import { PageResponseDto } from '@app/platform/web/page-response.dto';

const mockMerchantService = { getProfile: jest.fn(), updateProfile: jest.fn() };
const mockOutletService = { list: jest.fn(), create: jest.fn() };

const ownerUser = {
  userId: 'owner-1',
  merchantId: 'mch-001',
  role: 'OWNER',
  outletId: null,
};

describe('E2E — Merchant & Outlet (AT-030)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MerchantController, OutletController],
      providers: [
        { provide: MerchantService, useValue: mockMerchantService },
        { provide: OutletService, useValue: mockOutletService },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: (ctx: {
              switchToHttp: () => { getRequest: () => { user: unknown } };
            }) => {
              ctx.switchToHttp().getRequest().user = ownerUser;
              return true;
            },
          },
        },
      ],
    }).compile();

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

  describe('GET /api/v1/merchant', () => {
    it('AT-030: profil merchant dikembalikan lengkap', async () => {
      mockMerchantService.getProfile.mockResolvedValue({
        merchantId: 'mch-001',
        name: 'Kopi Nusantara',
        phoneNumber: '08123456789',
        createdAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/merchant')
        .expect(200);

      expect(res.body.data).toMatchObject({
        merchantId: 'mch-001',
        name: 'Kopi Nusantara',
      });
    });
  });

  describe('PATCH /api/v1/merchant', () => {
    it('AT-030: update profil merchant berhasil', async () => {
      mockMerchantService.updateProfile.mockResolvedValue({
        merchantId: 'mch-001',
        name: 'Kopi Nusantara Updated',
        phoneNumber: '08999888777',
        updatedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .patch('/api/v1/merchant')
        .send({ name: 'Kopi Nusantara Updated', phone_number: '08999888777' })
        .expect(200);

      expect(res.body.data).toMatchObject({
        name: 'Kopi Nusantara Updated',
      });
    });
  });

  describe('GET /api/v1/outlets', () => {
    it('AT-030: daftar outlet merchant dikembalikan', async () => {
      mockOutletService.list.mockResolvedValue(
        PageResponseDto.from(
          [{ outletId: 'out-001', name: 'Outlet A', isActive: true }],
          1,
          10,
          1,
        ),
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/outlets')
        .expect(200);

      expect(res.body.data.content).toHaveLength(1);
    });
  });

  describe('POST /api/v1/outlets', () => {
    it('AT-030: membuat outlet baru', async () => {
      mockOutletService.create.mockResolvedValue({
        outletId: 'out-002',
        name: 'Outlet B',
        isActive: true,
        createdAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/outlets')
        .send({ name: 'Outlet B', address: 'Jl. Thamrin' })
        .expect(201);

      expect(res.body.data).toMatchObject({
        outletId: 'out-002',
        name: 'Outlet B',
      });
    });
  });
});
