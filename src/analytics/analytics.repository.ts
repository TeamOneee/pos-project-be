import { PrismaService } from "src/prisma/prisma.service";

export class AnalyticsRepository {
    constructor(private prisma: PrismaService) {}
}