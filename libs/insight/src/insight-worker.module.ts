import { Module } from '@nestjs/common';
import { InsightModule } from './insight.module';
import { AiAnalysisScheduler } from './worker/ai-analysis.scheduler';

// composition root worker; hanya scheduler yang diekspos agar api tidak ikut menjalankan cron.
@Module({
  imports: [InsightModule],
  providers: [AiAnalysisScheduler],
})
export class InsightWorkerModule {}
