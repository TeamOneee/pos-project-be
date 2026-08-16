// memverifikasi orkestrasi cache-aside, isolasi tenant, dan fallback stale dashboard query service.
import { DashboardQueryService } from './dashboard-query.service';

const request = {
  merchantId: 'merchant-1',
  outletId: 'outlet-1',
  dateFrom: new Date('2026-08-01T00:00:00.000Z'),
  dateTo: new Date('2026-08-31T23:59:59.999Z'),
};

describe('DashboardQueryService', () => {
  const cache = { getStale: jest.fn(), getOrLoad: jest.fn() };
  const sales = { listCompletedTransactionFacts: jest.fn() };
  const catalog = {
    getSellableProducts: jest.fn(),
    getCatalogReportingSummary: jest.fn(),
  };
  const tenant = { getContext: jest.fn() };
  const inventory = { getOperationalData: jest.fn(), listLowStock: jest.fn() };
  let service: DashboardQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    cache.getStale.mockResolvedValue(undefined);
    cache.getOrLoad.mockImplementation(
      async (_key: string, loader: () => Promise<unknown>) => ({
        entry: {
          data: await loader(),
          dataUpdatedAt: '2026-08-31T23:59:59.999Z',
        },
        source: 'COMPUTED',
      }),
    );
    sales.listCompletedTransactionFacts.mockResolvedValue([]);
    catalog.getSellableProducts.mockResolvedValue([]);
    catalog.getCatalogReportingSummary.mockResolvedValue({
      activeProductCount: 0,
      inactiveProductCount: 0,
      inactiveCategoryCount: 0,
    });
    tenant.getContext.mockResolvedValue({
      timezone: 'Asia/Jakarta',
      outlets: [{ id: 'outlet-1', name: 'Outlet 1' }],
    });
    inventory.getOperationalData.mockResolvedValue({
      inventoryItemCount: 0,
      lowStockItemCount: 0,
      outOfStockItemCount: 0,
    });
    inventory.listLowStock.mockResolvedValue([]);
    service = new DashboardQueryService(
      cache,
      sales,
      catalog,
      tenant,
      inventory,
    );
  });

  it('FR-REP-009: meneruskan merchant, outlet, dan periode ke sales port', async () => {
    await service.getTopProducts(request);
    expect(tenant.getContext).toHaveBeenCalledWith('merchant-1', 'outlet-1');
    expect(sales.listCompletedTransactionFacts).toHaveBeenCalledWith({
      ...request,
      timezone: 'Asia/Jakarta',
    });
  });

  it('FR-REP-001: cache hit tidak membaca source sales atau catalog lagi', async () => {
    cache.getOrLoad.mockResolvedValue({
      entry: {
        data: {
          omzet: '10000.00',
          transactionCount: 1,
          averageTransactionValue: '10000.00',
          bucket: 'DAY',
          salesTrend: [],
          aovTrend: [],
          timePattern: [],
          topSelling: [],
          leastSelling: [],
          outletComparison: [],
        },
        dataUpdatedAt: '2026-08-31T23:59:59.999Z',
      },
      source: 'CACHE',
    });
    const result = await service.getSummary(request);
    expect(result.omzet).toBe('10000.00');
    expect(sales.listCompletedTransactionFacts).not.toHaveBeenCalled();
    expect(catalog.getSellableProducts).not.toHaveBeenCalled();
  });

  it('FR-REP-006/007: source gagal memakai cache lama sebagai stale', async () => {
    cache.getStale.mockResolvedValue({
      data: {
        omzet: '9000.00',
        transactionCount: 1,
        averageTransactionValue: '9000.00',
        bucket: 'DAY',
        salesTrend: [],
        aovTrend: [],
        timePattern: [],
        topSelling: [],
        leastSelling: [],
        outletComparison: [],
      },
      dataUpdatedAt: '2026-08-01T00:00:00.000Z',
    });
    cache.getOrLoad.mockRejectedValue(new Error('replica down'));
    await expect(service.getSummary(request)).resolves.toMatchObject({
      omzet: '9000.00',
      freshnessStatus: 'STALE',
    });
  });

  it('menolak periode terbalik atau lebih dari 366 hari sebelum membaca source', async () => {
    await expect(
      service.getSummary({
        ...request,
        dateFrom: new Date('2026-09-01T00:00:00.000Z'),
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(
      service.getSummary({
        ...request,
        dateTo: new Date('2027-09-01T00:00:00.000Z'),
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(tenant.getContext).not.toHaveBeenCalled();
    expect(sales.listCompletedTransactionFacts).not.toHaveBeenCalled();
  });

  it('FR-REP-003: dashboard operasional tidak memanggil sales port', async () => {
    await expect(
      service.getOperations({ merchantId: 'merchant-1' }),
    ).resolves.toMatchObject({
      freshnessStatus: 'FRESH',
      inventoryItemCount: 0,
    });
    expect(sales.listCompletedTransactionFacts).not.toHaveBeenCalled();
  });
});
