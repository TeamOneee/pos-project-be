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

  it('EXT-AI-003: konfigurasi hanya url tanpa key juga gagal', async () => {
    const adapter = new LlmInsightAdapter(
      config({
        AI_PROVIDER_URL: 'https://example.com',
        AI_PROVIDER_API_KEY: undefined,
      }),
    );
    await expect(adapter.generate(request())).rejects.toMatchObject({
      category: 'PROVIDER_CONFIGURATION',
    });
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

  it('EXT-AI-004: menolak response null content', async () => {
    const adapter = new LlmInsightAdapter(
      config({
        AI_PROVIDER_URL: 'https://llm.example.test/v1/chat/completions',
        AI_PROVIDER_API_KEY: 'test-key',
      }),
    );
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: null } }] },
    });
    await expect(adapter.generate(request())).rejects.toMatchObject({
      category: 'PROVIDER_OUTPUT',
    });
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

  it('parseNarratives: menolak value null', async () => {
    const adapter = new LlmInsightAdapter(
      config({
        AI_PROVIDER_URL: 'https://llm.example.test/v1/chat/completions',
        AI_PROVIDER_API_KEY: 'test-key',
      }),
    );
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: JSON.stringify(null) } }] },
    });
    await expect(adapter.generate(request())).rejects.toMatchObject({
      category: 'PROVIDER_OUTPUT',
    });
  });

  it('parseNarratives: menolak non-object', async () => {
    const adapter = new LlmInsightAdapter(
      config({
        AI_PROVIDER_URL: 'https://llm.example.test/v1/chat/completions',
        AI_PROVIDER_API_KEY: 'test-key',
      }),
    );
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: JSON.stringify('string') } }] },
    });
    await expect(adapter.generate(request())).rejects.toMatchObject({
      category: 'PROVIDER_OUTPUT',
    });
  });

  it('parseNarratives: menolak insights bukan array', async () => {
    const adapter = new LlmInsightAdapter(
      config({
        AI_PROVIDER_URL: 'https://llm.example.test/v1/chat/completions',
        AI_PROVIDER_API_KEY: 'test-key',
      }),
    );
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        choices: [
          { message: { content: JSON.stringify({ insights: 'bad' }) } },
        ],
      },
    });
    await expect(adapter.generate(request())).rejects.toMatchObject({
      category: 'PROVIDER_OUTPUT',
    });
  });

  it('parseNarratives: menolak item insight bukan object', async () => {
    const adapter = new LlmInsightAdapter(
      config({
        AI_PROVIDER_URL: 'https://llm.example.test/v1/chat/completions',
        AI_PROVIDER_API_KEY: 'test-key',
      }),
    );
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        choices: [
          { message: { content: JSON.stringify({ insights: [123] }) } },
        ],
      },
    });
    await expect(adapter.generate(request())).rejects.toMatchObject({
      category: 'PROVIDER_OUTPUT',
    });
  });

  it('parseNarratives: menolak content bukan string', async () => {
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
                insights: [{ type: 'SALES_TREND', content: 123 }],
              }),
            },
          },
        ],
      },
    });
    await expect(adapter.generate(request())).rejects.toMatchObject({
      category: 'PROVIDER_OUTPUT',
    });
  });

  it('parseNarratives: menolak content kosong setelah trim', async () => {
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
                insights: [{ type: 'SALES_TREND', content: '   ' }],
              }),
            },
          },
        ],
      },
    });
    await expect(adapter.generate(request())).rejects.toMatchObject({
      category: 'PROVIDER_OUTPUT',
    });
  });

  it('parseNarratives: menolak content terlalu panjang >2000', async () => {
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
                insights: [{ type: 'SALES_TREND', content: 'a'.repeat(2001) }],
              }),
            },
          },
        ],
      },
    });
    await expect(adapter.generate(request())).rejects.toMatchObject({
      category: 'PROVIDER_OUTPUT',
    });
  });

  it('parseNarratives: menolak duplicate type', async () => {
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
                  { type: 'SALES_TREND', content: 'a' },
                  { type: 'SALES_TREND', content: 'b' },
                ],
              }),
            },
          },
        ],
      },
    });
    await expect(adapter.generate(request())).rejects.toMatchObject({
      category: 'PROVIDER_OUTPUT',
    });
  });

  it('parseResponse: menolak JSON tidak dapat diparse', async () => {
    const adapter = new LlmInsightAdapter(
      config({
        AI_PROVIDER_URL: 'https://llm.example.test/v1/chat/completions',
        AI_PROVIDER_API_KEY: 'test-key',
      }),
    );
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: '{invalid json' } }] },
    });
    await expect(adapter.generate(request())).rejects.toMatchObject({
      category: 'PROVIDER_OUTPUT',
    });
  });

  it('toProviderError: non-axios error menjadi PROVIDER_NETWORK', async () => {
    const adapter = new LlmInsightAdapter(
      config({
        AI_PROVIDER_URL: 'https://llm.example.test/v1/chat/completions',
        AI_PROVIDER_API_KEY: 'test-key',
      }),
    );
    jest.spyOn(axios, 'post').mockRejectedValue(new Error('random error'));
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);
    await expect(adapter.generate(request())).rejects.toMatchObject({
      category: 'PROVIDER_NETWORK',
    });
  });

  it.each([
    ['ECONNABORTED', { code: 'ECONNABORTED' }, 'PROVIDER_TIMEOUT'],
    ['ERR_CANCELED', { code: 'ERR_CANCELED' }, 'PROVIDER_TIMEOUT'],
    [
      '5xx',
      { code: 'ERR_NETWORK', response: { status: 500 } },
      'PROVIDER_NETWORK',
    ],
    ['tanpa response', { code: 'ENOTFOUND' }, 'PROVIDER_NETWORK'],
  ])(
    'toProviderError: axios %s menjadi %s',
    async (_description, providerError, category) => {
      const adapter = new LlmInsightAdapter(
        config({
          AI_PROVIDER_URL: 'https://llm.example.test/v1/chat/completions',
          AI_PROVIDER_API_KEY: 'test-key',
        }),
      );
      jest.spyOn(axios, 'post').mockRejectedValue(providerError);
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      await expect(adapter.generate(request())).rejects.toMatchObject({
        category,
      });
    },
  );

  it('toProviderError: meneruskan AiProviderError langsung', async () => {
    const adapter = new LlmInsightAdapter(
      config({
        AI_PROVIDER_URL: 'https://llm.example.test/v1/chat/completions',
        AI_PROVIDER_API_KEY: 'test-key',
      }),
    );
    const direct = new AiProviderError('PROVIDER_OUTPUT', true, 'direct');
    jest.spyOn(axios, 'post').mockRejectedValue(direct);
    // isAxiosError not relevant because first check instanceof AiProviderError
    await expect(adapter.generate(request())).rejects.toBe(direct);
  });

  it('generate: breaker throws non-AiProviderError menjadi PROVIDER_NETWORK', async () => {
    // override cockatiel breaker to throw generic error
    jest.resetModules();
    jest.doMock('cockatiel', () => ({
      circuitBreaker: () => ({
        execute: () => {
          throw new Error('circuit broken');
        },
      }),
      handleWhen: () => ({}),
      retry: () => ({ execute: (cb: () => unknown) => cb() }),
      timeout: () => ({
        execute: (cb: (c: unknown, s: AbortSignal) => unknown) =>
          cb({}, new AbortController().signal),
      }),
      ConsecutiveBreaker: class {},
      ExponentialBackoff: class {},
      TimeoutStrategy: { Aggressive: 'aggressive' },
    }));
    // need re-import after mock - use dynamic import
    const { LlmInsightAdapter: FreshAdapter } =
      await import('./llm-insight.adapter');
    const fresh = new FreshAdapter(
      config({
        AI_PROVIDER_URL: 'https://llm.example.test/v1/chat/completions',
        AI_PROVIDER_API_KEY: 'test-key',
      }),
    );
    await expect(fresh.generate(request())).rejects.toMatchObject({
      category: 'PROVIDER_NETWORK',
    });
  });

  it('isRetryableProviderError via retry breaker config: providerUrl dan key lengkap', () => {
    const cfg = config({
      AI_PROVIDER_URL: 'https://example.com',
      AI_PROVIDER_API_KEY: 'k',
      AI_PROVIDER_MODEL: 'custom-model',
      AI_PROVIDER_TIMEOUT_MS: '9999',
      AI_PROVIDER_MAX_ATTEMPTS: '5',
      AI_PROVIDER_BREAKER_THRESHOLD: '7',
      AI_PROVIDER_BREAKER_COOLDOWN_MS: '12345',
    });
    const adapter = new LlmInsightAdapter(cfg);
    // confirm no throw on construction with custom values
    expect(adapter).toBeDefined();
  });
});
