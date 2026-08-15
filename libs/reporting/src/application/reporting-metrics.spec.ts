import { buildBusinessSnapshot } from './reporting-metrics';

// memverifikasi formula dashboard tanpa database atau transport http.
describe('buildBusinessSnapshot', () => {
  const snapshot = (now = new Date('2026-08-15T10:05:00.000Z')) =>
    buildBusinessSnapshot({
      rows: [
        {
          outletId: 'outlet-1',
          periodStart: new Date('2026-08-15T08:00:00.000Z'),
          omzet: '20000.00',
          transactionCount: BigInt(1),
          sourceWatermark: new Date('2026-08-15T10:04:00.000Z'),
          products: [
            {
              productId: 'product-1',
              productNameSnapshot: 'Produk Lama',
              unitsSold: BigInt(1),
              omzet: '20000.00',
            },
          ],
        },
        {
          outletId: 'outlet-1',
          periodStart: new Date('2026-08-15T09:00:00.000Z'),
          omzet: '30000.00',
          transactionCount: BigInt(1),
          sourceWatermark: new Date('2026-08-15T10:04:00.000Z'),
          products: [
            {
              productId: 'product-1',
              productNameSnapshot: 'Produk Lama',
              unitsSold: BigInt(2),
              omzet: '30000.00',
            },
          ],
        },
      ],
      products: [
        {
          id: 'product-1',
          name: 'Produk Baru',
        },
        {
          id: 'product-2',
          name: 'Belum Terjual',
        },
      ],
      outlets: [
        {
          id: 'outlet-1',
          name: 'Outlet A',
        },
        {
          id: 'outlet-2',
          name: 'Outlet B',
        },
      ],
      timezone: 'Asia/Jakarta',
      dateFrom: new Date('2026-08-15T00:00:00.000Z'),
      dateTo: new Date('2026-08-15T23:59:59.999Z'),
      bucket: 'DAY',
      limit: 10,
      now,
    });

  it('FR-REP-003: menghitung omzet, count, dan aov dengan decimal', () => {
    expect(snapshot().summary).toMatchObject({
      omzet: '50000.00',
      transactionCount: 2,
      averageTransactionValue: '25000.00',
      freshnessStatus: 'FRESH',
    });
  });

  it('FR-REP-003B: menyertakan product aktif nol penjualan pada least selling', () => {
    expect(snapshot().topSelling[0]).toMatchObject({
      productId: 'product-1',
      name: 'Produk Lama',
      unitsSold: 3,
    });
    expect(snapshot().leastSelling[0]).toEqual({
      productId: 'product-2',
      name: 'Belum Terjual',
      unitsSold: 0,
      omzet: '0.00',
    });
  });

  it('FR-REP-003/003C: menyertakan outlet nol transaksi dan 24 jam lokal', () => {
    expect(snapshot().outletComparison[1]).toMatchObject({
      outletId: 'outlet-2',
      omzet: '0.00',
      transactionCount: 0,
    });
    expect(snapshot().timePattern).toHaveLength(24);
    expect(snapshot().timePattern[15]).toMatchObject({
      omzet: '20000.00',
      transactionCount: 1,
    });
  });

  it('FR-REP-006: menandai projection lebih dari lima menit sebagai stale', () => {
    expect(
      snapshot(new Date('2026-08-15T10:10:01.000Z')).summary,
    ).toMatchObject({ freshnessStatus: 'STALE' });
  });

  it('FR-REP-005: menghasilkan empty state numerik tanpa membagi dengan nol', () => {
    const result = buildBusinessSnapshot({
      rows: [],
      products: [],
      outlets: [],
      timezone: 'Asia/Jakarta',
      dateFrom: new Date('2026-08-01T00:00:00.000Z'),
      dateTo: new Date('2026-08-01T23:59:59.999Z'),
      bucket: 'DAY',
      limit: 10,
    });
    expect(result.summary).toMatchObject({
      omzet: '0.00',
      transactionCount: 0,
      averageTransactionValue: '0.00',
      dataUpdatedAt: null,
      freshnessStatus: 'FRESH',
    });
    expect(result.salesTrend).toEqual([]);
    expect(result.timePattern).toHaveLength(24);
  });
});
