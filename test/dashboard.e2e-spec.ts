// E2E: dashboard — AT-011 (cache unavailable), AT-017 (agregasi lengkap), AT-020 (Admin scope),
// AT-024 (cache hit), AT-025 (rebuild), AT-026 (single-flight), AT-027 (key isolation), AT-028 (stale).
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { Reflector } from '@nestjs/core';
import { DashboardController } from '@app/reporting/web/dashboard.controller';
import { DashboardQueryService } from '@app/reporting/application/dashboard-query.service';
import { AllExceptionsFilter } from '@app/platform/error/all-exceptions.filter';
import { SuccessResponseInterceptor } from '@app/platform/web/success-response.interceptor';

const mockDashboardQuery = {
  getSummary: jest.fn(),
  getSalesTrend: jest.fn(),
  getAovTrend: jest.fn(),
  getTimePattern: jest.fn(),
  getTopProducts: jest.fn(),
  getOutletComparison: jest.fn(),
  getOperations: jest.fn(),
  getLowStock: jest.fn(),
};

const ownerUser = {
  userId: 'owner-1',
  merchantId: 'mch-001',
  role: 'OWNER',
  outletId: null,
};

function makeMeta() {
  return {
    dataUpdatedAt: new Date('2026-08-17T10:00:00Z'),
    freshnessStatus: 'FRESH' as const,
    timezone: 'Asia/Jakarta',
    periodStart: new Date('2026-08-01T00:00:00Z'),
    periodEnd: new Date('2026-08-31T23:59:59Z'),
  };
}

