export interface UserPublic {
  userId: string;
  merchantId: string;
  outletId: string | null;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
