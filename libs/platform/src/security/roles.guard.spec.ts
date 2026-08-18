import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiError } from '../error/api-error';
import { RolesGuard } from './roles.guard';

function makeContext(options: {
  requiredRoles?: string[];
  userRole?: string;
  noUser?: boolean;
}) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(options.requiredRoles),
  };

  const request = options.noUser
    ? {}
    : { user: options.userRole ? { role: options.userRole } : {} };

  const host = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
    getHandler: jest.fn().mockReturnValue(jest.fn()),
    getClass: jest.fn().mockReturnValue(jest.fn()),
  };

  return {
    reflector: reflector as unknown as Reflector,
    host: host as unknown as ExecutionContext,
  };
}

describe('RolesGuard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mengizinkan akses jika tidak ada roles yang ditentukan', () => {
    const { reflector, host } = makeContext({});
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(host)).toBe(true);
  });

  it('mengizinkan akses jika roles kosong', () => {
    const { reflector, host } = makeContext({ requiredRoles: [] });
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(host)).toBe(true);
  });

  it('mengizinkan akses jika role user sesuai', () => {
    const { reflector, host } = makeContext({
      requiredRoles: ['OWNER', 'ADMIN'],
      userRole: 'OWNER',
    });
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(host)).toBe(true);
  });

  it('melempar FORBIDDEN jika role user tidak sesuai', () => {
    const { reflector, host } = makeContext({
      requiredRoles: ['OWNER'],
      userRole: 'CASHIER',
    });
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(host)).toThrow(ApiError);
  });

  it('melempar FORBIDDEN jika tidak ada user di request', () => {
    const { reflector, host } = makeContext({
      requiredRoles: ['OWNER'],
      noUser: true,
    });
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(host)).toThrow(ApiError);
  });

  it('melempar FORBIDDEN jika user tidak punya role', () => {
    const { reflector, host } = makeContext({
      requiredRoles: ['OWNER'],
      userRole: undefined,
    });
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(host)).toThrow(ApiError);
  });
});
