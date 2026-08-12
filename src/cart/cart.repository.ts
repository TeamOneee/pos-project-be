import { BaseRepository } from 'src/common/repositories/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

export class CartRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
}
