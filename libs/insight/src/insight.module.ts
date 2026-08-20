import { Module } from '@nestjs/common';
import { PlatformModule } from '@app/platform';
import { ReportingModule } from '@app/reporting';
import { TenantModule } from '@app/tenant';
import { InsightGenerationService } from './application/insight-generation.service';
import { InsightQueryService } from './application/insight-query.service';
import { InsightTriggerService } from './application/insight-trigger.service';
import { AiProviderPort } from './application/ports/ai-provider.port';
import { AiAnalysisJobRepository } from './infrastructure/ai-analysis-job.repository';
import { AiInsightRepository } from './infrastructure/ai-insight.repository';
import { LlmInsightAdapter } from './infrastructure/llm-insight.adapter';
import { InsightController } from './web/insight.controller';

// composition root api insight; ia membaca agregat melalui port reporting dan menulis hasil ke primary.
@Module({
  imports: [PlatformModule, ReportingModule, TenantModule],
  controllers: [InsightController],
  providers: [
    InsightTriggerService,
    InsightQueryService,
    InsightGenerationService,
    AiAnalysisJobRepository,
    AiInsightRepository,
    LlmInsightAdapter,
    { provide: AiProviderPort, useExisting: LlmInsightAdapter },
  ],
  exports: [InsightGenerationService, AiAnalysisJobRepository],
})
export class InsightModule {}
