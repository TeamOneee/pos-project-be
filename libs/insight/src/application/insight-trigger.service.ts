import { Injectable } from '@nestjs/common';
import { AuthUser, ApiError } from '@app/platform';
import { TenantReportingReadPort } from '@app/tenant';
import { analysisDateForMerchant } from './analysis-window.service';
import { TriggerInsightResult } from './insight.models';
import { AiAnalysisJobRepository } from '../infrastructure/ai-analysis-job.repository';

// membuat atau mengembalikan job insight harian tanpa menerima scope dari client.
@Injectable()
export class InsightTriggerService {
  constructor(
    private readonly jobs: AiAnalysisJobRepository,
    private readonly tenantRead: TenantReportingReadPort,
  ) {}

  async trigger(
    actor: AuthUser,
    now = new Date(),
  ): Promise<TriggerInsightResult> {
    if (actor.role !== 'OWNER') {
      throw ApiError.forbidden('Hanya Owner dapat memicu analisis insight.');
    }
    const context = await this.tenantRead.getContext(actor.merchantId);
    const analysisDate = analysisDateForMerchant(now, context.timezone);
    return this.jobs.createOrFindDaily(actor.merchantId, analysisDate);
  }
}
