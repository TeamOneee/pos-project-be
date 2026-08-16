import { SetMetadata } from '@nestjs/common';
import { UserRole } from './user-role';

export const ROLES_KEY = 'roles';

export const Roles = (
  ...roles: UserRole[]
): ((target: object, key?: unknown) => void) => SetMetadata(ROLES_KEY, roles);
