import { ReportingDataset } from '@app/reporting';
import {
  buildDeterministicInsightCandidates,
  isDeterministicEvidence,
} from './deterministic-insight.factory';

function dataset(overrides: Partial<ReportingDataset> = {}): ReportingDataset {
  return {
    summary: {
      totalOmzet: '150000.00',
      transactionCount: 3,
      averageTransactionValue: '50000.00',
    },
    series: [
      {
        bucketStart: new Date('2026-08-01T00:00:00.000Z'),
        omzet: '150000.00',
        transactionCount: 3,
        averageTransactionValue: '50000.00',
      },
    ],
    byOutlet: [
      {
        outletId: 'outlet-1',
        outletName: 'Pusat',
        omzet: '150000.00',
        transactionCount: 3,
      },
    ],
    topProducts: [
      {
        productId: 'product-1',
        name: 'Kopi',
        unitsSold: 3,
        omzet: '150000.00',
      },
    ],
    leastSellingProducts: [],
    byHour: [{ hourOfDay: 9, omzet: '150000.00', transactionCount: 3 }],
    dataVersion: 'v1',
    dataUpdatedAt: new Date('2026-08-02T00:00:00.000Z'),
    freshnessStatus: 'FRESH',
    timezone: 'Asia/Jakarta',
    ...overrides,
  };
}

// memastikan evidence frontend berasal dari data reporting secara stabil.
describe('deterministic insight factory', () => {
  it('FR-AI-010: membuat lima tipe insight ketika seluruh dimensi tersedia', () => {
    const candidates = buildDeterministicInsightCandidates(dataset());
    expect(candidates.map((candidate) => candidate.type)).toEqual([
      'SALES_TREND',
      'AOV_TREND',
      'OUTLET_COMPARISON',
      'TOP_PRODUCTS',
      'TIME_PATTERN',
    ]);
    const sales = candidates.find((item) => item.type === 'SALES_TREND');
    expect(sales?.evidenceSummary).toMatchObject({
      schema_version: 1,
      type: 'SALES_TREND',
      payload: { total_omzet: '150000.00' },
    });
    expect(
      (
        sales?.evidenceSummary.payload as {
          trend: Array<{ bucket_start: string }>;
        }
      ).trend[0]?.bucket_start,
    ).toBe('2026-08-01T00:00:00.000Z');
  });

  it('FR-AI-010: tidak membuat placeholder ketika merchant belum memiliki transaksi', () => {
    expect(
      buildDeterministicInsightCandidates(
        dataset({
          summary: {
            totalOmzet: '0.00',
            transactionCount: 0,
            averageTransactionValue: '0.00',
          },
        }),
      ),
    ).toEqual([]);
  });

  it('menghilangkan tipe yang tidak mempunyai dimensi data', () => {
    const candidates = buildDeterministicInsightCandidates(
      dataset({ series: [], byOutlet: [], topProducts: [], byHour: [] }),
    );
    expect(candidates).toEqual([]);
  });

  it('memvalidasi envelope evidence untuk consumer frontend', () => {
    expect(
      isDeterministicEvidence({ schema_version: 1, type: 'SALES_TREND' }),
    ).toBe(true);
    expect(
      isDeterministicEvidence({ schema_version: 2, type: 'SALES_TREND' }),
    ).toBe(false);
    expect(isDeterministicEvidence(null)).toBe(false);
  });
});
