import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../types/role';

export interface UserPayload {
  userId: string;
  email: string;
  role: UserRole;
  merchantId: string;
  outletId?: string;
}

export const GetUser = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as UserPayload;
    return data ? user[data] : user;
  },
);
