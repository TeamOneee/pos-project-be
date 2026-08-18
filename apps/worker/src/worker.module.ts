import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { PlatformModule } from '@app/platform';
import { InsightWorkerModule } from '@app/insight';

// deployable tanpa http server yang hanya menjalankan consumer job background.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot(),
    ScheduleModule.forRoot(),
    PlatformModule,
    InsightWorkerModule,
  ],
})
export class WorkerModule {}
