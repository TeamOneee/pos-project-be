import { PrismaService } from "src/prisma/prisma.service";

export class DashboardRepository {
    constructor(private prisma: PrismaService) {}
}