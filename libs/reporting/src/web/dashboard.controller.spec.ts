// memverifikasi dispatch HTTP ke DashboardQueryService pada DashboardController.
import { AuthUser } from '@app/platform';
import { DashboardQueryService } from '../application/dashboard-query.service';
import { DashboardController } from './dashboard.controller';

function makeMockDashboardQuery() {
  return {
    getSummary: jest.fn(),
    getSalesTrend: jest.fn(),
    getAovTrend: jest.fn(),
    getTimePattern: jest.fn(),
    getTopProducts: jest.fn(),
    getOutletComparison: jest.fn(),
    getOperations: jest.fn(),
    getLowStock: jest.fn(),
  };
}

function makeActor(overrides?: Partial<AuthUser>): AuthUser {
  return {
    userId: 'user-001',
    role: 'OWNER',
    merchantId: 'mch-001',
    outletId: null,
    ...overrides,
  };
}

function makeMeta() {
  return {
    dataUpdatedAt: new Date('2026-08-17T10:00:00Z'),
    freshnessStatus: 'FRESH' as const,
    timezone: 'Asia/Jakarta',
    periodStart: new Date('2026-08-01T00:00:00Z'),
    periodEnd: new Date('2026-08-31T23:59:59Z'),
  };
}

describe('DashboardController', () => {
  let controller: DashboardController;
  let mockQuery: ReturnType<typeof makeMockDashboardQuery>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = makeMockDashboardQuery();
    controller = new DashboardController(
      mockQuery as unknown as DashboardQueryService,
    );
  });

  const periodQuery = { date_from: '2026-08-01', date_to: '2026-08-31' };
  const trendQuery = { ...periodQuery, bucket: 'DAY' };

  it('GET /dashboard/summary mendelegasikan ke getSummary', async () => {
    mockQuery.getSummary.mockResolvedValue({
      omzet: '1000000', transactionCount: 50, averageTransactionValue: '20000',
      ...makeMeta(),
    });

    const result = await controller.summary(makeActor(), periodQuery as never);

    expect(mockQuery.getSummary).toHaveBeenCalledWith(expect.objectContaining({
      merchantId: 'mch-001',
      dateFrom: expect.any(Date),
      dateTo: expect.any(Date),
    }));
    expect(result).toMatchObject({ omzet: '1000000', transaction_count: 50 });
  });

  it('GET /dashboard/sales-trend mendelegasikan ke getSalesTrend', async () => {
    mockQuery.getSalesTrend.mockResolvedValue({
      bucket: 'DAY', meta: makeMeta(), points: [],
    });

    const result = await controller.salesTrend(makeActor(), trendQuery as never);

    expect(mockQuery.getSalesTrend).toHaveBeenCalled();
    expect(result).toMatchObject({ bucket: 'DAY', points: [] });
  });

  it('GET /dashboard/aov-trend mendelegasikan ke getAovTrend', async () => {
    mockQuery.getAovTrend.mockResolvedValue({
      bucket: 'DAY', meta: makeMeta(), points: [],
    });

    const result = await controller.aovTrend(makeActor(), trendQuery as never);

    expect(mockQuery.getAovTrend).toHaveBeenCalled();
    expect(result).toMatchObject({ bucket: 'DAY' });
  });

  it('GET /dashboard/time-pattern mendelegasikan ke getTimePattern', async () => {
    mockQuery.getTimePattern.mockResolvedValue({
      meta: makeMeta(), points: [],
    });

    const result = await controller.timePattern(makeActor(), periodQuery as never);

    expect(mockQuery.getTimePattern).toHaveBeenCalled();
    expect(result).toMatchObject({ points: [] });
  });

  it('GET /dashboard/top-products mendelegasikan ke getTopProducts', async () => {
    mockQuery.getTopProducts.mockResolvedValue({
      meta: makeMeta(), topSelling: [], leastSelling: [],
    });

    const result = await controller.topProducts(makeActor(), { ...periodQuery, limit: 5 } as never);

    expect(mockQuery.getTopProducts).toHaveBeenCalled();
    expect(result).toMatchObject({ top_selling: [], least_selling: [] });
  });

  it('GET /dashboard/outlet-comparison mendelegasikan ke getOutletComparison', async () => {
    mockQuery.getOutletComparison.mockResolvedValue({
      meta: makeMeta(), items: [],
    });

    const result = await controller.outletComparison(makeActor(), periodQuery as never);

    expect(mockQuery.getOutletComparison).toHaveBeenCalled();
    expect(result).toMatchObject({ items: [] });
  });

  it('GET /dashboard/operations mendelegasikan ke getOperations', async () => {
    mockQuery.getOperations.mockResolvedValue({
      inventoryItemCount: 10, lowStockItemCount: 2, outOfStockItemCount: 1,
      activeProductCount: 20, inactiveProductCount: 3, inactiveCategoryCount: 1,
      outletId: null, dataUpdatedAt: new Date(), freshnessStatus: 'FRESH', timezone: 'Asia/Jakarta',
    });

    const result = await controller.operations(makeActor(), { outlet_id: undefined } as never);

    expect(mockQuery.getOperations).toHaveBeenCalledWith({
      merchantId: 'mch-001',
      outletId: undefined,
    });
    expect(result).toMatchObject({ inventory_item_count: 10 });
  });

  it('GET /dashboard/low-stock mendelegasikan ke getLowStock', async () => {
    mockQuery.getLowStock.mockResolvedValue({
      items: [], dataUpdatedAt: new Date(), freshnessStatus: 'FRESH', timezone: 'Asia/Jakarta',
    });

    const result = await controller.lowStock(makeActor(), { outlet_id: undefined } as never);

    expect(mockQuery.getLowStock).toHaveBeenCalledWith({
      merchantId: 'mch-001',
      outletId: undefined,
    });
    expect(result).toMatchObject({ items: [], freshness_status: 'FRESH' });
  });
});
