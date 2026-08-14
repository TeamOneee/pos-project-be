import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxRelayService } from './outbox/outbox-relay.service';
import { PlatformModule } from './platform.module';

// Modul khusus proses worker: menjalankan polling outbox relay (cron).
// Tidak di-import oleh apps/api agar relai tidak berjalan di proses HTTP (05 §6.2).
@Module({
  imports: [ScheduleModule.forRoot(), PlatformModule],
  providers: [OutboxRelayService],
  exports: [OutboxRelayService],
})
export class PlatformWorkerModule {}
