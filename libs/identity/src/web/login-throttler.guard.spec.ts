import { LoginThrottlerGuard } from './login-throttler.guard';

describe('LoginThrottlerGuard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getTracker mengembalikan key berdasarkan email dan IP', async () => {
    const guard = new LoginThrottlerGuard(
      {} as never,
      {} as never,
      {} as never,
    );
    const req = {
      body: { email: 'Budi@Test.COM' },
      ip: '127.0.0.1',
    };
    const result = await (
      guard as unknown as {
        getTracker(req: Record<string, unknown>): Promise<string>;
      }
    ).getTracker(req);
    expect(result).toBe('login:budi@test.com:127.0.0.1');
  });

  it('getTracker menangani email kosong', async () => {
    const guard = new LoginThrottlerGuard(
      {} as never,
      {} as never,
      {} as never,
    );
    const req = { body: {}, ip: '10.0.0.1' }; // eslint-disable-line sonarjs/no-hardcoded-ip
    const result = await (
      guard as unknown as {
        getTracker(req: Record<string, unknown>): Promise<string>;
      }
    ).getTracker(req);
    expect(result).toBe('login::10.0.0.1');
  });

  it('getTracker menangani body undefined', async () => {
    const guard = new LoginThrottlerGuard(
      {} as never,
      {} as never,
      {} as never,
    );
    const req = { ip: '192.168.1.1' }; // eslint-disable-line sonarjs/no-hardcoded-ip
    const result = await (
      guard as unknown as {
        getTracker(req: Record<string, unknown>): Promise<string>;
      }
    ).getTracker(req);
    expect(result).toBe('login::192.168.1.1');
  });

  it('getTracker menangani IP tidak ada', async () => {
    const guard = new LoginThrottlerGuard(
      {} as never,
      {} as never,
      {} as never,
    );
    const req = { body: { email: 'test@test.com' } };
    const result = await (
      guard as unknown as {
        getTracker(req: Record<string, unknown>): Promise<string>;
      }
    ).getTracker(req);
    expect(result).toBe('login:test@test.com:unknown');
  });

  it('getTracker menangani email non-string', async () => {
    const guard = new LoginThrottlerGuard(
      {} as never,
      {} as never,
      {} as never,
    );
    const req = { body: { email: 12345 }, ip: '1.2.3.4' }; // eslint-disable-line sonarjs/no-hardcoded-ip
    const result = await (
      guard as unknown as {
        getTracker(req: Record<string, unknown>): Promise<string>;
      }
    ).getTracker(req);
    expect(result).toBe('login::1.2.3.4');
  });
});
