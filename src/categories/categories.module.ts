import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoriesRepository } from './categories.repository';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriesRepository],
  imports: [PrismaModule]
})
export class CategoriesModule {}
