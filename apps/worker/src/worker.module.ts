import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { PlatformModule, PlatformWorkerModule } from '@app/platform';
import { ReportingModule } from '@app/reporting';
import { InsightModule } from '@app/insight';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot(),
    PlatformModule,
    PlatformWorkerModule,
    ReportingModule,
    InsightModule,
  ],
})
export class WorkerModule {}
