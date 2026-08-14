import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlatformModule } from '@app/platform';
import { ReportingModule } from '@app/reporting';
import { InsightModule } from '@app/insight';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PlatformModule,
    ReportingModule,
    InsightModule,
  ],
})
export class WorkerModule {}
