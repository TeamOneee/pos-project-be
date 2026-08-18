jest.mock('cockatiel', () => ({
  circuitBreaker: () => ({ execute: (callback: () => unknown) => callback() }),
  handleWhen: () => ({}),
  retry: () => ({ execute: (callback: () => unknown) => callback() }),
  timeout: () => ({
    execute: (callback: (context: unknown, signal: AbortSignal) => unknown) =>
      callback({}, new AbortController().signal),
  }),
  ConsecutiveBreaker: class {},
  ExponentialBackoff: class {},
  TimeoutStrategy: { Aggressive: 'aggressive' },
}));

import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AiGenerationRequest } from '../application/insight.models';
import { AiProviderError } from './ai-provider.error';
import { LlmInsightAdapter } from './llm-insight.adapter';

function request(): AiGenerationRequest {
  return {
    merchantId: 'merchant-1',
    periodStart: new Date('2026-08-01T00:00:00.000Z'),
    periodEnd: new Date('2026-08-30T23:59:59.999Z'),
    dataVersion: 'v1',
    timezone: 'Asia/Jakarta',
    dataset: {
      summary: {
        totalOmzet: '100000.00',
        transactionCount: 2,
        averageTransactionValue: '50000.00',
      },
      series: [],
      byOutlet: [],
      topProducts: [],
      leastSellingProducts: [],
      byHour: [],
      dataVersion: 'v1',
      dataUpdatedAt: new Date('2026-08-30T23:59:59.999Z'),
      freshnessStatus: 'FRESH',
      timezone: 'Asia/Jakarta',
    },
    candidates: [
      {
        type: 'SALES_TREND',
        title: 'Tren penjualan Merchant',
        evidenceSummary: {
          schema_version: 1,
          type: 'SALES_TREND',
          payload: {
            total_omzet: '100000.00',
            transaction_count: 2,
            average_transaction_value: '50000.00',
            trend: [],
          },
        },
      },
    ],
  };
}

function config(values: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

// memverifikasi adapter hanya menerima narasi json yang sesuai schema kandidat backend.
describe('LlmInsightAdapter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('EXT-AI-003: konfigurasi provider yang belum lengkap gagal tanpa request jaringan', async () => {
    const adapter = new LlmInsightAdapter(config({}));
    const post = jest.spyOn(axios, 'post');
    await expect(adapter.generate(request())).rejects.toEqual(
      expect.objectContaining({
        category: 'PROVIDER_CONFIGURATION',
        retryable: false,
      }),
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('EXT-AI-004: menerima hanya narasi type yang dapat diparse', async () => {
    const adapter = new LlmInsightAdapter(
      config({
        AI_PROVIDER_URL: 'https://llm.example.test/v1/chat/completions',
        AI_PROVIDER_API_KEY: 'test-key',
      }),
    );
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                insights: [
                  { type: 'SALES_TREND', content: 'Penjualan stabil.' },
                ],
              }),
            },
          },
        ],
      },
    });
    await expect(adapter.generate(request())).resolves.toEqual([
      { type: 'SALES_TREND', content: 'Penjualan stabil.' },
    ]);
  });

  it('EXT-AI-004: menolak json provider dengan type di luar schema', async () => {
    const adapter = new LlmInsightAdapter(
      config({
        AI_PROVIDER_URL: 'https://llm.example.test/v1/chat/completions',
        AI_PROVIDER_API_KEY: 'test-key',
      }),
    );
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                insights: [{ type: 'FREE_TEXT', content: 'Tidak valid.' }],
              }),
            },
          },
        ],
      },
    });
    await expect(adapter.generate(request())).rejects.toBeInstanceOf(
      AiProviderError,
    );
  });

  it('EXT-AI-004: menolak response tanpa content insight', async () => {
    const adapter = new LlmInsightAdapter(
      config({
        AI_PROVIDER_URL: 'https://llm.example.test/v1/chat/completions',
        AI_PROVIDER_API_KEY: 'test-key',
      }),
    );
    jest.spyOn(axios, 'post').mockResolvedValue({ data: { choices: [] } });
    await expect(adapter.generate(request())).rejects.toEqual(
      expect.objectContaining({ category: 'PROVIDER_OUTPUT', retryable: true }),
    );
  });

  it('EXT-AI-003: response http 4xx menjadi kegagalan provider permanen', async () => {
    const adapter = new LlmInsightAdapter(
      config({
        AI_PROVIDER_URL: 'https://llm.example.test/v1/chat/completions',
        AI_PROVIDER_API_KEY: 'test-key',
      }),
    );
    jest.spyOn(axios, 'post').mockRejectedValue({
      response: { status: 401 },
    });
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    await expect(adapter.generate(request())).rejects.toEqual(
      expect.objectContaining({
        category: 'PROVIDER_REJECTED',
        retryable: false,
      }),
    );
  });
});
