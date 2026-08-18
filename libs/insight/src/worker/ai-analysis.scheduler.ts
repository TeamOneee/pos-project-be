import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InsightGenerationService } from '../application/insight-generation.service';
import { AiAnalysisJobRepository } from '../infrastructure/ai-analysis-job.repository';

function readPositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// mengambil job due satu per satu secara bounded; claim database menjaga job tidak diproses dua worker.
@Injectable()
export class AiAnalysisScheduler {
  private readonly logger = new Logger(AiAnalysisScheduler.name);
  private running = false;

  constructor(
    private readonly jobs: AiAnalysisJobRepository,
    private readonly generation: InsightGenerationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const maxJobs = readPositiveInteger(
        process.env.AI_WORKER_MAX_JOBS_PER_TICK,
        5,
      );
      for (let index = 0; index < maxJobs; index += 1) {
        const job = await this.jobs.claimNextDue();
        if (!job) break;
        await this.generation.process(job);
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
