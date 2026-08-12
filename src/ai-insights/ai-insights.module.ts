import { Module } from '@nestjs/common';
import { AiInsightsController } from './ai-insights.controller';
import { AiInsightsService } from './ai-insights.service';
import { AiInsightsRepository } from './ai-insights.repository';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [AiInsightsController],
  providers: [AiInsightsService, AiInsightsRepository],
  imports: [PrismaModule]
})
export class AiInsightsModule {}
