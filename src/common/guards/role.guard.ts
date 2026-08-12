import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserPayload } from '../decorators/get-user.decorator';
import { UserRole } from '../types/role';

/**
 * Guard untuk validasi peran pengguna.
 * Digunakan untuk melindungi endpoint berdasarkan peran (role) pengguna.
 *
 * Contoh penggunaan:
 * @UseGuards(RoleGuard(RoleName.CASHIER))
 * @UseGuards(RoleGuard(RoleName.OWNER))
 * @UseGuards(RoleGuard(RoleName.ADMIN))
 */
export const RoleGuard = (role: UserRole): Type<CanActivate> => {
  @Injectable()
  class RoleGuardMixin implements CanActivate {
    constructor(_reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      const user = req.user as UserPayload;
      if (user.role !== role) {
        throw new ForbiddenException(`Access denied. ${role} only`);
      }
      return true;
    }
  }
  return RoleGuardMixin;
};
