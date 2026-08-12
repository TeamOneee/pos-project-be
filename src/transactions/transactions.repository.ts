import { PrismaService } from "src/prisma/prisma.service";

export class TransactionsRepository {
    constructor(private prisma: PrismaService) {}
}