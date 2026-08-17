import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { PlatformModule } from '@app/platform';
import { ReportingModule } from '@app/reporting';
import { InsightModule } from '@app/insight';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot(),
    ScheduleModule.forRoot(),
    PlatformModule,
    ReportingModule,
    InsightModule,
  ],
})
export class WorkerModule {}
