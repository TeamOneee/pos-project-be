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

  const candidates: DeterministicInsightCandidate[] = [];
  if (hasSeriesData(dataset)) {
    candidates.push({
      type: 'SALES_TREND',
      title: 'Tren penjualan Merchant',
      evidenceSummary: {
        schema_version: 1,
        type: 'SALES_TREND',
        payload: {
          total_omzet: dataset.summary.totalOmzet,
          transaction_count: dataset.summary.transactionCount,
          average_transaction_value: dataset.summary.averageTransactionValue,
          trend: dataset.series.map((point) => ({
            bucket_start: point.bucketStart.toISOString(),
            omzet: point.omzet,
            transaction_count: point.transactionCount,
            average_transaction_value: point.averageTransactionValue,
          })),
        },
      },
    });
    candidates.push({
      type: 'AOV_TREND',
      title: 'Tren nilai rata-rata transaksi',
      evidenceSummary: {
        schema_version: 1,
        type: 'AOV_TREND',
        payload: {
          average_transaction_value: dataset.summary.averageTransactionValue,
          trend: dataset.series.map((point) => ({
            bucket_start: point.bucketStart.toISOString(),
            average_transaction_value: point.averageTransactionValue,
          })),
        },
      },
    });
  }
  if (dataset.byOutlet.length > 0) {
    candidates.push({
      type: 'OUTLET_COMPARISON',
      title: 'Perbandingan performa Outlet',
      evidenceSummary: {
        schema_version: 1,
        type: 'OUTLET_COMPARISON',
        payload: { outlets: dataset.byOutlet },
      },
    });
  }
  if (hasProductData(dataset)) {
    candidates.push({
      type: 'TOP_PRODUCTS',
      title: 'Produk terlaris dan kurang laku',
      evidenceSummary: {
        schema_version: 1,
        type: 'TOP_PRODUCTS',
        payload: {
          top_selling: dataset.topProducts,
          least_selling: dataset.leastSellingProducts,
        },
      },
    });
  }
  if (hasTimeData(dataset)) {
    candidates.push({
      type: 'TIME_PATTERN',
      title: 'Pola waktu penjualan',
      evidenceSummary: {
        schema_version: 1,
        type: 'TIME_PATTERN',
        payload: { hours: dataset.byHour },
      },
    });
  }
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
