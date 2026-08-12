import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const dbUrl = new URL(process.env.DATABASE_URL!);
    dbUrl.searchParams.set('connection_limit', process.env.CONNECTION_LIMIT ?? '10');
    super({
      log: ['error', 'warn'],
      datasources: { db: { url: dbUrl.toString() } },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
