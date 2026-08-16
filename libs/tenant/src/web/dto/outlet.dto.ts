import { AccountStatus } from '@prisma/client';

export class OutletDto {
  id: string;
  merchant_id: string;
  name: string;
  address: string | null;
  status: AccountStatus;
  created_at: Date;
  updated_at: Date;
}
