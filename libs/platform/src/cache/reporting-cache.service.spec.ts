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
});
