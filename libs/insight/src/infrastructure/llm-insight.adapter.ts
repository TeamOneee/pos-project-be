import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import {
  CircuitBreakerPolicy,
  circuitBreaker,
  ConsecutiveBreaker,
  ExponentialBackoff,
  handleWhen,
  retry,
  RetryPolicy,
  timeout,
  TimeoutPolicy,
  TimeoutStrategy,
} from 'cockatiel';
import {
  AiGenerationRequest,
  GeneratedInsightNarrative,
  INSIGHT_TYPES,
  InsightType,
} from '../application/insight.models';
import { AiProviderPort } from '../application/ports/ai-provider.port';
import { AiProviderError } from './ai-provider.error';

interface OpenAiCompatibleResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

function readPositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function isInsightType(value: unknown): value is InsightType {
  return (
    typeof value === 'string' && INSIGHT_TYPES.includes(value as InsightType)
  );
}

function parseNarratives(value: unknown): GeneratedInsightNarrative[] {
  if (!value || typeof value !== 'object') {
    throw new AiProviderError(
      'PROVIDER_OUTPUT',
      true,
      'Provider mengembalikan JSON insight tidak valid.',
    );
  }
  const insights = (value as { insights?: unknown }).insights;
  if (!Array.isArray(insights)) {
    throw new AiProviderError(
      'PROVIDER_OUTPUT',
      true,
      'Provider tidak mengembalikan daftar insight.',
    );
  }
  const parsed = insights.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new AiProviderError(
        'PROVIDER_OUTPUT',
        true,
        'Provider mengembalikan item insight tidak valid.',
      );
    }
    const candidate = item as { type?: unknown; content?: unknown };
    if (
      !isInsightType(candidate.type) ||
      typeof candidate.content !== 'string'
    ) {
      throw new AiProviderError(
        'PROVIDER_OUTPUT',
        true,
        'Provider mengembalikan type atau content insight tidak valid.',
      );
    }
    const content = candidate.content.trim();
    if (!content || content.length > 2_000) {
      throw new AiProviderError(
        'PROVIDER_OUTPUT',
        true,
        'Provider mengembalikan content insight kosong atau terlalu panjang.',
      );
    }
    return { type: candidate.type, content };
  });
  if (new Set(parsed.map((item) => item.type)).size !== parsed.length) {
    throw new AiProviderError(
      'PROVIDER_OUTPUT',
      true,
      'Provider mengembalikan type insight duplikat.',
    );
  }
  return parsed;
}

// memanggil endpoint llm kompatibel openai untuk narasi, bukan fakta atau evidence.
@Injectable()
export class LlmInsightAdapter extends AiProviderPort {
  private readonly providerUrl: string;
  private readonly providerKey: string | undefined;
  private readonly providerModel: string;
  private readonly requestTimeoutMs: number;
  private readonly retryPolicy: RetryPolicy;
  private readonly timeoutPolicy: TimeoutPolicy;
  private readonly breaker: CircuitBreakerPolicy;

  constructor(config: ConfigService) {
    super();
    this.providerUrl = config.get<string>('AI_PROVIDER_URL') ?? '';
    this.providerKey = config.get<string>('AI_PROVIDER_API_KEY');
    this.providerModel =
      config.get<string>('AI_PROVIDER_MODEL') ?? 'gpt-4.1-mini';
    this.requestTimeoutMs = readPositiveInteger(
      config.get('AI_PROVIDER_TIMEOUT_MS'),
      15_000,
    );
    this.retryPolicy = retry(handleWhen(isRetryableProviderError), {
      maxAttempts: readPositiveInteger(
        config.get('AI_PROVIDER_MAX_ATTEMPTS'),
        2,
      ),
      backoff: new ExponentialBackoff({ initialDelay: 250, maxDelay: 2_000 }),
    });
    this.timeoutPolicy = timeout(
      this.requestTimeoutMs,
      TimeoutStrategy.Aggressive,
    );
    this.breaker = circuitBreaker(handleWhen(isRetryableProviderError), {
      breaker: new ConsecutiveBreaker(
        readPositiveInteger(config.get('AI_PROVIDER_BREAKER_THRESHOLD'), 3),
      ),
      halfOpenAfter: readPositiveInteger(
        config.get('AI_PROVIDER_BREAKER_COOLDOWN_MS'),
        30_000,
      ),
    });
  }

