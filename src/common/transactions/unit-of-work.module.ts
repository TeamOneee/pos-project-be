import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UnitOfWork } from './unit-of-work';

@Module({
  imports: [PrismaModule],
  providers: [UnitOfWork],
  exports: [UnitOfWork],
})
export class UnitOfWorkModule {}
