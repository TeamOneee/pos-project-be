import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { ClsModule } from 'nestjs-cls';
import { AllExceptionsFilter } from './error/all-exceptions.filter';
import { JobRecordService } from './job/job-record.service';
import { OutboxService } from './outbox/outbox.service';
import { PrismaReadService } from './prisma/prisma-read.service';
import { PrismaWriteService } from './prisma/prisma-write.service';
import { CorrelationIdMiddleware } from './security/correlation-id.middleware';
import { JwtAuthGuard } from './security/jwt-auth.guard';
import { JwtStrategy } from './security/jwt.strategy';
import { RolesGuard } from './security/roles.guard';
import { HealthController } from './web/health.controller';

// Shared kernel (primitif infrastruktur): error, security, money, outbox, job, prisma.
// Implementasi diisi bertahap — lihat 06-iterasi-1-module-library.md §3.0.
// OutboxRelayService sengaja TIDAK di sini — diprovide oleh PlatformWorkerModule (proses worker saja).
@Module({
  imports: [
    ClsModule.forRoot({ global: true }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrometheusModule.register({ path: '/metrics' }),
  ],
  controllers: [HealthController],
  providers: [
    PrismaWriteService,
    PrismaReadService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    OutboxService,
    JobRecordService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
  exports: [
    PrismaWriteService,
    PrismaReadService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    OutboxService,
    JobRecordService,
  ],
})
export class PlatformModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
