import { ReportingCacheService } from './reporting-cache.service';

// memverifikasi cache-aside local fallback tetap mencegah stampede saat redis belum tersedia.
describe('ReportingCacheService', () => {
  const config = { get: jest.fn().mockReturnValue(undefined) };

  beforeEach(() => jest.clearAllMocks());

  it('menjalankan loader sekali untuk request bersamaan dengan key yang sama', async () => {
    const cache = new ReportingCacheService(config as never);
    const loader = jest.fn(() => Promise.resolve({ omzet: '10000.00' }));
    const [first, second] = await Promise.all([
      cache.getOrLoad('merchant-1:summary', loader),
      cache.getOrLoad('merchant-1:summary', loader),
    ]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(first.entry.data).toEqual(second.entry.data);
  });

  it('menyimpan fresh dan stale fallback terpisah setelah agregasi berhasil', async () => {
    const cache = new ReportingCacheService(config as never);
    await cache.getOrLoad('merchant-1:summary', () =>
      Promise.resolve({ omzet: '1.00' }),
    );
    await expect(cache.getFresh('merchant-1:summary')).resolves.toMatchObject({
      data: { omzet: '1.00' },
    });
    await expect(cache.getStale('merchant-1:summary')).resolves.toMatchObject({
      data: { omzet: '1.00' },
    });
  });

  it('getFresh mengembalikan undefined jika key belum ada', async () => {
    const cache = new ReportingCacheService(config as never);
    await expect(cache.getFresh('missing-key')).resolves.toBeUndefined();
  });

  it('getStale mengembalikan undefined jika key belum ada', async () => {
    const cache = new ReportingCacheService(config as never);
    await expect(cache.getStale('missing-key')).resolves.toBeUndefined();
  });

  it('getOrLoad mengembalikan CACHE saat fresh hit', async () => {
    const cache = new ReportingCacheService(config as never);
    const loader = jest.fn(() => Promise.resolve({ value: 1 }));

    await cache.getOrLoad('key-1', loader);
    const second = await cache.getOrLoad('key-1', loader);

    expect(second.source).toBe('CACHE');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('memory cache expired mengembalikan undefined', async () => {
    const cache = new ReportingCacheService(config as never);
    await cache.getOrLoad('key-1', () => Promise.resolve({ v: 1 }));

    // Simulate expiry by manipulating internal state
    const memory = (
      cache as unknown as {
        memory: Map<string, { value: string; expiresAt: number }>;
      }
    ).memory;
    const entry = memory.get('reporting:fresh:key-1');
    if (entry) {
      entry.expiresAt = Date.now() - 1000;
    }

    await expect(cache.getFresh('key-1')).resolves.toBeUndefined();
  });

  it('onModuleDestroy tidak melempar error jika tidak ada redis', async () => {
    const cache = new ReportingCacheService(config as never);
    await expect(cache.onModuleDestroy()).resolves.toBeUndefined();
  });

  it('source adalah COMPUTED saat cache miss pertama kali', async () => {
    const cache = new ReportingCacheService(config as never);
    const result = await cache.getOrLoad('key-new', () =>
      Promise.resolve({ data: 'fresh' }),
    );
    expect(result.source).toBe('COMPUTED');
    expect(result.entry.data).toEqual({ data: 'fresh' });
  });

  it('fallback ke memory saat redis get error', async () => {
    const cache = new ReportingCacheService({
      get: jest.fn().mockReturnValue('redis://test'),
    } as never);
    // mock redis yang error
    (cache as unknown as { redis: unknown }).redis = {
      get: jest.fn().mockRejectedValue(new Error('redis down')),
      set: jest.fn().mockResolvedValue('OK'),
      status: 'ready',
    };
    // isi memory manual
    const mem = (
      cache as unknown as {
        memory: Map<string, { value: string; expiresAt: number }>;
      }
    ).memory;
    const key = 'reporting:fresh:fallback-key';
    mem.set(key, {
      value: JSON.stringify({
        data: { v: 42 },
        dataUpdatedAt: new Date().toISOString(),
      }),
      expiresAt: Date.now() + 10000,
    });
    await expect(cache.getFresh('fallback-key')).resolves.toMatchObject({
      data: { v: 42 },
    });
  });

  it('write fallback ke memory saat redis set error', async () => {
    const cache = new ReportingCacheService({
      get: jest.fn().mockReturnValue('redis://test'),
    } as never);
    (cache as unknown as { redis: unknown }).redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockRejectedValue(new Error('redis down')),
      status: 'ready',
    };
    const result = await cache.getOrLoad('write-fallback', () =>
      Promise.resolve({ a: 1 }),
    );
    expect(result.source).toBe('COMPUTED');
    // next hit harus dari memory walau redis set gagal
    const second = await cache.getFresh('write-fallback');
    expect(second).toBeDefined();
  });
});
