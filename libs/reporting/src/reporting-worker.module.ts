import { Module } from '@nestjs/common';
import { PlatformModule } from '@app/platform';
import { ProjectionUpdateService } from './application/projection-update.service';
import { ReportingProjectionWriteRepository } from './infrastructure/reporting-projection-write.repository';
import { TransactionCompletedHandler } from './worker/transaction-completed.handler';

/*
 * memisahkan consumer projection dari api agar worker dapat di-scale sendiri.
 *
 * todo(platform): sebelum replica worker dinaikkan agresif, OutboxRelayService
 * perlu lease untuk status PROCESSING dan atomic batch claim atau skip locked.
 * receipt Transaction di Reporting tetap menjaga idempotency fr-rep-008.
 */
@Module({
  imports: [PlatformModule],
  providers: [
    ProjectionUpdateService,
    ReportingProjectionWriteRepository,
    TransactionCompletedHandler,
  ],
})
export class ReportingWorkerModule {}
