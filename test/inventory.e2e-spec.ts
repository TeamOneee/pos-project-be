// E2E: manajemen stok — AT-019 (threshold override per outlet).
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { Reflector } from '@nestjs/core';
import { InventoryController } from '@app/inventory/web/inventory.controller';
import { InventoryQueryService } from '@app/inventory/application/inventory-query.service';
import { StockAdjustmentService } from '@app/inventory/application/stock-adjustment.service';
import { LowStockThresholdService } from '@app/inventory/application/low-stock-threshold.service';
import { StockMovementQueryService } from '@app/inventory/application/stock-movement-query.service';
import { AllExceptionsFilter } from '@app/platform/error/all-exceptions.filter';
import { SuccessResponseInterceptor } from '@app/platform/web/success-response.interceptor';
import { PageResponseDto } from '@app/platform/web/page-response.dto';

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

const VALID_PRODUCT_UUID = '550e8400-e29b-41d4-a716-446655440001';
const VALID_OUTLET_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('E2E — Inventory Threshold (AT-019)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        { provide: InventoryQueryService, useValue: mockInventoryQueryService },
        { provide: StockAdjustmentService, useValue: mockStockAdjustmentService },
        { provide: LowStockThresholdService, useValue: mockLowStockThresholdService },
        { provide: StockMovementQueryService, useValue: mockStockMovementQueryService },
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

  describe('PUT /api/v1/inventory/:product_id/outlets/:outlet_id/low-stock-threshold', () => {
    it('AT-019: menetapkan threshold override per outlet', async () => {
      mockLowStockThresholdService.setThreshold.mockResolvedValue({
        productId: VALID_PRODUCT_UUID,
        outletId: VALID_OUTLET_UUID,
        baseLowStockThreshold: 5,
        lowStockThresholdOverride: 2,
        effectiveLowStockThreshold: 2,
        updatedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .put(`/api/v1/inventory/${VALID_PRODUCT_UUID}/outlets/${VALID_OUTLET_UUID}/low-stock-threshold`)
        .send({ threshold: 2 })
        .expect(200);

      expect(res.body.data).toMatchObject({
        product_id: VALID_PRODUCT_UUID,
        outlet_id: VALID_OUTLET_UUID,
        effective_low_stock_threshold: 2,
      });
      expect(mockLowStockThresholdService.setThreshold).toHaveBeenCalledWith(
        expect.objectContaining({ merchantId: 'mch-001' }),
        VALID_PRODUCT_UUID,
        VALID_OUTLET_UUID,
        2,
      );
    });
  });

  describe('DELETE /api/v1/inventory/:product_id/outlets/:outlet_id/low-stock-threshold', () => {
    it('AT-019: menghapus threshold override mengembalikan ke threshold dasar', async () => {
      mockLowStockThresholdService.deleteThreshold.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/api/v1/inventory/${VALID_PRODUCT_UUID}/outlets/${VALID_OUTLET_UUID}/low-stock-threshold`)
        .expect(204);

      expect(mockLowStockThresholdService.deleteThreshold).toHaveBeenCalledWith(
        expect.objectContaining({ merchantId: 'mch-001' }),
        VALID_PRODUCT_UUID,
        VALID_OUTLET_UUID,
      );
    });
  });

  describe('POST /api/v1/inventory/adjustments', () => {
    it('adjustment stok mengembalikan data penyesuaian', async () => {
      mockStockAdjustmentService.adjust.mockResolvedValue({
        movementId: 'mov-001',
        productId: VALID_PRODUCT_UUID,
        outletId: VALID_OUTLET_UUID,
        delta: 10,
        quantityBefore: 5,
        quantityAfter: 15,
        reason: 'Restock dari supplier',
        actorUserId: 'owner-1',
        createdAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/adjustments')
        .send({
          outlet_id: VALID_OUTLET_UUID,
          product_id: VALID_PRODUCT_UUID,
          delta: 10,
          reason: 'Restock dari supplier',
        })
        .expect(201);

      expect(res.body.data).toMatchObject({
        product_id: VALID_PRODUCT_UUID,
        delta: 10,
        quantity_after: 15,
      });
    });
  });

  describe('GET /api/v1/inventory', () => {
    it('daftar inventory mengembalikan data', async () => {
      mockInventoryQueryService.list.mockResolvedValue(
        PageResponseDto.from([], 1, 10, 0),
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory')
        .query({ outlet_id: VALID_OUTLET_UUID })
        .expect(200);

      expect(res.body.data).toHaveProperty('total_elements');
    });
  });
});
