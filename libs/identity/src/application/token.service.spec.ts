import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
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
        };
        return values[key];
      }),
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: 'test-access-secret',
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

  it('menandatangani access token 900 detik dengan klaim (FR-AUTH-007)', () => {
    const { token, expiresInSeconds } = service.signAccessToken(claims);
    expect(expiresInSeconds).toBe(900);
    expect(token).toBe('signed-token');
    expect(jwtService.sign).toHaveBeenCalledWith(
      { sub: 'u-123', merchant_id: 'm-456', role: 'OWNER', outlet_id: null },
      { secret: 'test-access-secret', expiresIn: 900 },
    );
  });

  it('mendukung kustomisasi durasi token dari konfigurasi (mis. 30m)', () => {
    const customConfig = {
      get: jest.fn((key: string) =>
        key === 'JWT_ACCESS_EXPIRES_IN' ? '30m' : undefined,
      ),
      getOrThrow: jest.fn(() => 'test-access-secret'),
    };
    const customService = new TokenService(
      jwtService as unknown as JwtService,
      customConfig as unknown as ConfigService,
    );
    const { expiresInSeconds } = customService.signAccessToken(claims);
    expect(expiresInSeconds).toBe(1800);
  });
});
