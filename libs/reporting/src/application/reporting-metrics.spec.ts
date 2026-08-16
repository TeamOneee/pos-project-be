// memverifikasi kalkulasi metrik bisnis, formula desimal aov, dan merge produk aktif katalog.
import { buildBusinessDashboardData } from './reporting-metrics';

describe('buildBusinessDashboardData', () => {
  const snapshot = () =>
    buildBusinessDashboardData({
      facts: [
        {
          outletId: 'outlet-1',
          transactionId: 'transaction-1',
          occurredAt: new Date('2026-08-15T08:00:00.000Z'),
          total: '20000.00',
          items: [
            {
              productId: 'product-1',
              productNameSnapshot: 'Produk Lama',
              quantity: 1,
              subtotal: '20000.00',
            },
          ],
        },
        {
          outletId: 'outlet-1',
          transactionId: 'transaction-2',
          occurredAt: new Date('2026-08-15T09:00:00.000Z'),
          total: '30000.00',
          items: [
            {
              productId: 'product-1',
              productNameSnapshot: 'Produk Lama',
              quantity: 2,
              subtotal: '30000.00',
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
      bucket: 'DAY',
      limit: 10,
    });

  it('FR-REP-003: menghitung omzet, count, dan aov dengan decimal', () => {
    expect(snapshot()).toMatchObject({
      omzet: '50000.00',
      transactionCount: 2,
      averageTransactionValue: '25000.00',
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

  it('FR-REP-005: menghasilkan empty state numerik tanpa membagi dengan nol', () => {
    const result = buildBusinessDashboardData({
      facts: [],
      products: [],
      outlets: [],
      timezone: 'Asia/Jakarta',
      bucket: 'DAY',
      limit: 10,
    });
    expect(result).toMatchObject({
      omzet: '0.00',
      transactionCount: 0,
      averageTransactionValue: '0.00',
    });
    expect(result.salesTrend).toEqual([]);
    expect(result.timePattern).toHaveLength(24);
  });
});
