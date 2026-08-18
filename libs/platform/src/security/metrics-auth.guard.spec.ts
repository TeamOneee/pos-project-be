import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { MetricsAuthGuard } from './metrics-auth.guard';

function makeContext(url: string, authHeader?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        url,
        headers: authHeader ? { authorization: authHeader } : {},
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('MetricsAuthGuard', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('route non-metrics lolos tanpa auth', () => {
    delete process.env.METRICS_AUTH_USER;
    delete process.env.METRICS_AUTH_PASSWORD;
    const guard = new MetricsAuthGuard();
    expect(guard.canActivate(makeContext('/api/v1/checkout'))).toBe(true);
  });

  it('route /metrics lolos jika env vars tidak diset', () => {
    delete process.env.METRICS_AUTH_USER;
    delete process.env.METRICS_AUTH_PASSWORD;
    const guard = new MetricsAuthGuard();
    expect(guard.canActivate(makeContext('/metrics'))).toBe(true);
  });

  it('route /metrics lolos dengan credential benar', () => {
    process.env.METRICS_AUTH_USER = 'monitor';
    process.env.METRICS_AUTH_PASSWORD = 'secret';
    const encoded = Buffer.from('monitor:secret').toString('base64');
    const guard = new MetricsAuthGuard();
    expect(guard.canActivate(makeContext('/metrics', `Basic ${encoded}`))).toBe(
      true,
    );
  });

  it('route /metrics tolak jika credential salah', () => {
    process.env.METRICS_AUTH_USER = 'monitor';
    process.env.METRICS_AUTH_PASSWORD = 'secret';
    const encoded = Buffer.from('monitor:wrong').toString('base64');
    const guard = new MetricsAuthGuard();
    expect(() =>
      guard.canActivate(makeContext('/metrics', `Basic ${encoded}`)),
    ).toThrow(UnauthorizedException);
  });

  it('route /metrics tolak jika tidak ada auth header', () => {
    process.env.METRICS_AUTH_USER = 'monitor';
    process.env.METRICS_AUTH_PASSWORD = 'secret';
    const guard = new MetricsAuthGuard();
    expect(() => guard.canActivate(makeContext('/metrics'))).toThrow(
      UnauthorizedException,
    );
  });

  it('route /metrics tolak jika header bearer (bukan basic)', () => {
    process.env.METRICS_AUTH_USER = 'monitor';
    process.env.METRICS_AUTH_PASSWORD = 'secret';
    const guard = new MetricsAuthGuard();
    expect(() =>
      guard.canActivate(makeContext('/metrics', 'Bearer some-token')),
    ).toThrow(UnauthorizedException);
  });
});
