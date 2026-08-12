import { Prisma } from '@prisma/client';
import { BaseRepository } from 'src/common/repositories/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

export class UsersRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findUserByEmail(email: string, tx?: Prisma.TransactionClient) {
    return this.getPrismaClient(tx).user.findUnique({
      where: { email },
    });
  }

  async findUserById(userId: string, tx?: Prisma.TransactionClient) {
    return this.getPrismaClient(tx).user.findUnique({
      where: { userId },
    });
  }

  async createUser(dto: CreateUserDto, tx?: Prisma.TransactionClient) {
    return this.getPrismaClient(tx).user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: dto.password,
        merchantId: dto.merchantId,
        role: dto.role,
        outletId: dto.outletId ?? null,
        status: dto.status ?? 'ACTIVE',
      },
    });
  }
}
