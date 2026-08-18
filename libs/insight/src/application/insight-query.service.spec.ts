import { AuthUser } from '@app/platform';
import { InsightQueryService } from './insight-query.service';
import { AiAnalysisJobRepository } from '../infrastructure/ai-analysis-job.repository';
import { AiInsightRepository } from '../infrastructure/ai-insight.repository';

const owner: AuthUser = {
  userId: 'owner-1',
  merchantId: 'merchant-1',
  role: 'OWNER',
  outletId: null,
};

// memverifikasi endpoint baca membedakan job belum pernah ada dan job belum selesai.
describe('InsightQueryService', () => {
  const jobs = { findLatestInMerchant: jest.fn() };
  const insights = { listLatestInMerchant: jest.fn() };
  let service: InsightQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InsightQueryService(
      jobs as unknown as AiAnalysisJobRepository,
      insights as unknown as AiInsightRepository,
    );
  });

  it('AT-032: mengembalikan job pending dengan insights kosong', async () => {
    jobs.findLatestInMerchant.mockResolvedValue({
      id: 'job-1',
      state: 'PENDING',
    });
    insights.listLatestInMerchant.mockResolvedValue([]);
    await expect(service.getLatest(owner)).resolves.toMatchObject({
      analysisJob: { state: 'PENDING' },
      insights: [],
    });
  });

  it('AT-032: merchant tanpa job menerima not found', async () => {
    jobs.findLatestInMerchant.mockResolvedValue(null);
    await expect(service.getLatest(owner)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('FR-AI-012: admin ditolak sebelum membaca repository', async () => {
    await expect(
      service.getLatest({ ...owner, role: 'ADMIN' }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(jobs.findLatestInMerchant).not.toHaveBeenCalled();
  });
});
