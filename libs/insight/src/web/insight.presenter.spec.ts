import { toInsightOverviewDto, toInsightTriggerDto } from './insight.presenter';

// memverifikasi frontend menerima key snake_case dan evidence yang tidak berubah bentuknya.
describe('insight presenter', () => {
  const analysisJob = {
    id: 'job-1',
    merchantId: 'merchant-1',
    analysisDate: new Date('2026-08-18T00:00:00.000Z'),
    state: 'READY' as const,
    attempts: 1,
    nextRetryAt: null,
    errorCategory: null,
    createdAt: new Date('2026-08-18T00:00:00.000Z'),
    updatedAt: new Date('2026-08-18T01:00:00.000Z'),
  };

  it('memetakan trigger job ke response sederhana', () => {
    expect(toInsightTriggerDto({ job: analysisJob, created: true })).toEqual({
      job_id: 'job-1',
      state: 'READY',
    });
  });

  it('memetakan overview beserta evidence deterministik', () => {
    expect(
      toInsightOverviewDto({
        analysisJob,
        insights: [
          {
            id: 'insight-1',
            merchantId: 'merchant-1',
            type: 'SALES_TREND',
            title: 'Tren',
            content: 'Stabil.',
            evidenceSummary: {
              schema_version: 1,
              type: 'SALES_TREND',
              payload: {
                total_omzet: '100.00',
                transaction_count: 1,
                average_transaction_value: '100.00',
                trend: [],
              },
            },
            status: 'READY',
            periodStart: new Date('2026-08-01T00:00:00.000Z'),
            periodEnd: new Date('2026-08-18T23:59:59.999Z'),
            dataVersion: 'v1',
            generatedAt: new Date('2026-08-18T01:00:00.000Z'),
          },
        ],
      }),
    ).toMatchObject({
      analysis_job: { analysis_date: analysisJob.analysisDate },
      insights: [
        {
          evidence_summary: { schema_version: 1, type: 'SALES_TREND' },
          period_start: new Date('2026-08-01T00:00:00.000Z'),
        },
      ],
    });
  });
});