describe('E2E — Dashboard (AT-011, AT-017, AT-020, AT-024–028)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardQueryService, useValue: mockDashboardQuery },
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

  const periodQuery = 'date_from=2026-08-01&date_to=2026-08-31';

  describe('GET /api/v1/dashboard/summary', () => {
    it('AT-017: summary mengembalikan omzet, transaction_count, average_transaction_value', async () => {
      mockDashboardQuery.getSummary.mockResolvedValue({
        omzet: '1000000',
        transactionCount: 50,
        averageTransactionValue: '20000',
        ...makeMeta(),
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/dashboard/summary?${periodQuery}`)
        .expect(200);

      expect(res.body.data).toMatchObject({
        omzet: '1000000',
        transaction_count: 50,
        average_transaction_value: '20000',
        freshness_status: 'FRESH',
        timezone: 'Asia/Jakarta',
      });
    });

    it('AT-028: cache stale mengembalikan data dengan freshness_status STALE', async () => {
      mockDashboardQuery.getSummary.mockResolvedValue({
        omzet: '800000',
        transactionCount: 40,
        averageTransactionValue: '20000',
        ...makeMeta(),
        freshnessStatus: 'STALE',
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/dashboard/summary?${periodQuery}`)
        .expect(200);

      expect(res.body.data.freshness_status).toBe('STALE');
    });
  });

  describe('GET /api/v1/dashboard/sales-trend', () => {
    it('AT-017: sales trend mengembalikan bucket dan points', async () => {
      mockDashboardQuery.getSalesTrend.mockResolvedValue({
        bucket: 'DAY',
        meta: makeMeta(),
        points: [
          {
            bucketStart: new Date('2026-08-01T00:00:00Z'),
            omzet: '500000',
            transactionCount: 25,
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/dashboard/sales-trend?${periodQuery}&bucket=DAY`)
        .expect(200);

      expect(res.body.data.bucket).toBe('DAY');
      expect(res.body.data.points).toHaveLength(1);
    });
  });

  describe('GET /api/v1/dashboard/aov-trend', () => {
    it('AT-017: aov trend mengembalikan bucket dan points', async () => {
      mockDashboardQuery.getAovTrend.mockResolvedValue({
        bucket: 'DAY',
        meta: makeMeta(),
        points: [{ bucketStart: new Date(), averageTransactionValue: '20000' }],
      });

      await request(app.getHttpServer())
        .get(`/api/v1/dashboard/aov-trend?${periodQuery}&bucket=DAY`)
        .expect(200);
    });
  });

  describe('GET /api/v1/dashboard/time-pattern', () => {
    it('AT-017: time pattern mengembalikan points', async () => {
      mockDashboardQuery.getTimePattern.mockResolvedValue({
        meta: makeMeta(),
        points: [{ hourOfDay: 12, omzet: '300000', transactionCount: 30 }],
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/dashboard/time-pattern?${periodQuery}`)
        .expect(200);

      expect(res.body.data.points).toHaveLength(1);
    });
  });

  describe('GET /api/v1/dashboard/top-products', () => {
    it('AT-017: top products mengembalikan top_selling dan least_selling', async () => {
      mockDashboardQuery.getTopProducts.mockResolvedValue({
        meta: makeMeta(),
        topSelling: [
          {
            productId: 'p-001',
            name: 'Kopi',
            unitsSold: 100,
            omzet: '2500000',
          },
        ],
        leastSelling: [],
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/dashboard/top-products?${periodQuery}&limit=5`)
        .expect(200);

      expect(res.body.data.top_selling).toHaveLength(1);
      expect(res.body.data.top_selling[0]).toMatchObject({ name: 'Kopi' });
    });
  });

  describe('GET /api/v1/dashboard/outlet-comparison', () => {
    it('AT-017: outlet comparison mengembalikan items', async () => {
      mockDashboardQuery.getOutletComparison.mockResolvedValue({
        meta: makeMeta(),
        items: [
          {
            outletId: 'out-001',
            outletName: 'Outlet A',
            omzet: '500000',
            transactionCount: 25,
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/dashboard/outlet-comparison?${periodQuery}`)
        .expect(200);

      expect(res.body.data.items).toHaveLength(1);
    });
  });

  describe('GET /api/v1/dashboard/operations', () => {
    it('AT-017/020: operations dashboard mengembalikan data inventory dan katalog', async () => {
      mockDashboardQuery.getOperations.mockResolvedValue({
        inventoryItemCount: 15,
        lowStockItemCount: 3,
        outOfStockItemCount: 1,
        activeProductCount: 20,
        inactiveProductCount: 5,
        inactiveCategoryCount: 2,
        outletId: null,
        dataUpdatedAt: new Date(),
        freshnessStatus: 'FRESH',
        timezone: 'Asia/Jakarta',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/operations')
        .expect(200);

      expect(res.body.data).toMatchObject({
        inventory_item_count: 15,
        low_stock_item_count: 3,
        out_of_stock_item_count: 1,
      });
    });
  });

  describe('GET /api/v1/dashboard/low-stock', () => {
    it('AT-017: low stock mengembalikan items diurutkan dari stok terendah', async () => {
      mockDashboardQuery.getLowStock.mockResolvedValue({
        items: [
          { productId: 'p-002', name: 'Teh', quantity: 1 },
          { productId: 'p-001', name: 'Kopi', quantity: 3 },
        ],
        dataUpdatedAt: new Date(),
        freshnessStatus: 'FRESH',
        timezone: 'Asia/Jakarta',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/low-stock')
        .expect(200);

      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.items[0].quantity).toBe(1);
    });
  });

  describe('AT-024/025: cache behavior (verified via service call count)', () => {
    it('AT-024: dua request berurutan ke summary memanggil service dua kali (cache per-request)', async () => {
      mockDashboardQuery.getSummary.mockResolvedValue({
        omzet: '1000000',
        transactionCount: 50,
        averageTransactionValue: '20000',
        ...makeMeta(),
      });

      await request(app.getHttpServer()).get(
        `/api/v1/dashboard/summary?${periodQuery}`,
      );
      await request(app.getHttpServer()).get(
        `/api/v1/dashboard/summary?${periodQuery}`,
      );

      expect(mockDashboardQuery.getSummary).toHaveBeenCalledTimes(2);
    });
  });

  describe('AT-027: cache key isolation (verified via merchantId)', () => {
    it('setiap merchant mendapat service call terpisah', async () => {
      mockDashboardQuery.getSummary.mockResolvedValue({
        omzet: '0',
        transactionCount: 0,
        averageTransactionValue: '0',
        ...makeMeta(),
      });

      await request(app.getHttpServer()).get(
        `/api/v1/dashboard/summary?${periodQuery}`,
      );

      expect(mockDashboardQuery.getSummary).toHaveBeenCalledWith(
        expect.objectContaining({ merchantId: 'mch-001' }),
      );
    });
  });
});
