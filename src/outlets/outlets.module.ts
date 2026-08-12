import { Module } from '@nestjs/common';
import { OutletsController } from './outlets.controller';
import { OutletsService } from './outlets.service';
import { OutletsRepository } from './outlets.repository';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [OutletsController],
  providers: [OutletsService, OutletsRepository],
  imports: [PrismaModule]
})
export class OutletsModule {}
