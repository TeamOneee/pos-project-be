import { AccountStatus } from '@prisma/client';

// 07 §2.2: response GET/PATCH /merchant hanya key fields.
export class MerchantDto {
  id: string;
  name: string;
  timezone: string;
  status: AccountStatus;
}
