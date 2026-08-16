import { Injectable } from '@nestjs/common';
import { AccountStatus, Prisma, User, UserRole } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';

export interface CreateUserData {
  merchantId: string;
  outletId: string | null;
  emailNormalized: string;
  emailOriginal: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  status: AccountStatus;
}

export interface StaffListFilter {
  role?: UserRole;
  status?: AccountStatus;
}

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaWriteService) {}

  findByEmail(emailNormalized: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { emailNormalized },
    });
  }

  findById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  findStaffById(userId: string, merchantId: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { id: userId, merchantId, role: { in: ['ADMIN', 'CASHIER'] } },
    });
  }

  findStaff(
    merchantId: string,
    filter: StaffListFilter,
    skip: number,
    take: number,
  ): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { merchantId, role: filter.role, status: filter.status },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  countStaff(merchantId: string, filter: StaffListFilter): Promise<number> {
    return this.prisma.user.count({
      where: { merchantId, role: filter.role, status: filter.status },
    });
  }

  updateStaff(
    userId: string,
    data: Prisma.UserUncheckedUpdateInput,
  ): Promise<User> {
    return this.prisma.user.update({ where: { id: userId }, data });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }
}
