import { PrismaService } from 'src/prisma/prisma.service';

export class ProductsRepository {
  constructor(private prisma: PrismaService) {}
}
