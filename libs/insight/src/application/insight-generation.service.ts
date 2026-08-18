import { Injectable, Logger } from '@nestjs/common';
import { ApiError, ErrorCode } from '@app/platform';
import { ReportingReadPort } from '@app/reporting';
import { TenantReportingReadPort } from '@app/tenant';
import { resolveAnalysisWindow } from './analysis-window.service';
import { buildDeterministicInsightCandidates } from './deterministic-insight.factory';
import {
  ClaimedAiAnalysisJob,
  GeneratedInsightNarrative,
  PublishedInsight,
} from './insight.models';
import { AiProviderPort } from './ports/ai-provider.port';
import { AiAnalysisJobRepository } from '../infrastructure/ai-analysis-job.repository';
import { AiInsightRepository } from '../infrastructure/ai-insight.repository';
import { AiProviderError } from '../infrastructure/ai-provider.error';

function readPositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toErrorCategory(error: unknown): string {
  if (error instanceof AiProviderError) return error.category;
  if (error instanceof ApiError) return 'REPORTING_DEPENDENCY';
  return 'UNEXPECTED';
}

function isRetryable(error: unknown): boolean {
  if (error instanceof AiProviderError) return error.retryable;
  return (
    error instanceof ApiError && error.code === ErrorCode.DEPENDENCY_UNAVAILABLE
  );
}

// menjalankan satu job yang telah diklaim worker dan menyimpan output terbaru per tipe.
@Injectable()
export class InsightGenerationService {
  private readonly logger = new Logger(InsightGenerationService.name);

  constructor(
    private readonly jobs: AiAnalysisJobRepository,
    private readonly insights: AiInsightRepository,
    private readonly reporting: ReportingReadPort,
    private readonly tenantRead: TenantReportingReadPort,
    private readonly provider: AiProviderPort,
  ) {}

  async process(job: ClaimedAiAnalysisJob): Promise<void> {
    try {
      const context = await this.tenantRead.getContext(job.merchantId);
      const window = resolveAnalysisWindow(job.analysisDate, context.timezone);
      const dataset = await this.reporting.getDataset({
        merchantId: job.merchantId,
        dateFrom: window.periodStart,
        dateTo: window.periodEnd,
        granularity: 'DAY',
        dimensions: ['outlet', 'product', 'hour'],
      });
      const candidates = buildDeterministicInsightCandidates(dataset);
      const narratives = candidates.length
        ? await this.provider.generate({
            merchantId: job.merchantId,
            periodStart: window.periodStart,
            periodEnd: window.periodEnd,
            dataVersion: dataset.dataVersion,
            timezone: context.timezone,
            dataset,
            candidates,
          })
        : [];
      const published = this.toPublishedInsights(
        job.merchantId,
        candidates,
        narratives,
        window.periodStart,
        window.periodEnd,
        dataset.dataVersion,
      );
      await this.insights.replaceLatestForSuccessfulJob(
        job.id,
        job.merchantId,
        published,
      );
      this.logger.log({
        message: 'ai insight job completed',
        jobId: job.id,
        merchantId: job.merchantId,
        insightCount: published.length,
      });
    } catch (error: unknown) {
      await this.handleFailure(job, error);
    }
  }

  private toPublishedInsights(
    merchantId: string,
    candidates: ReturnType<typeof buildDeterministicInsightCandidates>,
    narratives: GeneratedInsightNarrative[],
    periodStart: Date,
    periodEnd: Date,
    dataVersion: string,
  ): PublishedInsight[] {
    const narrativeByType = new Map(
      narratives.map((item) => [item.type, item]),
    );
    if (narrativeByType.size !== candidates.length) {
      throw new AiProviderError(
        'PROVIDER_OUTPUT',
        true,
        'Provider tidak mengembalikan seluruh narasi insight yang diminta.',
      );
    }
    return candidates.map((candidate) => {
      const narrative = narrativeByType.get(candidate.type);
      if (!narrative || !narrative.content.trim()) {
        throw new AiProviderError(
          'PROVIDER_OUTPUT',
          true,
          'Provider mengembalikan narasi insight tidak lengkap.',
        );
      }
      return {
        merchantId,
        type: candidate.type,
        title: candidate.title,
        content: narrative.content.trim(),
        evidenceSummary: candidate.evidenceSummary,
        periodStart,
        periodEnd,
        dataVersion,
        generatedAt: new Date(),
      };
    });
  }

  private async handleFailure(
    job: ClaimedAiAnalysisJob,
    error: unknown,
  ): Promise<void> {
    const maxAttempts = readPositiveInteger(process.env.AI_JOB_MAX_ATTEMPTS, 3);
    const category = toErrorCategory(error);
    const canRetry = isRetryable(error) && job.attempts < maxAttempts;
    if (canRetry) {
      const baseDelayMs = readPositiveInteger(
        process.env.AI_JOB_RETRY_BASE_DELAY_MS,
        60_000,
      );
      const delayMs = baseDelayMs * 2 ** (job.attempts - 1);
      await this.jobs.scheduleRetry(
        job.id,
        new Date(Date.now() + delayMs),
        category,
      );
    } else {
      await this.insights.failJobAndMarkLatestStale(
        job.id,
        job.merchantId,
        category,
      );
    }
    this.logger.warn({
      message: 'ai insight job failed',
      jobId: job.id,
      merchantId: job.merchantId,
      attempts: job.attempts,
      category,
      retryScheduled: canRetry,
    });
  }
}
