import { Injectable } from '@nestjs/common';
import { AiAnalysisJob, Prisma } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';
import {
  AnalysisJobResult,
  ClaimedAiAnalysisJob,
  TriggerInsightResult,
} from '../application/insight.models';

function toResult(job: AiAnalysisJob): AnalysisJobResult {
  return {
    id: job.id,
    merchantId: job.merchantId,
    analysisDate: job.analysisDate,
    state: job.state,
    attempts: job.attempts,
    nextRetryAt: job.nextRetryAt,
    errorCategory: job.errorCategory,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

interface ClaimedRow {
  id: string;
  merchantId: string;
  analysisDate: Date;
  attempts: number;
  nextRetryAt: Date | null;
  errorCategory: string | null;
}

// menyimpan state job insight dan mengklaim pekerjaan due secara atomik di primary.
@Injectable()
export class AiAnalysisJobRepository {
  constructor(private readonly prisma: PrismaWriteService) {}

  async createOrFindDaily(
    merchantId: string,
    analysisDate: Date,
  ): Promise<TriggerInsightResult> {
    try {
      const job = await this.prisma.aiAnalysisJob.create({
        data: { merchantId, analysisDate, state: 'PENDING' },
      });
      return { job: toResult(job), created: true };
    } catch (error: unknown) {
      if (!isUniqueConflict(error)) throw error;
      const job = await this.prisma.aiAnalysisJob.findUnique({
        where: { merchantId_analysisDate: { merchantId, analysisDate } },
      });
      if (!job) throw error;
      
      // Jika job hari ini gagal, izinkan user untuk men-trigger ulang (retry)
      if (job.state === 'FAILED') {
        const updatedJob = await this.prisma.aiAnalysisJob.update({
          where: { id: job.id },
          data: {
            state: 'PENDING',
            attempts: 0,
            nextRetryAt: null,
            errorCategory: null,
          },
        });
        return { job: toResult(updatedJob), created: true };
      }
      
      return { job: toResult(job), created: false };
    }
  }

  async findLatestInMerchant(
    merchantId: string,
  ): Promise<AnalysisJobResult | null> {
    const job = await this.prisma.aiAnalysisJob.findFirst({
      where: { merchantId },
      orderBy: [{ analysisDate: 'desc' }, { updatedAt: 'desc' }],
    });
    return job ? toResult(job) : null;
  }

  async claimNextDue(): Promise<ClaimedAiAnalysisJob | null> {
    // PROCESSING yang tidak berubah melewati lease dianggap ditinggalkan worker
    // yang crash; worker lain boleh mengambilnya kembali tanpa tabel recovery baru.
    const leaseMilliseconds = Number(
      process.env.AI_JOB_LEASE_TIMEOUT_MS ?? 15 * 60 * 1_000,
    );
    const leaseSeconds = Math.max(1, Math.ceil(leaseMilliseconds / 1_000));
    const rows = await this.prisma.$queryRaw<ClaimedRow[]>`
      WITH candidate AS (
        SELECT id
        FROM ai_analysis_job
        WHERE (state = 'PENDING' AND next_retry_at IS NULL)
           OR (state = 'RETRY_SCHEDULED' AND next_retry_at <= NOW())
           OR (state = 'PROCESSING'
               AND updated_at < NOW() - (${leaseSeconds} * INTERVAL '1 second'))
        ORDER BY created_at ASC, id ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE ai_analysis_job AS job
      SET state = 'PROCESSING',
          attempts = job.attempts + 1,
          updated_at = NOW()
      FROM candidate
      WHERE job.id = candidate.id
      RETURNING job.id,
                job.merchant_id AS "merchantId",
                job.analysis_date AS "analysisDate",
                job.attempts,
                job.next_retry_at AS "nextRetryAt",
                job.error_category AS "errorCategory"
    `;
    return rows[0] ?? null;
  }

  scheduleRetry(
    id: string,
    nextRetryAt: Date,
    errorCategory: string,
  ): Promise<AiAnalysisJob> {
    return this.prisma.aiAnalysisJob.update({
      where: { id },
      data: { state: 'RETRY_SCHEDULED', nextRetryAt, errorCategory },
    });
  }
}
