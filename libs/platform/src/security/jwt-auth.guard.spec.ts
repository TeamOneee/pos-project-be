import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiError } from '../error/api-error';
import { JwtAuthGuard } from './jwt-auth.guard';

function makeContext(overrides: { isPublic?: boolean } = {}) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(overrides.isPublic ?? false),
  };
  return {
    reflector: reflector as unknown as Reflector,
    handler: jest.fn(),
    classRef: jest.fn(),
    getHandler: jest.fn().mockReturnValue(jest.fn()),
    getClass: jest.fn().mockReturnValue(jest.fn()),
  };
}

describe('JwtAuthGuard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('route @Public() melewati autentikasi', () => {
    const ctx = makeContext({ isPublic: true });
    const guard = new JwtAuthGuard(ctx.reflector);
    const result = guard.canActivate({
      getHandler: ctx.getHandler,
      getClass: ctx.getClass,
    } as unknown as ExecutionContext);
    expect(result).toBe(true);
    expect(ctx.reflector.getAllAndOverride).toHaveBeenCalled();
  });

  it('route non-public memanggil super.canActivate', () => {
    const ctx = makeContext({ isPublic: false });
    const guard = new JwtAuthGuard(ctx.reflector);
    jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockReturnValue(true);
    const result = guard.canActivate({
      getHandler: ctx.getHandler,
      getClass: ctx.getClass,
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ path: '/api/v1/checkout' }),
      }),
    } as unknown as ExecutionContext);
    expect(result).toBe(true);
  });

  it('route /metrics melewati autentikasi', () => {
    const ctx = makeContext({ isPublic: false });
    const guard = new JwtAuthGuard(ctx.reflector);
    const result = guard.canActivate({
      getHandler: ctx.getHandler,
      getClass: ctx.getClass,
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ path: '/api/v1/metrics' }),
      }),
    } as unknown as ExecutionContext);
    expect(result).toBe(true);
  });

  it('handleRequest melempar unauthenticated jika user null', () => {
    const ctx = makeContext();
    const guard = new JwtAuthGuard(ctx.reflector);
    expect(() => guard.handleRequest(null, null)).toThrow(ApiError);
  });

  it('handleRequest melempar unauthenticated jika error ada', () => {
    const ctx = makeContext();
    const guard = new JwtAuthGuard(ctx.reflector);
    expect(() => guard.handleRequest(new Error('jwt expired'), null)).toThrow(
      ApiError,
    );
  });

  it('handleRequest mengembalikan user jika valid', () => {
    const ctx = makeContext();
    const guard = new JwtAuthGuard(ctx.reflector);
    const user = { userId: 'u-1', role: 'OWNER' };
    expect(guard.handleRequest(null, user)).toEqual(user);
  });
});
