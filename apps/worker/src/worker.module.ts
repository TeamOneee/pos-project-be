import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { PlatformModule, PlatformWorkerModule } from '@app/platform';
import { ReportingWorkerModule } from '@app/reporting';
import { InsightModule } from '@app/insight';

// menyatukan consumer outbox dan job background tanpa menjalankan http server.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot(),
    PlatformModule,
    PlatformWorkerModule,
    ReportingWorkerModule,
    InsightModule,
  ],
})
export class WorkerModule {}
