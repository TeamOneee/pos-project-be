import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

export const Public = (): ((target: object, key?: unknown) => void) =>
  SetMetadata(IS_PUBLIC_KEY, true);
