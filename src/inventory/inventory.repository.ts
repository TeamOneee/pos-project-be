import { BaseRepository } from "src/common/repositories/base.repository";
import { PrismaService } from "src/prisma/prisma.service";

export class InventoryRepository extends BaseRepository {
    constructor(prisma: PrismaService) {
        super(prisma)
    }
}