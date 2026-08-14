import { AccountStatus } from '@prisma/client';

export class MerchantDto {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  status: AccountStatus;
  created_at: Date;
  updated_at: Date;
}
