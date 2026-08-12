import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Base repository untuk semua repository di aplikasi.
 * Menyediakan helper method untuk transaction fallback pattern.
 * Semua repository dapat extends class ini untuk mendapatkan akses ke
 * getPrismaClient() yang secara otomatis menangani transaction context.
 */
@Injectable()
export abstract class BaseRepository {
  constructor(protected prisma: PrismaService) {}

  /**
   * Mendapatkan Prisma client yang tepat berdasarkan context.
   * Jika ada transaction (tx), gunakan tx. Jika tidak, gunakan this.prisma.
   * @param tx - Transaction client (opsional)
   * @returns PrismaClient yang sesuai
   */
  protected getPrismaClient(tx?: Prisma.TransactionClient): PrismaService {
    return (tx as PrismaService) ?? this.prisma;
  }
}
