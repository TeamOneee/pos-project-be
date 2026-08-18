import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, JwtClaims } from './jwt.strategy';

function makeConfig(overrides: Record<string, string> = {}) {
  const defaults: Record<string, string> = {
    JWT_ACCESS_SECRET: 'test-secret',
    ...overrides,
  };
  return {
    getOrThrow: jest.fn((key: string) => {
      if (!defaults[key]) throw new Error(`missing ${key}`);
      return defaults[key];
    }),
  } as unknown as ConfigService;
}

describe('JwtStrategy', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validasi mengembalikan AuthUser dari payload yang valid', () => {
    const strategy = new JwtStrategy(makeConfig());
    const payload: JwtClaims = {
      sub: 'user-1',
      merchant_id: 'merchant-1',
      role: 'OWNER',
      outlet_id: 'outlet-1',
    };
    const result = strategy.validate(payload);
    expect(result).toEqual({
      userId: 'user-1',
      merchantId: 'merchant-1',
      role: 'OWNER',
      outletId: 'outlet-1',
    });
  });

  it('outlet_id null ditangani dengan benar', () => {
    const strategy = new JwtStrategy(makeConfig());
    const payload: JwtClaims = {
      sub: 'user-1',
      merchant_id: 'merchant-1',
      role: 'ADMIN',
      outlet_id: null,
    };
    const result = strategy.validate(payload);
    expect(result.outletId).toBeNull();
  });

  it('melempar UnauthorizedException jika sub kosong', () => {
    const strategy = new JwtStrategy(makeConfig());
    const payload = {
      sub: '',
      merchant_id: 'm-1',
      role: 'OWNER',
      outlet_id: null,
    } as JwtClaims;
    expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
  });

  it('melempar UnauthorizedException jika merchant_id kosong', () => {
    const strategy = new JwtStrategy(makeConfig());
    const payload = {
      sub: 'u-1',
      merchant_id: '',
      role: 'OWNER',
      outlet_id: null,
    } as JwtClaims;
    expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
  });

  it('melempar UnauthorizedException jika role kosong', () => {
    const strategy = new JwtStrategy(makeConfig());
    const payload = {
      sub: 'u-1',
      merchant_id: 'm-1',
      role: '' as never,
      outlet_id: null,
    } as JwtClaims;
    expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
  });
});
