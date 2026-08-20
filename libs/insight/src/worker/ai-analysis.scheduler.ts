import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InsightGenerationService } from '../application/insight-generation.service';
import { ClaimedAiAnalysisJob } from '../application/insight.models';
import { AiAnalysisJobRepository } from '../infrastructure/ai-analysis-job.repository';

// mengambil job due secara bounded setiap lima detik; claim database menjaga job tidak diproses dua worker.
@Injectable()
export class AiAnalysisScheduler {
  private readonly logger = new Logger(AiAnalysisScheduler.name);
  private running = false;

  constructor(
    private readonly jobs: AiAnalysisJobRepository,
    private readonly generation: InsightGenerationService,
  ) {}

  // polling lima detik agar job Owner mulai diproses cepat tanpa menunggu satu menit.
  @Cron(CronExpression.EVERY_5_SECONDS)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const maxJobs = Number(process.env.AI_WORKER_MAX_JOBS_PER_TICK ?? 5);
      const concurrency = Math.min(
        maxJobs,
        Number(process.env.AI_WORKER_CONCURRENCY ?? 5),
      );
      const claimed: ClaimedAiAnalysisJob[] = [];
      for (let index = 0; index < maxJobs; index += 1) {
        const job = await this.jobs.claimNextDue();
        if (!job) break;
        claimed.push(job);
      }

      // LLM call dijalankan paralel dalam batch kecil; batas ini mencegah satu
      // tick membuka request tak terbatas ketika banyak Owner menekan Analyze.
      for (let index = 0; index < claimed.length; index += concurrency) {
        const batch = claimed.slice(index, index + concurrency);
        const results = await Promise.allSettled(
          batch.map((job) => this.generation.process(job)),
        );
        results
          .filter(
            (result): result is PromiseRejectedResult =>
              result.status === 'rejected',
          )
          .forEach((result) => {
            this.logger.error({
              message: 'ai insight job unexpectedly rejected',
              error:
                result.reason instanceof Error
                  ? result.reason.message
                  : 'unknown error',
            });
          });
      }
    } catch (error: unknown) {
      this.logger.error({
        message: 'ai insight worker tick failed',
        error: error instanceof Error ? error.message : 'unknown error',
      });
    } finally {
      this.running = false;
    }
  }
}
