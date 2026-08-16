import { UserRole } from '@app/platform';

export class StaffDto {
  user_id: string;
  merchant_id: string;
  outlet_id: string | null;
  name: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Date;
  updated_at: Date;
}
