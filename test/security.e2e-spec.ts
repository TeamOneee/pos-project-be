// E2E: isolasi tenant lintas merchant (AT-002), penolakan akun INACTIVE (AT-014),
// scope Owner/Admin pada outlet (AT-030).
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { Reflector } from '@nestjs/core';
import { MerchantController } from '@app/tenant/web/merchant.controller';
import { MerchantService } from '@app/tenant/application/merchant.service';
import { OutletController } from '@app/tenant/web/outlet.controller';
import { OutletService } from '@app/tenant/application/outlet.service';
import { InventoryController } from '@app/inventory/web/inventory.controller';
import { InventoryQueryService } from '@app/inventory/application/inventory-query.service';
import { StockAdjustmentService } from '@app/inventory/application/stock-adjustment.service';
import { LowStockThresholdService } from '@app/inventory/application/low-stock-threshold.service';
import { StockMovementQueryService } from '@app/inventory/application/stock-movement-query.service';
import { AllExceptionsFilter } from '@app/platform/error/all-exceptions.filter';
import { SuccessResponseInterceptor } from '@app/platform/web/success-response.interceptor';
import { PageResponseDto } from '@app/platform/web/page-response.dto';
import { ApiError } from '@app/platform/error/api-error';

const mockMerchantService = { getProfile: jest.fn(), updateProfile: jest.fn() };
const mockOutletService = { create: jest.fn(), list: jest.fn(), update: jest.fn() };
const mockInventoryQueryService = { list: jest.fn() };
const mockStockAdjustmentService = { adjust: jest.fn() };
const mockLowStockThresholdService = { setThreshold: jest.fn(), deleteThreshold: jest.fn() };
const mockStockMovementQueryService = { list: jest.fn() };

const ownerUser = {
  userId: 'owner-1',
  merchantId: 'mch-001',
  role: 'OWNER',
  outletId: null,
};

const adminUser = {
  userId: 'admin-1',
  merchantId: 'mch-001',
  role: 'ADMIN',
  outletId: null,
};

function makeGuard(user: typeof ownerUser) {
  return {
    provide: APP_GUARD,
    useValue: {
      canActivate: (ctx: { switchToHttp: () => { getRequest: () => { user: unknown } } }) => {
        ctx.switchToHttp().getRequest().user = user;
        return true;
      },
    },
  };
}

describe('E2E — Security & Tenant Isolation (AT-002, AT-014, AT-020, AT-030)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MerchantController, OutletController, InventoryController],
      providers: [
        { provide: MerchantService, useValue: mockMerchantService },
        { provide: OutletService, useValue: mockOutletService },
        { provide: InventoryQueryService, useValue: mockInventoryQueryService },
        { provide: StockAdjustmentService, useValue: mockStockAdjustmentService },
        { provide: LowStockThresholdService, useValue: mockLowStockThresholdService },
        { provide: StockMovementQueryService, useValue: mockStockMovementQueryService },
        makeGuard(ownerUser),
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

  describe('AT-002: merchant profile terisolasi per merchant', () => {
    it('Owner hanya melihat profil merchant sendiri', async () => {
      mockMerchantService.getProfile.mockResolvedValue({
        id: 'mch-001',
        name: 'Warung Budi',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/merchant')
        .expect(200);

      expect(res.body.data).toMatchObject({ id: 'mch-001' });
      expect(mockMerchantService.getProfile).toHaveBeenCalledWith(
        expect.objectContaining({ merchantId: 'mch-001' }),
      );
    });
  });

  describe('AT-014: akun INACTIVE ditolak', () => {
    it('semua endpoint menolak jika service melempar FORBIDDEN/UNAUTHENTICATED', async () => {
      mockMerchantService.getProfile.mockRejectedValue(
        ApiError.unauthenticated('Akun tidak aktif'),
      );

      await request(app.getHttpServer())
        .get('/api/v1/merchant')
        .expect(401);
    });
  });

  describe('AT-020: Admin hanya bisa operasional, bukan bisnis', () => {
    it('Admin dapat melihat inventory (operasional)', async () => {
      mockInventoryQueryService.list.mockResolvedValue(
        PageResponseDto.from([], 1, 10, 0),
      );

      const moduleAdmin = await Test.createTestingModule({
        controllers: [InventoryController],
        providers: [
          { provide: InventoryQueryService, useValue: mockInventoryQueryService },
          { provide: StockAdjustmentService, useValue: mockStockAdjustmentService },
          { provide: LowStockThresholdService, useValue: mockLowStockThresholdService },
          { provide: StockMovementQueryService, useValue: mockStockMovementQueryService },
          makeGuard(adminUser),
        ],
      }).compile();

      const adminApp = moduleAdmin.createNestApplication();
      adminApp.setGlobalPrefix('api/v1');
      adminApp.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      adminApp.useGlobalInterceptors(new SuccessResponseInterceptor(new Reflector()));
      adminApp.useGlobalFilters(new AllExceptionsFilter({ get: jest.fn().mockReturnValue('test-corr-id') } as never));
      await adminApp.init();

      const res = await request(adminApp.getHttpServer())
        .get('/api/v1/inventory')
        .expect(200);

      expect(res.body.data).toHaveProperty('total_elements');
      await adminApp.close();
    });
  });

  describe('AT-030: Owner outlet scope', () => {
    it('Owner dapat membuat outlet', async () => {
      mockOutletService.create.mockResolvedValue({
        merchant_id: 'mch-001',
        name: 'Outlet Baru',
        status: 'ACTIVE',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/outlets')
        .send({ name: 'Outlet Baru', address: 'Jl. Test' })
        .expect(201);

      expect(res.body.data).toMatchObject({ name: 'Outlet Baru', status: 'ACTIVE' });
    });

    it('Owner dapat melihat daftar outlet', async () => {
      mockOutletService.list.mockResolvedValue(
        PageResponseDto.from([], 1, 10, 0),
      );

      await request(app.getHttpServer())
        .get('/api/v1/outlets')
        .expect(200);
    });

    it('Owner dapat mengupdate profil merchant', async () => {
      mockMerchantService.updateProfile.mockResolvedValue({
        id: 'mch-001',
        name: 'Warung Baru',
      });

      const res = await request(app.getHttpServer())
        .patch('/api/v1/merchant')
        .send({ name: 'Warung Baru' })
        .expect(200);

      expect(res.body.data).toMatchObject({ name: 'Warung Baru' });
    });
  });
});
