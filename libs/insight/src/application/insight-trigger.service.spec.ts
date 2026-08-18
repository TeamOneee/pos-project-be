import { AuthUser } from '@app/platform';
import { InsightTriggerService } from './insight-trigger.service';
import { AiAnalysisJobRepository } from '../infrastructure/ai-analysis-job.repository';

const owner: AuthUser = {
  userId: 'owner-1',
  merchantId: 'merchant-1',
  role: 'OWNER',
  outletId: null,
};

// memverifikasi trigger hanya membentuk satu key harian merchant-local.
describe('InsightTriggerService', () => {
  const jobs = { createOrFindDaily: jest.fn() };
  const tenantRead = { getContext: jest.fn() };
  let service: InsightTriggerService;

  beforeEach(() => {
    jest.clearAllMocks();
    tenantRead.getContext.mockResolvedValue({
      timezone: 'Asia/Jakarta',
      outlets: [],
    });
    jobs.createOrFindDaily.mockResolvedValue({
      created: true,
      job: { id: 'job-1', state: 'PENDING' },
    });
    service = new InsightTriggerService(
      jobs as unknown as AiAnalysisJobRepository,
      tenantRead,
    );
  });

  it('FR-AI-007: memakai merchant actor dan tanggal lokal, bukan input client', async () => {
    await service.trigger(owner, new Date('2026-08-18T17:30:00.000Z'));
    expect(tenantRead.getContext).toHaveBeenCalledWith('merchant-1');
    expect(jobs.createOrFindDaily).toHaveBeenCalledWith(
      'merchant-1',
      new Date('2026-08-19T00:00:00.000Z'),
    );
  });

  it('FR-AI-012: menolak role selain owner', async () => {
    await expect(
      service.trigger({ ...owner, role: 'ADMIN' }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(jobs.createOrFindDaily).not.toHaveBeenCalled();
  });
});
