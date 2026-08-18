import { ApiError } from '../error/api-error';
import { HealthController } from './health.controller';

function makeMocks() {
  const prismaWrite = {
    $queryRaw: jest.fn(),
    aiAnalysisJob: { count: jest.fn().mockResolvedValue(0) },
  };
  const prismaRead = {
    $queryRaw: jest.fn(),
  };
  return { prismaWrite, prismaRead };
}

describe('HealthController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('check mengembalikan status ok saat database sehat', async () => {
    const { prismaWrite, prismaRead } = makeMocks();
    const controller = new HealthController(
      prismaWrite as never,
      prismaRead as never,
    );

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.database.primary).toBe('ok');
    expect(result.database.read_replica).toBe('ok');
    expect(result.worker_backlog.ai_job_pending).toBe(0);
    expect(prismaWrite.$queryRaw).toHaveBeenCalled();
    expect(prismaRead.$queryRaw).toHaveBeenCalled();
  });

  it('check melempar DEPENDENCY_UNAVAILABLE jika database gagal', async () => {
    const { prismaWrite, prismaRead } = makeMocks();
    prismaWrite.$queryRaw.mockRejectedValue(new Error('connection refused'));
    const controller = new HealthController(
      prismaWrite as never,
      prismaRead as never,
    );

    await expect(controller.check()).rejects.toThrow(ApiError);
  });

  it('check mengembalikan jumlah ai_job_pending yang benar', async () => {
    const { prismaWrite, prismaRead } = makeMocks();
    prismaWrite.aiAnalysisJob.count.mockResolvedValue(5);
    const controller = new HealthController(
      prismaWrite as never,
      prismaRead as never,
    );

    const result = await controller.check();

    expect(result.worker_backlog.ai_job_pending).toBe(5);
  });
});
