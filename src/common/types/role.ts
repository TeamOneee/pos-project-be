export const UserRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  CASHIER: 'CASHIER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
