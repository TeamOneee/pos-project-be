import { Injectable } from '@nestjs/common';
import { AccountStatus, Prisma, User, UserRole } from '@prisma/client';
import { PrismaReadService, PrismaWriteService } from '@app/platform';

export interface CreateUserData {
  merchantId: string;
  outletId: string | null;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: AccountStatus;
}

export interface StaffListFilter {
  role?: UserRole;
  status?: AccountStatus;
}

@Injectable()
export class UserRepository {
  constructor(
    private readonly readPrisma: PrismaReadService,
    private readonly writePrisma: PrismaWriteService,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.readPrisma.user.findUnique({
      where: { email },
    });
  }

  findById(userId: string): Promise<User | null> {
    return this.readPrisma.user.findUnique({ where: { id: userId } });
  }

  findByIdInMerchant(userId: string, merchantId: string): Promise<User | null> {
    return this.readPrisma.user.findFirst({
      where: { id: userId, merchantId },
    });
  }

  findStaffById(userId: string, merchantId: string): Promise<User | null> {
    return this.readPrisma.user.findFirst({
      where: { id: userId, merchantId, role: { in: ['ADMIN', 'CASHIER'] } },
    });
  }

  findStaff(
    merchantId: string,
    filter: StaffListFilter,
    skip: number,
    take: number,
  ): Promise<User[]> {
    return this.readPrisma.user.findMany({
      where: { merchantId, role: filter.role, status: filter.status },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  countStaff(merchantId: string, filter: StaffListFilter): Promise<number> {
    return this.readPrisma.user.count({
      where: { merchantId, role: filter.role, status: filter.status },
    });
  }

  updateStaff(
    userId: string,
    data: Prisma.UserUncheckedUpdateInput,
  ): Promise<User> {
    return this.writePrisma.user.update({ where: { id: userId }, data });
  }

  create(data: CreateUserData): Promise<User> {
    return this.writePrisma.user.create({ data });
  }
}