  async generate(
    request: AiGenerationRequest,
  ): Promise<GeneratedInsightNarrative[]> {
    this.assertConfigured();
    try {
      return await this.breaker.execute(() =>
        this.retryPolicy.execute(() =>
          this.timeoutPolicy.execute((_context, signal) =>
            this.callProvider(request, signal),
          ),
        ),
      );
    } catch (error: unknown) {
      if (error instanceof AiProviderError) throw error;
      throw new AiProviderError(
        'PROVIDER_NETWORK',
        true,
        'Provider insight tidak dapat dihubungi.',
      );
    }
  }

  private assertConfigured(): void {
    if (!this.providerUrl || !this.providerKey) {
      throw new AiProviderError(
        'PROVIDER_CONFIGURATION',
        false,
        'Konfigurasi provider insight belum lengkap.',
      );
    }
  }

  private async callProvider(
    request: AiGenerationRequest,
    signal: AbortSignal,
  ): Promise<GeneratedInsightNarrative[]> {
    try {
      const response = await axios.post<OpenAiCompatibleResponse>(
        this.providerUrl,
        {
          model: this.providerModel,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Anda menulis narasi singkat insight bisnis. Jangan membuat angka, type, atau evidence baru. Kembalikan JSON tunggal: {"insights":[{"type":"...","content":"..."}]}.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                period_start: request.periodStart.toISOString(),
                period_end: request.periodEnd.toISOString(),
                timezone: request.timezone,
                data_version: request.dataVersion,
                candidates: request.candidates.map((candidate) => ({
                  type: candidate.type,
                  title: candidate.title,
                  evidence_summary: candidate.evidenceSummary,
                })),
              }),
            },
          ],
        },
        {
          headers: { Authorization: `Bearer ${this.providerKey}` },
          signal,
          timeout: this.requestTimeoutMs,
        },
      );
      return this.parseResponse(response.data);
    } catch (error: unknown) {
      throw this.toProviderError(error);
    }
  }

  private parseResponse(
    response: OpenAiCompatibleResponse,
  ): GeneratedInsightNarrative[] {
    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new AiProviderError(
        'PROVIDER_OUTPUT',
        true,
        'Provider tidak mengembalikan content insight.',
      );
    }
    try {
      return parseNarratives(JSON.parse(content) as unknown);
    } catch (error: unknown) {
      if (error instanceof AiProviderError) throw error;
      throw new AiProviderError(
        'PROVIDER_OUTPUT',
        true,
        'Provider mengembalikan JSON insight tidak dapat diparse.',
      );
    }
  }

  private toProviderError(error: unknown): AiProviderError {
    if (error instanceof AiProviderError) return error;
    if (!axios.isAxiosError(error)) {
      return new AiProviderError(
        'PROVIDER_NETWORK',
        true,
        'Provider insight tidak dapat dihubungi.',
      );
    }
    const axiosError = error as AxiosError;
    if (
      axiosError.code === 'ECONNABORTED' ||
      axiosError.code === 'ERR_CANCELED'
    ) {
      return new AiProviderError(
        'PROVIDER_TIMEOUT',
        true,
        'Provider insight melebihi batas waktu.',
      );
    }
    if (
      axiosError.response &&
      axiosError.response.status >= 400 &&
      axiosError.response.status < 500
    ) {
      return new AiProviderError(
        'PROVIDER_REJECTED',
        false,
        'Provider insight menolak request.',
      );
    }
    return new AiProviderError(
      'PROVIDER_NETWORK',
      true,
      'Provider insight tidak dapat dihubungi.',
    );
  }
}

function isRetryableProviderError(error: unknown): boolean {
  return error instanceof AiProviderError && error.retryable;
}
