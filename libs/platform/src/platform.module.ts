import { Module } from '@nestjs/common';

// Shared kernel (primitif infrastruktur): error, security, money, outbox, job, prisma.
// Implementasi diisi bertahap — lihat 06-iterasi-1-module-library.md §3.0.
@Module({})
export class PlatformModule {}
