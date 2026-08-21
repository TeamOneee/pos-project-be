jest.mock('ioredis', () => {
  const mockInstance = {
    connect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    eval: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
    status: 'ready',
  };
  const MockRedis = jest.fn(() => mockInstance) as unknown as jest.Mock & { mockInstance: typeof mockInstance };
  (MockRedis as unknown as { mockInstance: typeof mockInstance }).mockInstance = mockInstance;
  return { __esModule: true, default: MockRedis, mockInstance };
});

import Redis from 'ioredis';
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
      get: jest.fn().mockReturnValue(undefined),
    } as never);
    (cache as unknown as { redis: unknown }).redis = {
      get: jest.fn().mockRejectedValue(new Error('redis down')),
      set: jest.fn().mockResolvedValue('OK'),
      status: 'ready',
    };
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
      get: jest.fn().mockReturnValue(undefined),
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
    const second = await cache.getFresh('write-fallback');
    expect(second).toBeDefined();
  });

  it('constructor membuat Redis dengan retryStrategy dan lazyConnect false', async () => {
    const redisConfig = { get: jest.fn().mockReturnValue('redis://localhost:6379') };
    const cache = new ReportingCacheService(redisConfig as never);
    expect(Redis).toHaveBeenCalledWith(
      'redis://localhost:6379',
      expect.objectContaining({
        lazyConnect: false,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
      }),
    );
    const opts = (Redis as unknown as jest.Mock).mock.calls[0]?.[1] as { retryStrategy?: (times: number) => number | null };
    expect(opts.retryStrategy?.(1)).toBe(200);
    expect(opts.retryStrategy?.(2)).toBe(400);
    expect(opts.retryStrategy?.(4)).toBeNull();
    // cleanup: prevent real quit attempt
    (cache as unknown as { redis: { quit: jest.Mock; disconnect: jest.Mock } }).redis.quit = jest.fn().mockResolvedValue('OK');
    await cache.onModuleDestroy();
  });

  it('onModuleInit ping ketika status ready', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    const mockRedis = {
      status: 'ready',
      connect: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn().mockResolvedValue('PONG'),
    };
    (cache as unknown as { redis: unknown }).redis = mockRedis;
    await cache.onModuleInit();
    expect(mockRedis.ping).toHaveBeenCalled();
    expect(mockRedis.connect).not.toHaveBeenCalled();
  });

  it('onModuleInit connect lalu ping ketika status bukan ready', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    const mockRedis = {
      status: 'wait',
      connect: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn().mockResolvedValue('PONG'),
    };
    (cache as unknown as { redis: unknown }).redis = mockRedis;
    await cache.onModuleInit();
    expect(mockRedis.connect).toHaveBeenCalled();
    expect(mockRedis.ping).toHaveBeenCalled();
  });

  it('onModuleInit tidak throw ketika ping gagal', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    (cache as unknown as { redis: unknown }).redis = {
      status: 'ready',
      connect: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn().mockRejectedValue(new Error('down')),
    };
    await expect(cache.onModuleInit()).resolves.toBeUndefined();
  });

  it('onModuleInit tanpa redis tidak melakukan apa-apa', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    await expect(cache.onModuleInit()).resolves.toBeUndefined();
  });

  it('onModuleDestroy quit sukses', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    const mockRedis = { quit: jest.fn().mockResolvedValue('OK'), disconnect: jest.fn() };
    (cache as unknown as { redis: unknown }).redis = mockRedis;
    await cache.onModuleDestroy();
    expect(mockRedis.quit).toHaveBeenCalled();
    expect(mockRedis.disconnect).not.toHaveBeenCalled();
  });

  it('onModuleDestroy quit gagal fallback disconnect', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    const mockRedis = { quit: jest.fn().mockRejectedValue(new Error('quit fail')), disconnect: jest.fn() };
    (cache as unknown as { redis: unknown }).redis = mockRedis;
    await cache.onModuleDestroy();
    expect(mockRedis.disconnect).toHaveBeenCalled();
  });

  it('read mengembalikan undefined jika JSON invalid di redis', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    (cache as unknown as { redis: unknown }).redis = {
      get: jest.fn().mockResolvedValue('not-json'),
      status: 'ready',
    };
    await expect(cache.getFresh('bad-json')).resolves.toBeUndefined();
  });

  it('read mengembalikan undefined jika dataUpdatedAt bukan string di redis', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    (cache as unknown as { redis: unknown }).redis = {
      get: jest.fn().mockResolvedValue(JSON.stringify({ data: { x: 1 }, dataUpdatedAt: 123 })),
      status: 'ready',
    };
    await expect(cache.getFresh('bad-entry')).resolves.toBeUndefined();
  });

  it('read mengembalikan parsed entry jika redis hit valid', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    const iso = new Date().toISOString();
    (cache as unknown as { redis: unknown }).redis = {
      get: jest.fn().mockResolvedValue(JSON.stringify({ data: { v: 1 }, dataUpdatedAt: iso })),
      status: 'ready',
    };
    await expect(cache.getFresh('good-key')).resolves.toMatchObject({ data: { v: 1 }, dataUpdatedAt: iso });
  });

  it('read fallback memory JSON invalid mengembalikan undefined', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    (cache as unknown as { redis: unknown }).redis = {
      get: jest.fn().mockResolvedValue(null),
      status: 'ready',
    };
    const mem = (cache as unknown as { memory: Map<string, { value: string; expiresAt: number }> }).memory;
    mem.set('reporting:fresh:mem-bad', { value: 'not-json', expiresAt: Date.now() + 10000 });
    await expect(cache.getFresh('mem-bad')).resolves.toBeUndefined();
  });

  it('read fallback memory missing dataUpdatedAt mengembalikan undefined', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    (cache as unknown as { redis: unknown }).redis = {
      get: jest.fn().mockResolvedValue(null),
      status: 'ready',
    };
    const mem = (cache as unknown as { memory: Map<string, { value: string; expiresAt: number }> }).memory;
    mem.set('reporting:fresh:mem-bad2', {
      value: JSON.stringify({ data: { x: 1 } }),
      expiresAt: Date.now() + 10000,
    });
    await expect(cache.getFresh('mem-bad2')).resolves.toBeUndefined();
  });

  it('read tanpa redis mengembalikan undefined jika JSON invalid di memory', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    const mem = (cache as unknown as { memory: Map<string, { value: string; expiresAt: number }> }).memory;
    mem.set('reporting:fresh:no-redis-bad', { value: 'not-json', expiresAt: Date.now() + 10000 });
    await expect(cache.getFresh('no-redis-bad')).resolves.toBeUndefined();
  });

  it('write dengan redis set sukses menyimpan lalu getFresh via redis', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    const store = new Map<string, string>();
    (cache as unknown as { redis: unknown }).redis = {
      get: jest.fn(async (key: string) => store.get(key) ?? null),
      set: jest.fn(async (key: string, raw: string) => { store.set(key, raw); return 'OK'; }),
      status: 'ready',
    };
    await cache.getOrLoad('write-redis-success', () => Promise.resolve({ a: 1 }));
    await expect(cache.getFresh('write-redis-success')).resolves.toMatchObject({ data: { a: 1 } });
  });

  it('loadWithSingleFlight lock acquired lalu cache hit mengembalikan CACHE tanpa loader', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    const store = new Map<string, string>();
    const iso = new Date().toISOString();
    store.set('reporting:fresh:lf-hit', JSON.stringify({ data: { v: 99 }, dataUpdatedAt: iso }));
    (cache as unknown as { redis: unknown }).redis = {
      get: jest.fn(async (k: string) => store.get(k) ?? null),
      set: jest.fn(async (k: string, v: string) => {
        if (k.startsWith('reporting:lock:')) return 'OK';
        store.set(k, v); return 'OK';
      }),
      eval: jest.fn().mockResolvedValue(1),
      status: 'ready',
    };
    // ensure fresh is empty at start then filled after lock acquire check?
    // inject entry before second getFresh inside loadWithSingleFlight: already stored
    const result = await cache.getOrLoad('lf-hit', () => Promise.resolve({ v: 0 }));
    expect(result.source).toBe('CACHE');
    expect(result.entry.data).toEqual({ v: 99 });
  });

  it('loadWithSingleFlight kalah lock polling berhasil setelah holder menulis cache', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    const store = new Map<string, string>();
    let callCount = 0;
    (cache as unknown as { redis: unknown }).redis = {
      get: jest.fn(async (k: string) => {
        if (k === 'reporting:fresh:poll-key') {
          callCount += 1;
          if (callCount >= 3) {
            return JSON.stringify({ data: { v: 7 }, dataUpdatedAt: new Date().toISOString() });
          }
          return null;
        }
        if (k.startsWith('reporting:lock:')) return null;
        return store.get(k) ?? null;
      }),
      set: jest.fn(async (k: string, v: string) => {
        // first set for lock returns null to simulate lock failure (kalah)
        if (k.startsWith('reporting:lock:')) return null;
        store.set(k, v); return 'OK';
      }),
      eval: jest.fn().mockResolvedValue(1),
      status: 'ready',
    };
    const result = await cache.getOrLoad('poll-key', () => Promise.resolve({ v: 999 }));
    expect(result.entry.data).toEqual({ v: 7 });
    expect(result.source).toBe('CACHE');
  });

  it('loadWithSingleFlight kalah lock dan polling gagal fallback ke loadAndStore', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    (cache as unknown as { redis: unknown }).redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(async (k: string) => {
        if (k.startsWith('reporting:lock:')) return null;
        return 'OK';
      }),
      eval: jest.fn().mockResolvedValue(1),
      status: 'ready',
    };
    const result = await cache.getOrLoad('poll-fallback', () => Promise.resolve({ v: 123 }));
    expect(result.source).toBe('COMPUTED');
    expect(result.entry.data).toEqual({ v: 123 });
  });

  it('acquireLock mengembalikan false saat redis error', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    (cache as unknown as { redis: unknown }).redis = {
      set: jest.fn().mockRejectedValue(new Error('lock error')),
      status: 'ready',
    };
    const acquire = (cache as unknown as { acquireLock: (k: string, t: string) => Promise<boolean> }).acquireLock.bind(cache);
    await expect(acquire('x', 'tok')).resolves.toBe(false);
  });

  it('acquireLock mengembalikan false saat result bukan OK', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    (cache as unknown as { redis: unknown }).redis = {
      set: jest.fn().mockResolvedValue(null),
      status: 'ready',
    };
    const acquire = (cache as unknown as { acquireLock: (k: string, t: string) => Promise<boolean> }).acquireLock.bind(cache);
    await expect(acquire('x', 'tok')).resolves.toBe(false);
  });

  it('releaseLock tidak throw saat redis eval error', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    (cache as unknown as { redis: unknown }).redis = {
      eval: jest.fn().mockRejectedValue(new Error('eval fail')),
      status: 'ready',
    };
    const release = (cache as unknown as { releaseLock: (k: string, t: string) => Promise<void> }).releaseLock.bind(cache);
    await expect(release('x', 'tok')).resolves.toBeUndefined();
  });

  it('releaseLock tidak throw saat tanpa redis', async () => {
    const cache = new ReportingCacheService({ get: jest.fn().mockReturnValue(undefined) } as never);
    const release = (cache as unknown as { releaseLock: (k: string, t: string) => Promise<void> }).releaseLock.bind(cache);
    await expect(release('x', 'tok')).resolves.toBeUndefined();
  });
});
