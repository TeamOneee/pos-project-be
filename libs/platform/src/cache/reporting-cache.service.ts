import { Injectable } from '@nestjs/common';

export const REPORTING_CACHE_TTL_MS = 30 * 60_000;

export interface ReportingCacheValue<T = unknown> {
  data: T;
  data_updated_at: string;
  freshness_status: 'FRESH' | 'STALE';
}

// Placeholder ReportingCacheService — cache-aside Redis + single-flight lock
// (06 §3.6.1) belum terpasang (deps @nestjs/cache-manager + ioredis).
// Implementasi penuh menyusul saat modul reporting dikerjakan.
@Injectable()
export class ReportingCacheService {
  async get<T>(_key: string): Promise<ReportingCacheValue<T> | undefined> {
    return undefined;
  }

  async set<T>(
    _key: string,
    _value: ReportingCacheValue<T>,
  ): Promise<void> {
    return undefined;
  }
}
