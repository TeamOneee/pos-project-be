import { Injectable } from '@nestjs/common';
import { JobRecord, Prisma } from '@prisma/client';
import { PrismaWriteService } from '../prisma/prisma-write.service';

const JOB_STATE_PENDING = 'PENDING';
const JOB_STATE_PROCESSING = 'PROCESSING';
const JOB_STATE_READY = 'READY';
const JOB_STATE_RETRY_SCHEDULED = 'RETRY_SCHEDULED';
const JOB_STATE_FAILED = 'FAILED';

const JOB_BATCH_SIZE = 20;

export interface EnqueueJobInput {
  type: string;
  tenantMerchantId: string;
  dedupeKey: string;
}

@Injectable()
export class JobRecordService {
  constructor(private readonly prisma: PrismaWriteService) {}

  async enqueue(input: EnqueueJobInput): Promise<JobRecord> {
    try {
      return await this.prisma.jobRecord.create({
        data: {
          type: input.type,
          tenantMerchantId: input.tenantMerchantId,
          dedupeKey: input.dedupeKey,
          state: JOB_STATE_PENDING,
          nextRetryAt: new Date(),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.jobRecord.findUnique({
          where: { dedupeKey: input.dedupeKey },
        });
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  async findDue(
    limit = JOB_BATCH_SIZE,
    now = new Date(),
  ): Promise<JobRecord[]> {
    return this.prisma.jobRecord.findMany({
      where: {
        state: { in: [JOB_STATE_PENDING, JOB_STATE_RETRY_SCHEDULED] },
        nextRetryAt: { lte: now },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async claim(jobId: string): Promise<boolean> {
    const result = await this.prisma.jobRecord.updateMany({
      where: {
        id: jobId,
        state: { in: [JOB_STATE_PENDING, JOB_STATE_RETRY_SCHEDULED] },
      },
      data: { state: JOB_STATE_PROCESSING, attempts: { increment: 1 } },
    });
    return result.count === 1;
  }

  async complete(jobId: string): Promise<void> {
    await this.prisma.jobRecord.update({
      where: { id: jobId },
      data: { state: JOB_STATE_READY },
    });
  }

  async scheduleRetry(jobId: string, nextRetryAt: Date): Promise<void> {
    await this.prisma.jobRecord.update({
      where: { id: jobId },
      data: { state: JOB_STATE_RETRY_SCHEDULED, nextRetryAt },
    });
  }

  async deadLetter(jobId: string, errorCategory: string): Promise<void> {
    await this.prisma.jobRecord.update({
      where: { id: jobId },
      data: { state: JOB_STATE_FAILED, errorCategory },
    });
  }
}
