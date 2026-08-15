import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEventEnvelope } from '@app/platform';
import {
  parseTransactionCompletedEvent,
  TRANSACTION_COMPLETED_EVENT,
} from '../application/events/transaction-completed.event';
import { ProjectionUpdateService } from '../application/projection-update.service';

@Injectable()
// menerima event outbox sales dan meneruskannya ke projection update service.
export class TransactionCompletedHandler {
  constructor(private readonly projectionUpdate: ProjectionUpdateService) {}

  @OnEvent(TRANSACTION_COMPLETED_EVENT, { suppressErrors: false })
  async handle(envelope: DomainEventEnvelope): Promise<void> {
    // error dibiarkan naik agar OutboxRelayService menjalankan retry dengan backoff.
    // handler hanya memahami schema v1 dan membiarkan relay menangani retry error.
    const event = parseTransactionCompletedEvent(envelope.payload);
    await this.projectionUpdate.applyEvent(event);
  }
}
