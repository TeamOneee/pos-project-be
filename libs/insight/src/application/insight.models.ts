// tipe insight mvp yang stabil agar frontend dapat memilih parser berdasarkan type.
export const INSIGHT_TYPES = [
  'SALES_TREND',
  'OUTLET_COMPARISON',
  'TOP_PRODUCTS',
  'TIME_PATTERN',
  'AOV_TREND',
] as const;

export type InsightType = (typeof INSIGHT_TYPES)[number];

export type AiAnalysisJobState =
  'PENDING' | 'PROCESSING' | 'READY' | 'RETRY_SCHEDULED' | 'FAILED';

export type InsightStatus = 'READY' | 'STALE';

export interface AnalysisJobResult {
  id: string;
  merchantId: string;
  analysisDate: Date;
  state: AiAnalysisJobState;
  attempts: number;
  nextRetryAt: Date | null;
  errorCategory: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClaimedAiAnalysisJob {
  id: string;
  merchantId: string;
  analysisDate: Date;
  attempts: number;
  nextRetryAt: Date | null;
  errorCategory: string | null;
}

export interface InsightEvidence<TPayload> {
  schema_version: 1;
  type: InsightType;
  payload: TPayload;
}

export interface SalesTrendEvidencePayload {
  total_omzet: string;
  transaction_count: number;
  average_transaction_value: string;
  trend: Array<{
    bucket_start: string;
    omzet: string;
    transaction_count: number;
    average_transaction_value: string;
  }>;
}

export interface OutletComparisonEvidencePayload {
  outlets: ReportingDataset['byOutlet'];
}

export interface TopProductsEvidencePayload {
  top_selling: ReportingDataset['topProducts'];
  least_selling: ReportingDataset['leastSellingProducts'];
}

export interface TimePatternEvidencePayload {
  hours: ReportingDataset['byHour'];
}

export interface AovTrendEvidencePayload {
  average_transaction_value: string;
  trend: Array<{
    bucket_start: string;
    average_transaction_value: string;
  }>;
}

export type DeterministicInsightEvidence =
  | InsightEvidence<SalesTrendEvidencePayload>
  | InsightEvidence<OutletComparisonEvidencePayload>
  | InsightEvidence<TopProductsEvidencePayload>
  | InsightEvidence<TimePatternEvidencePayload>
  | InsightEvidence<AovTrendEvidencePayload>;

export interface DeterministicInsightCandidate {
  type: InsightType;
  title: string;
  evidenceSummary: DeterministicInsightEvidence;
}

export interface GeneratedInsightNarrative {
  type: InsightType;
  content: string;
}

export interface AiGenerationRequest {
  merchantId: string;
  periodStart: Date;
  periodEnd: Date;
  dataVersion: string;
  timezone: string;
  dataset: ReportingDataset;
  candidates: DeterministicInsightCandidate[];
}

export interface PublishedInsight {
  merchantId: string;
  type: InsightType;
  title: string;
  content: string;
  evidenceSummary: DeterministicInsightEvidence;
  periodStart: Date;
  periodEnd: Date;
  dataVersion: string;
  generatedAt: Date;
}

export interface InsightResult extends PublishedInsight {
  id: string;
  status: InsightStatus;
}

export interface InsightOverview {
  analysisJob: AnalysisJobResult;
  insights: InsightResult[];
}

export interface TriggerInsightResult {
  job: AnalysisJobResult;
  created: boolean;
}
import { ReportingDataset } from '@app/reporting';
