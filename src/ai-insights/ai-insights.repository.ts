import { PrismaService } from "src/prisma/prisma.service";

export class AiInsightsRepository {
    constructor(private prisma: PrismaService) {}
}