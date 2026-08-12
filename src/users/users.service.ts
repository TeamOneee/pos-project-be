import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UserPort } from './ports/user.port';

@Injectable()
export class UsersService implements UserPort {
  constructor(private repo: UsersRepository) {}

  async findByEmail(email: string, tx?: Prisma.TransactionClient) {
    return this.repo.findUserByEmail(email, tx);
  }

  async findById(userId: string, tx?: Prisma.TransactionClient) {
    return this.repo.findUserById(userId, tx);
  }

  async createUser(dto: CreateUserDto, tx?: Prisma.TransactionClient) {
    return this.repo.createUser(dto, tx);
  }

  async ensureEmailAvailable(email: string) {
    const user = await this.repo.findUserByEmail(email);
    if (user) {
      throw new ConflictException('Email already registered');
    }
  }
}
