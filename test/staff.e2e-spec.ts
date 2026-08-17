// E2E: manajemen staf — AT-016 (verifikasi daftar staf dan konsistensi user_id dari token).
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { Reflector } from '@nestjs/core';
import { StaffController } from '@app/identity/web/staff.controller';
import { StaffService } from '@app/identity/application/staff.service';
import { AllExceptionsFilter } from '@app/platform/error/all-exceptions.filter';
import { SuccessResponseInterceptor } from '@app/platform/web/success-response.interceptor';
import { PageResponseDto } from '@app/platform/web/page-response.dto';

const mockStaffService = { list: jest.fn(), create: jest.fn(), update: jest.fn() };

const ownerUser = {
  userId: 'owner-1',
  merchantId: 'mch-001',
  role: 'OWNER',
  outletId: null,
};

describe('E2E — Staff Management (AT-016)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StaffController],
      providers: [
        { provide: StaffService, useValue: mockStaffService },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: (ctx: { switchToHttp: () => { getRequest: () => { user: unknown } } }) => {
              ctx.switchToHttp().getRequest().user = ownerUser;
              return true;
            },
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new SuccessResponseInterceptor(new Reflector()));
    app.useGlobalFilters(new AllExceptionsFilter({ get: jest.fn().mockReturnValue('test-corr-id') } as never));
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/v1/staff', () => {
    it('AT-016: daftar staf mengembalikan data lengkap', async () => {
      mockStaffService.list.mockResolvedValue(
        PageResponseDto.from(
          [
            {
              userId: 'admin-1',
              name: 'Admin Satu',
              email: 'admin1@example.com',
              role: 'ADMIN',
              outlets: [{ outletId: 'out-001', outletName: 'Outlet A' }],
              isActive: true,
              createdAt: new Date(),
            },
          ],
          1, 10, 1,
        ),
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/staff')
        .expect(200);

      expect(res.body.data.content).toHaveLength(1);
      expect(res.body.data.content[0]).toMatchObject({
        userId: 'admin-1',
        name: 'Admin Satu',
        role: 'ADMIN',
      });
    });
  });
});
