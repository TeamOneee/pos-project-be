import { AiInsight } from '@prisma/client';

export type AiJobStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface AiLimitStatus {
  merchantId: string;
  lastAnalyzedAt: Date | null;
  canAnalyze: boolean;
}

export interface AiJobResult {
  jobId: string;
  status: AiJobStatus;
}

/**
 * Public contract yang disediakan AI Insight Module untuk module lain.
 *
 * Analisis AI dipicu manual oleh Owner (maksimal 1x/hari) dan TANPA histori:
 * satu merchant hanya memiliki satu insight (1:1), hasil analisis terbaru
 * meng-update insight yang sama. Karena tidak ada daftar/histori, endpoint
 * dismiss dan list tidak relevan.
 */
export interface AiInsightPort {
  checkLimit(merchantId: string): Promise<AiLimitStatus>;

  enqueueAnalysis(merchantId: string): Promise<AiJobResult>;

  getCurrent(merchantId: string): Promise<AiInsight | null>;
}
