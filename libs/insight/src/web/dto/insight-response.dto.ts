// dto response mempertahankan evidence terstruktur agar frontend tidak perlu mem-parsing narasi llm.
import {
  AiAnalysisJobState,
  DeterministicInsightEvidence,
  InsightStatus,
  InsightType,
} from '../../application/insight.models';

export interface AnalysisJobDto {
  id: string;
  state: AiAnalysisJobState;
  analysis_date: Date;
  attempts: number;
  next_retry_at: Date | null;
  error_category: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface InsightDto {
  id: string;
  type: InsightType;
  title: string;
  content: string;
  evidence_summary: DeterministicInsightEvidence;
  status: InsightStatus;
  period_start: Date;
  period_end: Date;
  data_version: string;
  generated_at: Date;
}

export interface InsightOverviewDto {
  analysis_job: AnalysisJobDto;
  insights: InsightDto[];
}

export interface InsightTriggerDto {
  job_id: string;
  state: AiAnalysisJobState;
}
