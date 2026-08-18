import { PATH_METADATA } from '@nestjs/common/constants';
import { AuthUser, ROLES_KEY } from '@app/platform';
import { InsightController } from './insight.controller';
import { InsightQueryService } from '../application/insight-query.service';
import { InsightTriggerService } from '../application/insight-trigger.service';

const owner: AuthUser = {
  userId: 'owner-1',
  merchantId: 'merchant-1',
  role: 'OWNER',
  outletId: null,
};

function methodRoles(propertyKey: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(
    InsightController.prototype,
    propertyKey,
  );
  if (!descriptor || typeof descriptor.value !== 'function') {
    throw new Error(`Method ${propertyKey} tidak ditemukan.`);
  }
  return Reflect.getMetadata(ROLES_KEY, descriptor.value as object) as unknown;
}

// memverifikasi kontrak http insight owner-only dan status trigger idempotent.
describe('InsightController', () => {
  const triggerService = { trigger: jest.fn() };
  const queryService = { getLatest: jest.fn() };
  let controller: InsightController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new InsightController(
      triggerService as unknown as InsightTriggerService,
      queryService as unknown as InsightQueryService,
    );
  });

  it('FR-AI-012: kedua endpoint hanya mendeklarasikan owner', () => {
    expect(methodRoles('trigger')).toEqual(['OWNER']);
    expect(methodRoles('getLatest')).toEqual(['OWNER']);
    expect(Reflect.getMetadata(PATH_METADATA, InsightController)).toBe(
      'insights',
    );
  });

  it('API: trigger baru mengembalikan 202 dan job id', async () => {
    triggerService.trigger.mockResolvedValue({
      created: true,
      job: { id: 'job-1', state: 'PENDING' },
    });
    const response = { status: jest.fn().mockReturnThis() };
    await expect(controller.trigger(owner, response as never)).resolves.toEqual(
      {
        job_id: 'job-1',
        state: 'PENDING',
      },
    );
    expect(response.status).toHaveBeenCalledWith(202);
  });

  it('API: trigger ulang mengembalikan 200 tanpa job baru', async () => {
    triggerService.trigger.mockResolvedValue({
      created: false,
      job: { id: 'job-1', state: 'PROCESSING' },
    });
    const response = { status: jest.fn().mockReturnThis() };
    await controller.trigger(owner, response as never);
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('API: get latest meneruskan hasil query ke presenter', async () => {
    queryService.getLatest.mockResolvedValue({
      analysisJob: {
        id: 'job-1',
        state: 'PENDING',
        analysisDate: new Date('2026-08-18T00:00:00.000Z'),
        attempts: 0,
        nextRetryAt: null,
        errorCategory: null,
        createdAt: new Date('2026-08-18T00:00:00.000Z'),
        updatedAt: new Date('2026-08-18T00:00:00.000Z'),
      },
      insights: [],
    });
    await expect(controller.getLatest(owner)).resolves.toMatchObject({
      analysis_job: { id: 'job-1', state: 'PENDING' },
      insights: [],
    });
  });
});
