import { AiInsight } from '@prisma/client';

export type AiJobStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type AiInsightStatus = 'READY' | 'PROCESSING' | 'STALE' | 'FAILED';

export interface AiInsightWithStatus {
  insight: AiInsight;
  status: AiInsightStatus;
}

export interface AiJobResult {
  jobId: string;
  status: AiJobStatus;
}

/**
 * Public contract yang disediakan AI Insight Module untuk module lain.
 *
 * Analisis AI dipicu manual oleh OWNER (tanpa batas harian — FR-AI-012,
 * ASM-010, UR-AI-010) dan TANPA histori: satu merchant hanya memiliki satu
 * insight (1:1), hasil analisis terbaru meng-update insight yang sama.
 * Karena tidak ada daftar/histori, endpoint dismiss dan list tidak relevan.
 *
 * Insight hanya berupa saran ("advise, do not command") — tidak dapat
 * mengubah data maupun menjalankan operasi.
 */
export interface AiInsightPort {
  enqueueAnalysis(merchantId: string): Promise<AiJobResult>;

  getCurrent(merchantId: string): Promise<AiInsightWithStatus | null>;
}
