import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository],
  imports: [PrismaModule]
})
export class InventoryModule {}
