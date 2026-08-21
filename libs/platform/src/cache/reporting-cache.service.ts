import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { posCacheOperationsTotal } from '../platform.metrics';

export const REPORTING_CACHE_TTL_MS = 30 * 60_000;
const STALE_CACHE_TTL_MS = 2 * 60 * 60_000;
const LOCK_TTL_MS = 30_000;
const LOCK_WAIT_ATTEMPTS = 10;
const LOCK_WAIT_MS = 100;

export interface ReportingCacheEntry<T> {
  data: T;
  dataUpdatedAt: string;
}

export interface ReportingCacheLoadResult<T> {
  entry: ReportingCacheEntry<T>;
  source: 'CACHE' | 'COMPUTED';
}

/**
 * Kontrak cache-aside untuk modul reporting.
 * Menyediakan akses fresh cache, stale fallback, dan single-flight loading.
 */
export interface ReportingCachePort {
  getStale<T>(key: string): Promise<ReportingCacheEntry<T> | undefined>;
  getOrLoad<T>(
    key: string,
    loader: () => Promise<T>,
  ): Promise<ReportingCacheLoadResult<T>>;
}

interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}

// penyedia cache-aside redis dengan fallback memory dan proteksi single-flight distributed lock.
@Injectable()
export class ReportingCacheService
  implements ReportingCachePort, OnModuleDestroy
{
  private readonly memory = new Map<string, MemoryCacheEntry>();
  private readonly inFlight = new Map<
    string,
    Promise<ReportingCacheLoadResult<unknown>>
  >();
  private readonly redis?: Redis;

  constructor(config: ConfigService) {
    const redisUrl = config.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        lazyConnect: false,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        enableReadyCheck: true,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
      });
      // eager connect di background, jangan block bootstrap tapi hilangkan 5s lazy penalty di hit pertama
      this.redis.connect().catch(() => {});
    }
  }

  async onModuleInit(): Promise<void> {
    if (this.redis) {
      try {
        if (this.redis.status !== 'ready') await this.redis.connect();
        await this.redis.ping();
      } catch {}
    }
  }

  async getFresh<T>(key: string): Promise<ReportingCacheEntry<T> | undefined> {
    return this.read<T>(this.freshKey(key));
  }

  async getStale<T>(key: string): Promise<ReportingCacheEntry<T> | undefined> {
    const entry = await this.read<T>(this.staleKey(key));
    posCacheOperationsTotal.inc({ operation: entry ? 'hit' : 'miss' });
    return entry;
  }

  // mengembalikan data dari cache atau memuat dari loader dengan perlindungan stampede:
  // 1. periksa fresh cache di redis/memory
  // 2. jika miss, delegasikan ke single-flight execution (in-flight promise map)
  // 3. simpan hasil baru ke fresh dan stale cache
  async getOrLoad<T>(
    key: string,
    loader: () => Promise<T>,
  ): Promise<ReportingCacheLoadResult<T>> {
    const cached = await this.getFresh<T>(key);
    if (cached) {
      posCacheOperationsTotal.inc({ operation: 'hit' });
      return { entry: cached, source: 'CACHE' };
    }
    posCacheOperationsTotal.inc({ operation: 'miss' });

    const current = this.inFlight.get(key) as
      Promise<ReportingCacheLoadResult<T>> | undefined;
    if (current !== undefined) return current;

    const pending = this.loadWithSingleFlight(key, loader);
    this.inFlight.set(key, pending);
    try {
      return await pending;
    } finally {
      this.inFlight.delete(key);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        this.redis.disconnect();
      }
    }
  }

  // mencegah cache stampede thundering herd lintas instance:
  // 1. coba acquire distributed lock di redis (ttl 30s)
  // 2. jika menang lock: hitung data baru, simpan cache, dan rilis lock
  // 3. jika kalah lock: polling tunggu hasil cache fresh holder selama 1 detik
  // 4. jika batas tunggu terlampaui: fallback eksekusi mandiri agar request tidak gantung
  private async loadWithSingleFlight<T>(
    key: string,
    loader: () => Promise<T>,
  ): Promise<ReportingCacheLoadResult<T>> {
    if (!this.redis) return this.loadAndStore(key, loader);

    const lockToken = `${process.pid}:${Date.now()}:${randomUUID()}`;
    const acquired = await this.acquireLock(key, lockToken);
    if (acquired) {
      try {
        const cached = await this.getFresh<T>(key);
        if (cached) return { entry: cached, source: 'CACHE' };
        return await this.loadAndStore(key, loader);
      } finally {
        await this.releaseLock(key, lockToken);
      }
    }

    for (let attempt = 0; attempt < LOCK_WAIT_ATTEMPTS; attempt += 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, LOCK_WAIT_MS));
      const cached = await this.getFresh<T>(key);
      if (cached) return { entry: cached, source: 'CACHE' };
    }

    return this.loadAndStore(key, loader);
  }

  private async loadAndStore<T>(
    key: string,
    loader: () => Promise<T>,
  ): Promise<ReportingCacheLoadResult<T>> {
    const entry: ReportingCacheEntry<T> = {
      data: await loader(),
      dataUpdatedAt: new Date().toISOString(),
    };
    await this.write(this.freshKey(key), entry, REPORTING_CACHE_TTL_MS);
    await this.write(this.staleKey(key), entry, STALE_CACHE_TTL_MS);
    return { entry, source: 'COMPUTED' };
  }

  private freshKey(key: string): string {
    return `reporting:fresh:${key}`;
  }

  private staleKey(key: string): string {
    return `reporting:stale:${key}`;
  }

  private async read<T>(
    key: string,
  ): Promise<ReportingCacheEntry<T> | undefined> {
    // coba redis dulu, fallback ke memory kalau redis offline/miss — biar hit tetap terjadi walau Upstash lag
    if (this.redis) {
      try {
        const raw = await this.redis.get(key);
        if (raw) {
          const parsed = JSON.parse(raw) as ReportingCacheEntry<T>;
          if (parsed && typeof parsed.dataUpdatedAt === 'string') return parsed;
        }
      } catch {}
      // redis miss/error → cek memory
      try {
        const mem = this.readMemory(key);
        if (!mem) return undefined;
        const parsed = JSON.parse(mem) as ReportingCacheEntry<T>;
        if (!parsed || typeof parsed.dataUpdatedAt !== 'string') return undefined;
        return parsed;
      } catch {
        return undefined;
      }
    }
    try {
      const raw = this.readMemory(key);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as ReportingCacheEntry<T>;
      if (!parsed || typeof parsed.dataUpdatedAt !== 'string') return undefined;
      return parsed;
    } catch {
      return undefined;
    }
  }

  private async write<T>(
    key: string,
    value: ReportingCacheEntry<T>,
    ttlMs: number,
  ): Promise<void> {
    const raw = JSON.stringify(value);
    try {
      if (this.redis) {
        await this.redis.set(key, raw, 'PX', ttlMs);
        return;
      }
      this.memory.set(key, { value: raw, expiresAt: Date.now() + ttlMs });
    } catch {
      this.memory.set(key, { value: raw, expiresAt: Date.now() + ttlMs });
    }
  }

  private readMemory(key: string): string | undefined {
    const entry = this.memory.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return undefined;
    }
    return entry.value;
  }

  private async acquireLock(key: string, token: string): Promise<boolean> {
    try {
      const result = await this.redis?.set(
        `reporting:lock:${key}`,
        token,
        'PX',
        LOCK_TTL_MS,
        'NX',
      );
      return result === 'OK';
    } catch {
      return false;
    }
  }

  private async releaseLock(key: string, token: string): Promise<void> {
    try {
      await this.redis?.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0",
        1,
        `reporting:lock:${key}`,
        token,
      );
    } catch {
      // lock akan habis sendiri; kegagalan release tidak memengaruhi source transaction.
    }
  }
}
