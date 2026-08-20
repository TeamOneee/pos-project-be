import { ReportingDataset } from '@app/reporting';
import {
  DeterministicInsightCandidate,
  DeterministicInsightEvidence,
} from './insight.models';

function hasProductData(dataset: ReportingDataset): boolean {
  return (
    dataset.topProducts.length > 0 || dataset.leastSellingProducts.length > 0
  );
}

function hasTimeData(dataset: ReportingDataset): boolean {
  return dataset.byHour.length > 0;
}

function hasSeriesData(dataset: ReportingDataset): boolean {
  return dataset.series.length > 0;
}

// membentuk bukti ui yang sepenuhnya berasal dari reporting, bukan angka dari llm.
export function buildDeterministicInsightCandidates(
  dataset: ReportingDataset,
): DeterministicInsightCandidate[] {
  if (dataset.summary.transactionCount === 0) return [];

  const candidates = [
    ...(hasSeriesData(dataset)
      ? [
          {
            type: 'SALES_TREND' as const,
            title: 'Tren penjualan Merchant',
            evidenceSummary: {
              schema_version: 1 as const,
              type: 'SALES_TREND' as const,
              payload: {
                total_omzet: dataset.summary.totalOmzet,
                transaction_count: dataset.summary.transactionCount,
                average_transaction_value:
                  dataset.summary.averageTransactionValue,
                trend: dataset.series.map((point) => ({
                  bucket_start: point.bucketStart.toISOString(),
                  omzet: point.omzet,
                  transaction_count: point.transactionCount,
                  average_transaction_value: point.averageTransactionValue,
                })),
              },
            },
          },
          {
            type: 'AOV_TREND' as const,
            title: 'Tren nilai rata-rata transaksi',
            evidenceSummary: {
              schema_version: 1 as const,
              type: 'AOV_TREND' as const,
              payload: {
                average_transaction_value:
                  dataset.summary.averageTransactionValue,
                trend: dataset.series.map((point) => ({
                  bucket_start: point.bucketStart.toISOString(),
                  average_transaction_value: point.averageTransactionValue,
                })),
              },
            },
          },
        ]
      : []),
    ...(dataset.byOutlet.length > 0
      ? [
          {
            type: 'OUTLET_COMPARISON' as const,
            title: 'Perbandingan performa Outlet',
            evidenceSummary: {
              schema_version: 1 as const,
              type: 'OUTLET_COMPARISON' as const,
              payload: { outlets: dataset.byOutlet },
            },
          },
        ]
      : []),
    ...(hasProductData(dataset)
      ? [
          {
            type: 'TOP_PRODUCTS' as const,
            title: 'Produk terlaris dan kurang laku',
            evidenceSummary: {
              schema_version: 1 as const,
              type: 'TOP_PRODUCTS' as const,
              payload: {
                top_selling: dataset.topProducts,
                least_selling: dataset.leastSellingProducts,
              },
            },
          },
        ]
      : []),
    ...(hasTimeData(dataset)
      ? [
          {
            type: 'TIME_PATTERN' as const,
            title: 'Pola waktu penjualan',
            evidenceSummary: {
              schema_version: 1 as const,
              type: 'TIME_PATTERN' as const,
              payload: { hours: dataset.byHour },
            },
          },
        ]
      : []),
  ];
  return candidates;
}

// memeriksa envelope evidence sebelum hasil dipublikasikan ke frontend.
export function isDeterministicEvidence(
  value: unknown,
): value is DeterministicInsightEvidence {
  if (!value || typeof value !== 'object') return false;
  const evidence = value as { schema_version?: unknown; type?: unknown };
  return evidence.schema_version === 1 && typeof evidence.type === 'string';
}
