import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Shared transaction orchestrator.
 *
 * UnitOfWork menyediakan mekanisme transaction lintas-module tanpa membuat
 * module pemanggil bergantung langsung pada PrismaService. Orchestrator
 * (misal AuthService) yang memanggil `run()`, lalu menyerahkan transaction
 * client ke service/repository milik module lain lewat parameter `tx`.
 */
@Injectable()
export class UnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async run<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
