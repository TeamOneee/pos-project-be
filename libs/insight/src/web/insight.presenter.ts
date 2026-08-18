import {
  AnalysisJobResult,
  InsightOverview,
  InsightResult,
  TriggerInsightResult,
} from '../application/insight.models';
import {
  AnalysisJobDto,
  InsightDto,
  InsightOverviewDto,
  InsightTriggerDto,
} from './dto/insight-response.dto';

// memetakan model application insight menjadi response http snake_case yang stabil.
export function toAnalysisJobDto(result: AnalysisJobResult): AnalysisJobDto {
  return {
    id: result.id,
    state: result.state,
    analysis_date: result.analysisDate,
    attempts: result.attempts,
    next_retry_at: result.nextRetryAt,
    error_category: result.errorCategory,
    created_at: result.createdAt,
    updated_at: result.updatedAt,
  };
}

export function toInsightDto(result: InsightResult): InsightDto {
  return {
    id: result.id,
    type: result.type,
    title: result.title,
    content: result.content,
    evidence_summary: result.evidenceSummary,
    status: result.status,
    period_start: result.periodStart,
    period_end: result.periodEnd,
    data_version: result.dataVersion,
    generated_at: result.generatedAt,
  };
}

export function toInsightOverviewDto(
  result: InsightOverview,
): InsightOverviewDto {
  return {
    analysis_job: toAnalysisJobDto(result.analysisJob),
    insights: result.insights.map(toInsightDto),
  };
}

export function toInsightTriggerDto(
  result: TriggerInsightResult,
): InsightTriggerDto {
  return { job_id: result.job.id, state: result.job.state };
}
