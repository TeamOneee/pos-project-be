import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartRepository } from './cart.repository';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [CartController],
  providers: [CartService, CartRepository],
  imports: [PrismaModule],
})
export class CartModule {}
