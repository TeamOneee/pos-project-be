import { PrismaService } from "src/prisma/prisma.service";

export class OutletsRepository {
    constructor(private prisma: PrismaService) {}
}