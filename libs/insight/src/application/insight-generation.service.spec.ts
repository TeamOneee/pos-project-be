import { ApiError } from '@app/platform';
import { ReportingDataset } from '@app/reporting';
import { InsightGenerationService } from './insight-generation.service';
import { AiAnalysisJobRepository } from '../infrastructure/ai-analysis-job.repository';
import { AiInsightRepository } from '../infrastructure/ai-insight.repository';
import { AiProviderError } from '../infrastructure/ai-provider.error';

const claimedJob = {
  id: 'job-1',
  merchantId: 'merchant-1',
  analysisDate: new Date('2026-08-19T00:00:00.000Z'),
  attempts: 1,
  nextRetryAt: null,
  errorCategory: null,
};

function dataset(overrides: Partial<ReportingDataset> = {}): ReportingDataset {
  return {
    summary: {
      totalOmzet: '150000.00',
      transactionCount: 3,
      averageTransactionValue: '50000.00',
    },
    series: [
      {
        bucketStart: new Date('2026-08-01T00:00:00.000Z'),
        omzet: '150000.00',
        transactionCount: 3,
        averageTransactionValue: '50000.00',
      },
    ],
    byOutlet: [
      {
        outletId: 'outlet-1',
        outletName: 'Pusat',
        omzet: '150000.00',
        transactionCount: 3,
      },
    ],
    topProducts: [
      {
        productId: 'product-1',
        name: 'Kopi',
        unitsSold: 3,
        omzet: '150000.00',
      },
    ],
    leastSellingProducts: [],
    byHour: [{ hourOfDay: 9, omzet: '150000.00', transactionCount: 3 }],
    dataVersion: 'reporting:v1',
    dataUpdatedAt: new Date('2026-08-19T01:00:00.000Z'),
    freshnessStatus: 'FRESH',
    timezone: 'Asia/Jakarta',
    ...overrides,
  };
}

// memverifikasi worker memakai reporting port dan memisahkan evidence dari narasi llm.
describe('InsightGenerationService', () => {
  const jobs = { scheduleRetry: jest.fn() };
  const insights = {
    replaceLatestForSuccessfulJob: jest.fn(),
    failJobAndMarkLatestStale: jest.fn(),
  };
  const reporting = { getDataset: jest.fn() };
  const tenantRead = { getContext: jest.fn() };
  const provider = { generate: jest.fn() };
  let service: InsightGenerationService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.AI_JOB_MAX_ATTEMPTS;
    delete process.env.AI_JOB_RETRY_BASE_DELAY_MS;
    tenantRead.getContext.mockResolvedValue({
      timezone: 'Asia/Jakarta',
      outlets: [],
    });
    reporting.getDataset.mockResolvedValue(dataset());
    provider.generate.mockImplementation(
      (request: { candidates: Array<{ type: string }> }) =>
        request.candidates.map((candidate) => ({
          type: candidate.type,
          content: `Narasi ${candidate.type}`,
        })),
    );
    service = new InsightGenerationService(
      jobs as unknown as AiAnalysisJobRepository,
      insights as unknown as AiInsightRepository,
      reporting,
      tenantRead,
      provider,
    );
  });

  it('FR-AI-002/004/005: membaca reporting merchant-wide dan menyimpan evidence deterministik', async () => {
    await service.process(claimedJob);
    expect(reporting.getDataset).toHaveBeenCalledWith({
      merchantId: 'merchant-1',
      dateFrom: new Date('2026-07-20T17:00:00.000Z'),
      dateTo: new Date('2026-08-19T16:59:59.999Z'),
      granularity: 'DAY',
      dimensions: ['outlet', 'product', 'hour'],
    });
    expect(provider.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: 'merchant-1',
        dataVersion: 'reporting:v1',
      }),
    );
    expect(insights.replaceLatestForSuccessfulJob).toHaveBeenCalledWith(
      'job-1',
      'merchant-1',
      expect.arrayContaining([
        expect.objectContaining({
          type: 'SALES_TREND',
          evidenceSummary: expect.objectContaining({ schema_version: 1 }),
        }),
      ]),
    );
  });

  it('FR-AI-006: kegagalan provider transient dijadwalkan retry terbatas', async () => {
    provider.generate.mockRejectedValue(
      new AiProviderError('PROVIDER_TIMEOUT', true, 'timeout'),
    );
    await service.process(claimedJob);
    expect(jobs.scheduleRetry).toHaveBeenCalledWith(
      'job-1',
      expect.any(Date),
      'PROVIDER_TIMEOUT',
    );
    expect(insights.failJobAndMarkLatestStale).not.toHaveBeenCalled();
  });

  it('FR-AI-006: kegagalan permanen menandai hasil lama stale', async () => {
    provider.generate.mockRejectedValue(
      new AiProviderError('PROVIDER_CONFIGURATION', false, 'missing key'),
    );
    await service.process(claimedJob);
    expect(insights.failJobAndMarkLatestStale).toHaveBeenCalledWith(
      'job-1',
      'merchant-1',
      'PROVIDER_CONFIGURATION',
    );
  });

  it('AT-012: kegagalan dependency reporting menggunakan retry, bukan melempar ke checkout', async () => {
    reporting.getDataset.mockRejectedValue(ApiError.dependencyUnavailable());
    await expect(service.process(claimedJob)).resolves.toBeUndefined();
    expect(jobs.scheduleRetry).toHaveBeenCalled();
  });

  it('FR-AI-004: data tanpa transaksi menyelesaikan job tanpa row insight parsial', async () => {
    reporting.getDataset.mockResolvedValue(
      dataset({
        summary: {
          totalOmzet: '0.00',
          transactionCount: 0,
          averageTransactionValue: '0.00',
        },
      }),
    );
    await service.process(claimedJob);
    expect(provider.generate).not.toHaveBeenCalled();
    expect(insights.replaceLatestForSuccessfulJob).toHaveBeenCalledWith(
      'job-1',
      'merchant-1',
      [],
    );
  });

  it('menolak narasi provider yang tidak lengkap sebelum hasil dipublikasikan', async () => {
    provider.generate.mockResolvedValue([
      { type: 'SALES_TREND', content: 'Satu hasil' },
    ]);
    await service.process(claimedJob);
    expect(jobs.scheduleRetry).toHaveBeenCalledWith(
      'job-1',
      expect.any(Date),
      'PROVIDER_OUTPUT',
    );
  });
});
