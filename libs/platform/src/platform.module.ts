import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { ClsModule } from 'nestjs-cls';
import { ReportingCacheService } from './cache/reporting-cache.service';
import { AllExceptionsFilter } from './error/all-exceptions.filter';
import { PrismaReadService } from './prisma/prisma-read.service';
import { PrismaWriteService } from './prisma/prisma-write.service';
import { CorrelationIdMiddleware } from './security/correlation-id.middleware';
import { JwtAuthGuard } from './security/jwt-auth.guard';
import { JwtStrategy } from './security/jwt.strategy';
import { RolesGuard } from './security/roles.guard';
import { HealthController } from './web/health.controller';
import { SuccessResponseInterceptor } from './web/success-response.interceptor';

// Shared kernel (primitif infrastruktur): error, security, money, cache, prisma.
// Implementasi diisi bertahap — lihat 06-iterasi-1-module-library.md §3.0.
@Module({
  imports: [
    ClsModule.forRoot({ global: true }),
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
    ReportingCacheService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: SuccessResponseInterceptor },
  ],
  exports: [
    PrismaWriteService,
    PrismaReadService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    ReportingCacheService,
  ],
})
export class PlatformModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
