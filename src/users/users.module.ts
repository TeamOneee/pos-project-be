import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { USER_PORT } from './ports/user.port';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
    { provide: USER_PORT, useExisting: UsersService },
  ],
  imports: [PrismaModule],
  exports: [USER_PORT],
})
export class UsersModule {}
