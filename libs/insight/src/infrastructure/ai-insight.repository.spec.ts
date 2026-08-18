import { AiInsightRepository } from './ai-insight.repository';

const published = {
  merchantId: 'merchant-1',
  type: 'SALES_TREND' as const,
  title: 'Tren penjualan Merchant',
  content: 'Penjualan stabil.',
  evidenceSummary: {
    schema_version: 1 as const,
    type: 'SALES_TREND' as const,
    payload: {
      total_omzet: '100000.00',
      transaction_count: 2,
      average_transaction_value: '50000.00',
      trend: [],
    },
  },
  periodStart: new Date('2026-08-01T00:00:00.000Z'),
  periodEnd: new Date('2026-08-30T23:59:59.999Z'),
  dataVersion: 'v1',
  generatedAt: new Date('2026-08-30T23:59:59.999Z'),
};

// memverifikasi hasil lama stale lalu upsert hasil terbaru dalam satu transaction.
describe('AiInsightRepository', () => {
  const tx = {
    aiInsight: { updateMany: jest.fn(), upsert: jest.fn() },
    aiAnalysisJob: { update: jest.fn() },
  };
  const prisma = {
    aiInsight: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  let repository: AiInsightRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx),
    );
    repository = new AiInsightRepository(prisma as never);
  });

  it('membaca hasil terbaru merchant dengan urutan type stabil', async () => {
    prisma.aiInsight.findMany.mockResolvedValue([
      { id: 'insight-1', status: 'READY', ...published },
    ]);
    await expect(
      repository.listLatestInMerchant('merchant-1'),
    ).resolves.toMatchObject([
      { id: 'insight-1', type: 'SALES_TREND', status: 'READY' },
    ]);
    expect(prisma.aiInsight.findMany).toHaveBeenCalledWith({
      where: { merchantId: 'merchant-1' },
      orderBy: [{ type: 'asc' }],
    });
  });

  it('FR-AI-004: success menandai hasil lama stale, upsert result, lalu ready', async () => {
    await repository.replaceLatestForSuccessfulJob('job-1', 'merchant-1', [
      published,
    ]);
    expect(tx.aiInsight.updateMany).toHaveBeenCalledWith({
      where: { merchantId: 'merchant-1', status: 'READY' },
      data: { status: 'STALE' },
    });
    expect(tx.aiInsight.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          merchantId_type: { merchantId: 'merchant-1', type: 'SALES_TREND' },
        },
      }),
    );
    expect(tx.aiAnalysisJob.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { state: 'READY', nextRetryAt: null, errorCategory: null },
    });
  });

  it('FR-AI-006: failure mempertahankan hasil lama sebagai stale dan menutup job', async () => {
    await repository.failJobAndMarkLatestStale(
      'job-1',
      'merchant-1',
      'PROVIDER_TIMEOUT',
    );
    expect(tx.aiInsight.updateMany).toHaveBeenCalled();
    expect(tx.aiAnalysisJob.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: {
        state: 'FAILED',
        nextRetryAt: null,
        errorCategory: 'PROVIDER_TIMEOUT',
      },
    });
  });
});
