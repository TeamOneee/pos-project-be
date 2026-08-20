// E2E: trigger dan pembacaan status insight owner-only (AT-012, AT-031, AT-032).
import { INestApplication } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { InsightQueryService } from '@app/insight/application/insight-query.service';
import { InsightTriggerService } from '@app/insight/application/insight-trigger.service';
import { InsightController } from '@app/insight/web/insight.controller';
import { AllExceptionsFilter } from '@app/platform/error/all-exceptions.filter';
import { SuccessResponseInterceptor } from '@app/platform/web/success-response.interceptor';

const mockTriggerService = { trigger: jest.fn() };
const mockQueryService = { getLatest: jest.fn() };
const ownerUser = {
  userId: 'owner-1',
  merchantId: 'merchant-1',
  role: 'OWNER',
  outletId: null,
};

// memverifikasi envelope endpoint tanpa menyentuh provider llm atau database sungguhan.
describe('E2E — AI Insight (AT-012, AT-031, AT-032)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [InsightController],
      providers: [
        { provide: InsightTriggerService, useValue: mockTriggerService },
        { provide: InsightQueryService, useValue: mockQueryService },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: (context: {
              switchToHttp: () => { getRequest: () => { user: unknown } };
            }) => {
              context.switchToHttp().getRequest().user = ownerUser;
              return true;
            },
          },
        },
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new SuccessResponseInterceptor(new Reflector()));
    app.useGlobalFilters(
      new AllExceptionsFilter({
        get: jest.fn().mockReturnValue('test-corr-id'),
      } as never),
    );
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('AT-031: trigger pertama mengembalikan 202 dengan satu job pending', async () => {
    mockTriggerService.trigger.mockResolvedValue({
      created: true,
      job: { id: 'job-1', state: 'PENDING' },
    });
    const response = await request(app.getHttpServer())
      .post('/api/v1/insights/trigger')
      .expect(202);
    expect(response.body).toMatchObject({
      success: true,
      statusCode: 202,
      data: { job_id: 'job-1', state: 'PENDING' },
    });
    expect(mockTriggerService.trigger).toHaveBeenCalledWith(
      expect.objectContaining({ merchantId: 'merchant-1' }),
    );
  });

  it('AT-031: trigger duplikat mengembalikan job yang sama dengan 200', async () => {
    mockTriggerService.trigger.mockResolvedValue({
      created: false,
      job: { id: 'job-1', state: 'PROCESSING' },
    });
    const response = await request(app.getHttpServer())
      .post('/api/v1/insights/trigger')
      .expect(200);
    expect(response.body.data).toEqual({
      job_id: 'job-1',
      state: 'PROCESSING',
    });
  });

  it('AT-032: job pending tetap mengembalikan 200 walau insight masih kosong', async () => {
    mockQueryService.getLatest.mockResolvedValue({
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
    const response = await request(app.getHttpServer())
      .get('/api/v1/insights')
      .expect(200);
    expect(response.body.data).toMatchObject({
      analysis_job: { id: 'job-1', state: 'PENDING' },
      insights: [],
    });
  });
});
