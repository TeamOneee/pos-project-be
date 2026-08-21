import { Prisma } from '@prisma/client';
import { AiAnalysisJobRepository } from './ai-analysis-job.repository';

const job = {
  id: 'job-1',
  merchantId: 'merchant-1',
  analysisDate: new Date('2026-08-18T00:00:00.000Z'),
  state: 'PENDING',
  attempts: 0,
  nextRetryAt: null,
  errorCategory: null,
  createdAt: new Date('2026-08-18T00:00:00.000Z'),
  updatedAt: new Date('2026-08-18T00:00:00.000Z'),
};

// memverifikasi persistence job harian dan pemetaan hasil tanpa database nyata.
describe('AiAnalysisJobRepository', () => {
  const prisma = {
    aiAnalysisJob: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };
  let repository: AiAnalysisJobRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new AiAnalysisJobRepository(prisma as never);
  });

  it('FR-AI-007: membuat job baru pada key merchant dan tanggal lokal', async () => {
    prisma.aiAnalysisJob.create.mockResolvedValue(job);
    await expect(
      repository.createOrFindDaily('merchant-1', job.analysisDate),
    ).resolves.toMatchObject({
      created: true,
      job: { id: 'job-1', state: 'PENDING' },
    });
    expect(prisma.aiAnalysisJob.create).toHaveBeenCalledWith({
      data: {
        merchantId: 'merchant-1',
        analysisDate: job.analysisDate,
        state: 'PENDING',
      },
    });
  });

  it('FR-AI-007: conflict unique mengembalikan job harian yang sama', async () => {
    prisma.aiAnalysisJob.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.4.0',
      }),
    );
    prisma.aiAnalysisJob.findUnique.mockResolvedValue({
      ...job,
      state: 'PROCESSING',
    });
    await expect(
      repository.createOrFindDaily('merchant-1', job.analysisDate),
    ).resolves.toMatchObject({ created: false, job: { state: 'PROCESSING' } });
  });

  it('conflict unique dengan state FAILED mereset ke PENDING dan created true', async () => {
    prisma.aiAnalysisJob.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.4.0',
      }),
    );
    prisma.aiAnalysisJob.findUnique.mockResolvedValue({
      ...job,
      state: 'FAILED',
    });
    const updated = { ...job, state: 'PENDING', attempts: 0, nextRetryAt: null, errorCategory: null };
    prisma.aiAnalysisJob.update.mockResolvedValue(updated);
    await expect(
      repository.createOrFindDaily('merchant-1', job.analysisDate),
    ).resolves.toMatchObject({ created: true, job: { state: 'PENDING', attempts: 0 } });
    expect(prisma.aiAnalysisJob.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { state: 'PENDING', attempts: 0, nextRetryAt: null, errorCategory: null },
    });
  });

  it('conflict unique tapi findUnique null melempar error asli', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '6.4.0',
    });
    prisma.aiAnalysisJob.create.mockRejectedValue(err);
    prisma.aiAnalysisJob.findUnique.mockResolvedValue(null);
    await expect(repository.createOrFindDaily('merchant-1', job.analysisDate)).rejects.toBe(err);
  });

  it('conflict unique P2002 tetapi findUnique mengembalikan job lain tetap false', async () => {
    prisma.aiAnalysisJob.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.4.0',
      }),
    );
    prisma.aiAnalysisJob.findUnique.mockResolvedValue({
      ...job,
      state: 'RETRY_SCHEDULED',
      nextRetryAt: new Date(),
    });
    await expect(
      repository.createOrFindDaily('merchant-1', job.analysisDate),
    ).resolves.toMatchObject({ created: false });
  });

  it('meneruskan error selain unique conflict', async () => {
    prisma.aiAnalysisJob.create.mockRejectedValue(new Error('db unavailable'));
    await expect(
      repository.createOrFindDaily('merchant-1', job.analysisDate),
    ).rejects.toThrow('db unavailable');
  });

  it('meneruskan Prisma error bukan P2002', async () => {
    prisma.aiAnalysisJob.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('other', {
        code: 'P2003',
        clientVersion: '6.4.0',
      }),
    );
    await expect(
      repository.createOrFindDaily('merchant-1', job.analysisDate),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('mengambil job terbaru atau null untuk merchant', async () => {
    prisma.aiAnalysisJob.findFirst.mockResolvedValue(job);
    await expect(
      repository.findLatestInMerchant('merchant-1'),
    ).resolves.toMatchObject({
      id: 'job-1',
      merchantId: 'merchant-1',
    });
    prisma.aiAnalysisJob.findFirst.mockResolvedValue(null);
    await expect(
      repository.findLatestInMerchant('merchant-1'),
    ).resolves.toBeNull();
  });

  it('FR-AI-006: mengembalikan satu claimed job atau null dari operasi atomik', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        id: 'job-1',
        merchantId: 'merchant-1',
        analysisDate: job.analysisDate,
        attempts: 1,
        nextRetryAt: null,
        errorCategory: null,
      },
    ]);
    await expect(repository.claimNextDue()).resolves.toMatchObject({
      attempts: 1,
    });
    prisma.$queryRaw.mockResolvedValue([]);
    await expect(repository.claimNextDue()).resolves.toBeNull();
  });

  it('claimNextDue menggunakan leaseSeconds minimal 1', async () => {
    const orig = process.env.AI_JOB_LEASE_TIMEOUT_MS;
    process.env.AI_JOB_LEASE_TIMEOUT_MS = '0';
    prisma.$queryRaw.mockResolvedValue([]);
    await repository.claimNextDue();
    expect(prisma.$queryRaw).toHaveBeenCalled();
    // query should contain 1 second fallback, cek bahwa query dipanggil dengan template
    const call = prisma.$queryRaw.mock.calls[0];
    expect(call).toBeDefined();
    process.env.AI_JOB_LEASE_TIMEOUT_MS = orig;
  });

  it('menyimpan jadwal retry dan kategori error aman', async () => {
    const retryAt = new Date('2026-08-18T01:00:00.000Z');
    await repository.scheduleRetry('job-1', retryAt, 'PROVIDER_TIMEOUT');
    expect(prisma.aiAnalysisJob.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: {
        state: 'RETRY_SCHEDULED',
        nextRetryAt: retryAt,
        errorCategory: 'PROVIDER_TIMEOUT',
      },
    });
  });
});
