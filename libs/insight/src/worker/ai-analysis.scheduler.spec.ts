import { InsightGenerationService } from '../application/insight-generation.service';
import { AiAnalysisJobRepository } from '../infrastructure/ai-analysis-job.repository';
import { AiAnalysisScheduler } from './ai-analysis.scheduler';

const job = {
  id: 'job-1',
  merchantId: 'merchant-1',
  analysisDate: new Date('2026-08-18T00:00:00.000Z'),
  attempts: 1,
  nextRetryAt: null,
  errorCategory: null,
};

// memverifikasi worker membatasi backlog per tick dan tidak menjalankan tick tumpang tindih.
describe('AiAnalysisScheduler', () => {
  const jobs = { claimNextDue: jest.fn() };
  const generation = { process: jest.fn() };
  let scheduler: AiAnalysisScheduler;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.AI_WORKER_MAX_JOBS_PER_TICK;
    scheduler = new AiAnalysisScheduler(
      jobs as unknown as AiAnalysisJobRepository,
      generation as unknown as InsightGenerationService,
    );
  });

  it('memproses job due sampai queue kosong', async () => {
    jobs.claimNextDue.mockResolvedValueOnce(job).mockResolvedValueOnce(null);
    await scheduler.tick();
    expect(generation.process).toHaveBeenCalledWith(job);
    expect(jobs.claimNextDue).toHaveBeenCalledTimes(2);
  });

  it('tidak mengizinkan dua polling pada instance worker yang sama', async () => {
    let resolveClaim: ((value: null) => void) | undefined;
    jobs.claimNextDue.mockImplementation(
      () =>
        new Promise<null>((resolve) => {
          resolveClaim = resolve;
        }),
    );
    const first = scheduler.tick();
    const second = scheduler.tick();
    await second;
    expect(jobs.claimNextDue).toHaveBeenCalledTimes(1);
    resolveClaim?.(null);
    await first;
  });

  it('menangkap error tick agar process worker tetap hidup', async () => {
    jobs.claimNextDue.mockRejectedValue(new Error('primary unavailable'));
    await expect(scheduler.tick()).resolves.toBeUndefined();
  });
});
