import { Injectable } from '@nestjs/common';
import { AiInsight, InsightStatus, Prisma } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';
import {
  DeterministicInsightEvidence,
  InsightResult,
  InsightType,
  PublishedInsight,
} from '../application/insight.models';

function toInsightResult(insight: AiInsight): InsightResult {
  return {
    id: insight.id,
    merchantId: insight.merchantId,
    type: insight.type as InsightType,
    title: insight.title,
    content: insight.content,
    evidenceSummary:
      insight.evidenceSummary as unknown as DeterministicInsightEvidence,
    status: insight.status,
    periodStart: insight.periodStart,
    periodEnd: insight.periodEnd,
    dataVersion: insight.dataVersion,
    generatedAt: insight.generatedAt,
  };
}

// menyimpan hasil insight terbaru per type dan mempertahankan hasil lama sebagai stale.
@Injectable()
export class AiInsightRepository {
  constructor(private readonly prisma: PrismaWriteService) {}

  async listLatestInMerchant(merchantId: string): Promise<InsightResult[]> {
    const insights = await this.prisma.aiInsight.findMany({
      where: { merchantId },
      orderBy: [{ type: 'asc' }],
    });
    return insights.map(toInsightResult);
  }

  async replaceLatestForSuccessfulJob(
    jobId: string,
    merchantId: string,
    insights: PublishedInsight[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.aiInsight.updateMany({
        where: { merchantId, status: InsightStatus.READY },
        data: { status: InsightStatus.STALE },
      });
      for (const insight of insights) {
        await tx.aiInsight.upsert({
          where: {
            merchantId_type: {
              merchantId: insight.merchantId,
              type: insight.type,
            },
          },
          create: {
            merchantId: insight.merchantId,
            type: insight.type,
            title: insight.title,
            content: insight.content,
            evidenceSummary:
              insight.evidenceSummary as unknown as Prisma.InputJsonValue,
            status: InsightStatus.READY,
            periodStart: insight.periodStart,
            periodEnd: insight.periodEnd,
            dataVersion: insight.dataVersion,
            generatedAt: insight.generatedAt,
          },
          update: {
            title: insight.title,
            content: insight.content,
            evidenceSummary:
              insight.evidenceSummary as unknown as Prisma.InputJsonValue,
            status: InsightStatus.READY,
            periodStart: insight.periodStart,
            periodEnd: insight.periodEnd,
            dataVersion: insight.dataVersion,
            generatedAt: insight.generatedAt,
          },
        });
      }
      await tx.aiAnalysisJob.update({
        where: { id: jobId },
        data: { state: 'READY', nextRetryAt: null, errorCategory: null },
      });
    });
  }

  async failJobAndMarkLatestStale(
    jobId: string,
    merchantId: string,
    errorCategory: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.aiInsight.updateMany({
        where: { merchantId, status: InsightStatus.READY },
        data: { status: InsightStatus.STALE },
      });
      await tx.aiAnalysisJob.update({
        where: { id: jobId },
        data: {
          state: 'FAILED',
          nextRetryAt: null,
          errorCategory,
        },
      });
    });
  }
}
