import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from './analytics.repository';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsRepository],
  imports: [PrismaModule]
})
export class AnalyticsModule {}
