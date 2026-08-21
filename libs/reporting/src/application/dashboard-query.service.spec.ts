// memverifikasi orkestrasi cache-aside, isolasi tenant, dan fallback stale dashboard query service.
import { ApiError } from '@app/platform';
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

  it('validasi menolak bucket yang tidak valid', async () => {
    await expect(
      service.getSummary({
        ...request,
        bucket: 'WEEK' as never,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('validasi menerima bucket HOUR', async () => {
    await expect(
      service.getSummary({
        ...request,
        bucket: 'HOUR',
      }),
    ).resolves.toBeDefined();
  });

  it('validasi menolak limit < 1', async () => {
    await expect(
      service.getSummary({
        ...request,
        limit: 0,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('validasi menolak limit > 100', async () => {
    await expect(
      service.getSummary({
        ...request,
        limit: 101,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('validasi menolak limit non-integer', async () => {
    await expect(
      service.getSummary({
        ...request,
        limit: 5.5,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('source dan stale keduanya gagal melempar DEPENDENCY_UNAVAILABLE', async () => {
    cache.getStale.mockResolvedValue(undefined);
    cache.getOrLoad.mockRejectedValue(new Error('total failure'));
    await expect(service.getSummary(request)).rejects.toMatchObject({
      code: 'DEPENDENCY_UNAVAILABLE',
    });
  });

  it('source gagal dengan ApiError melempar ulang ApiError', async () => {
    cache.getStale.mockResolvedValue(undefined);
    const apiErr = ApiError.validation('bad request');
    cache.getOrLoad.mockRejectedValue(apiErr);
    await expect(service.getSummary(request)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('getSalesTrend mengembalikan meta, bucket, dan points', async () => {
    const result = await service.getSalesTrend(request);
    expect(result).toHaveProperty('meta');
    expect(result).toHaveProperty('bucket');
    expect(result).toHaveProperty('points');
  });

  it('getAovTrend mengembalikan meta, bucket, dan points', async () => {
    const result = await service.getAovTrend(request);
    expect(result).toHaveProperty('meta');
    expect(result).toHaveProperty('bucket');
    expect(result).toHaveProperty('points');
  });

  it('getTimePattern mengembalikan meta dan points', async () => {
    const result = await service.getTimePattern(request);
    expect(result).toHaveProperty('meta');
    expect(result).toHaveProperty('points');
  });

  it('getTopProducts mengembalikan topSelling dan leastSelling', async () => {
    const result = await service.getTopProducts(request);
    expect(result).toHaveProperty('meta');
    expect(result).toHaveProperty('topSelling');
    expect(result).toHaveProperty('leastSelling');
  });

  it('getOutletComparison mengembalikan items', async () => {
    const result = await service.getOutletComparison(request);
    expect(result).toHaveProperty('meta');
    expect(result).toHaveProperty('items');
  });

  it('getLowStock mengembalikan items, dataUpdatedAt, freshnessStatus, timezone', async () => {
    const result = await service.getLowStock({ merchantId: 'merchant-1' });
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('dataUpdatedAt');
    expect(result.freshnessStatus).toBe('FRESH');
    expect(result.timezone).toBe('Asia/Jakarta');
  });

  it('getDataset mengembalikan summary, series, byOutlet, topProducts', async () => {
    const result = await service.getDataset({
      merchantId: 'merchant-1',
      dateFrom: new Date('2026-08-01'),
      dateTo: new Date('2026-08-31'),
      granularity: 'DAY',
    });
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('series');
    expect(result).toHaveProperty('byOutlet');
    expect(result).toHaveProperty('topProducts');
    expect(result).toHaveProperty('dataVersion');
  });

  it('getOperations mengembalikan operasional snapshot dengan timezone', async () => {
    const result = await service.getOperations({ merchantId: 'm-1' });
    expect(result.timezone).toBe('Asia/Jakarta');
    expect(result.freshnessStatus).toBe('FRESH');
  });

  it('getSummary dengan outletId undefined menggunakan all-outlets di cache key', async () => {
    await service.getSummary({
      ...request,
      outletId: undefined,
    });
    expect(tenant.getContext).toHaveBeenCalledWith('merchant-1', undefined);
  });

  it('menolak tanggal NaN', async () => {
    await expect(
      service.getSummary({ ...request, dateFrom: new Date('invalid') }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(
      service.getSummary({ ...request, dateTo: new Date('invalid') }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('getCachedFacts fallback ke stale ketika loader gagal', async () => {
    // prepare stale facts
    const staleFacts = [
      {
        outletId: 'outlet-1',
        transactionId: 'tx-1',
        occurredAt: new Date(),
        total: '10.00',
        items: [],
      },
    ];
    // cache.getStale akan dipanggil dua kali: sekali untuk factsKey dan sekali untuk dashboard key
    // kita buat implementasi yang return staleFacts untuk factsKey saja
    cache.getStale.mockImplementation((key: string) => {
      if (key.includes(':facts:'))
        return { data: staleFacts, dataUpdatedAt: '2026-08-01T00:00:00.000Z' };
      return undefined;
    });
    cache.getOrLoad.mockImplementation(
      async (key: string, loader: () => Promise<unknown>) => {
        if (key.includes(':facts:')) throw new Error('facts down');
        return {
          entry: {
            data: await loader(),
            dataUpdatedAt: '2026-08-31T23:59:59.999Z',
          },
          source: 'COMPUTED',
        };
      },
    );
    // loader untuk facts gagal tapi ada stale -> harus tetap berhasil via stale
    // Dashboard akan tetap hit karena facts fallback
    // Kita paksa sales gagal dengan stale
    const result = await service.getSummary(request);
    expect(result).toBeDefined();
  });

  it('getCachedFacts throw jika stale dan loader keduanya gagal', async () => {
    cache.getStale.mockResolvedValue(undefined);
    cache.getOrLoad.mockRejectedValue(new Error('both down'));
    await expect(service.getSummary(request)).rejects.toMatchObject({
      code: 'DEPENDENCY_UNAVAILABLE',
    });
  });

  it('getDataset mapping aovTrend fallback 0.00 ketika index missing', async () => {
    cache.getStale.mockResolvedValue(undefined);
    cache.getOrLoad.mockImplementation(
      async (key: string, loader: () => Promise<unknown>) => {
        if (key.includes(':facts:')) {
          return {
            entry: {
              data: await loader(),
              dataUpdatedAt: '2026-08-31T23:59:59.999Z',
            },
            source: 'COMPUTED',
          };
        }
        return {
          entry: {
            data: {
              omzet: '100.00',
              transactionCount: 1,
              averageTransactionValue: '100.00',
              bucket: 'DAY',
              salesTrend: [
                {
                  bucketStart: new Date('2026-08-15'),
                  omzet: '100.00',
                  transactionCount: 1,
                },
                {
                  bucketStart: new Date('2026-08-16'),
                  omzet: '50.00',
                  transactionCount: 1,
                },
              ],
              aovTrend: [
                {
                  bucketStart: new Date('2026-08-15'),
                  averageTransactionValue: '100.00',
                },
              ],
              timePattern: [],
              topSelling: [],
              leastSelling: [],
              outletComparison: [],
            },
            dataUpdatedAt: '2026-08-31T23:59:59.999Z',
          },
          source: 'COMPUTED',
        };
      },
    );
    const ds = await service.getDataset({
      merchantId: 'merchant-1',
      dateFrom: new Date('2026-08-01'),
      dateTo: new Date('2026-08-31'),
      granularity: 'DAY',
    });
    expect(ds.series[1].averageTransactionValue).toBe('0.00');
    expect(ds.series[0].averageTransactionValue).toBe('100.00');
  });

  it('getDataset tanpa granularity default DAY', async () => {
    cache.getStale.mockResolvedValue(undefined);
    cache.getOrLoad.mockImplementation(
      async (_k: string, loader: () => Promise<unknown>) => ({
        entry: {
          data: await loader(),
          dataUpdatedAt: '2026-08-31T23:59:59.999Z',
        },
        source: 'COMPUTED',
      }),
    );
    const result = await service.getDataset({
      merchantId: 'merchant-1',
      dateFrom: new Date('2026-08-01'),
      dateTo: new Date('2026-08-31'),
    });
    expect(result).toHaveProperty('byHour');
  });

  it('buildCacheKey dan factsKey menggunakan all-outlets dan versi', async () => {
    let capturedFactsKey = '';
    let capturedDashboardKey = '';
    cache.getStale.mockResolvedValue(undefined);
    cache.getOrLoad.mockImplementation(
      async (key: string, loader: () => Promise<unknown>) => {
        if (key.includes(':facts:')) capturedFactsKey = key;
        else capturedDashboardKey = key;
        return {
          entry: {
            data: await loader(),
            dataUpdatedAt: '2026-08-31T23:59:59.999Z',
          },
          source: 'COMPUTED',
        };
      },
    );
    await service.getSummary({ ...request, outletId: undefined });
    expect(capturedFactsKey).toContain('all-outlets');
    expect(capturedDashboardKey).toContain('all-outlets');
    expect(capturedDashboardKey).toContain('v1');
  });
});
