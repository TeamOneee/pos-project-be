import { Injectable } from '@nestjs/common';
import { ApiError, AuthUser } from '@app/platform';
import { InsightOverview } from './insight.models';
import { AiAnalysisJobRepository } from '../infrastructure/ai-analysis-job.repository';
import { AiInsightRepository } from '../infrastructure/ai-insight.repository';

// membaca status job terbaru dan hasil terbaru per tipe untuk owner merchant.
@Injectable()
export class InsightQueryService {
  constructor(
    private readonly jobs: AiAnalysisJobRepository,
    private readonly insights: AiInsightRepository,
  ) {}

  async getLatest(actor: AuthUser): Promise<InsightOverview> {
    if (actor.role !== 'OWNER') {
      throw ApiError.forbidden('Hanya Owner dapat melihat insight.');
    }
    const analysisJob = await this.jobs.findLatestInMerchant(actor.merchantId);
    if (!analysisJob) {
      throw ApiError.notFound('Merchant belum pernah memicu analisis insight.');
    }
    return {
      analysisJob,
      insights: await this.insights.listLatestInMerchant(actor.merchantId),
    };
  }
}
