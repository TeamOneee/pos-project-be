import { PrismaService } from "src/prisma/prisma.service";

export class CategoriesRepository {
    constructor(private prisma: PrismaService) {}
}