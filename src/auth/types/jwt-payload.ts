export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  merchantId: string;
  outletId?: string;
}
