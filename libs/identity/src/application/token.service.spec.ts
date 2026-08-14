import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { TokenService, TokenUserClaims } from './token.service';

const claims: TokenUserClaims = {
  userId: 'u-123',
  merchantId: 'm-456',
  role: 'OWNER',
  outletId: null,
};

describe('TokenService', () => {
  let service: TokenService;
  const jwtService = {
    sign: jest.fn(() => 'signed-token'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const config = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '30d',
        };
        return values[key] ?? null;
      }),
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: 'test-access-secret',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
        };
        if (!values[key]) throw new Error(`missing ${key}`);
        return values[key];
      }),
    };
    service = new TokenService(
      jwtService as unknown as JwtService,
      config as unknown as ConfigService,
    );
  });

  it('menandatangani access token dengan klaim dan masa berlaku (FR-AUTH-007)', () => {
    const { token, expiresInSeconds } = service.signAccessToken(claims);
    expect(expiresInSeconds).toBe(15 * 60);
    expect(token).toBe('signed-token');
    expect(jwtService.sign).toHaveBeenCalledWith(
      { sub: 'u-123', merchant_id: 'm-456', role: 'OWNER', outlet_id: null },
      { secret: 'test-access-secret', expiresIn: 900 },
    );
  });

  it('memakai secret terpisah untuk refresh token (DR-002)', () => {
    const { token, expiresInSeconds } = service.signRefreshToken(claims);
    expect(expiresInSeconds).toBe(30 * 86_400);
    expect(token).toBe('signed-token');
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'u-123' }),
      expect.objectContaining({
        secret: 'test-refresh-secret',
        expiresIn: 2_592_000,
      }),
    );
  });

  it('hash refresh token adalah sha256 hex yang konsisten (DR-001)', () => {
    const hash = service.hashRefreshToken('raw-token');
    expect(hash).toBe(createHash('sha256').update('raw-token').digest('hex'));
    expect(hash).not.toContain('raw-token');
  });
});
