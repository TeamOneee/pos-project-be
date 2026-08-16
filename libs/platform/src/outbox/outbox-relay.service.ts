import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { OutboxEvent } from '@prisma/client';
import { PrismaWriteService } from '../prisma/prisma-write.service';
import { DomainEventEnvelope } from './domain-event';
import {
  OUTBOX_BACKOFF_MS,
  OUTBOX_BATCH_SIZE,
  OUTBOX_MAX_ATTEMPTS,
  OUTBOX_STATUS_FAILED,
  OUTBOX_STATUS_PENDING,
  OUTBOX_STATUS_PROCESSED,
  OUTBOX_STATUS_PROCESSING,
} from './outbox.constants';

@Injectable()
export class OutboxRelayService {
  private readonly logger = new Logger(OutboxRelayService.name);
  private processing = false;

  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('*/5 * * * * *', { name: 'outbox-relay' })
  async relay(): Promise<void> {
    if (this.processing) {
      return;
    }
    this.processing = true;
    try {
      await this.dispatchBatch();
    } catch (error) {
      this.logger.error('Outbox relay gagal.', error);
    } finally {
      this.processing = false;
    }
  }

  private async dispatchBatch(): Promise<void> {
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        status: OUTBOX_STATUS_PENDING,
        nextAttemptAt: { lte: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      take: OUTBOX_BATCH_SIZE,
    });
    for (const event of events) {
      await this.dispatchOne(event);
    }
  }

  private async dispatchOne(event: OutboxEvent): Promise<void> {
    const claimed = await this.prisma.outboxEvent.updateMany({
      where: { id: event.id, status: OUTBOX_STATUS_PENDING },
      data: { status: OUTBOX_STATUS_PROCESSING },
    });
    if (claimed.count === 0) {
      return;
    }

    try {
      const envelope: DomainEventEnvelope = {
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload as Record<string, unknown>,
        occurredAt: event.createdAt,
      };
      await this.eventEmitter.emitAsync(event.eventType, envelope);
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: OUTBOX_STATUS_PROCESSED },
      });
    } catch (error) {
      await this.markRetry(event, error);
    }
  }

  private async markRetry(event: OutboxEvent, error: unknown): Promise<void> {
    const attempts = event.attempts + 1;
    if (attempts >= OUTBOX_MAX_ATTEMPTS) {
      this.logger.error(`Outbox event ${event.id} gagal permanen.`, error);
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: OUTBOX_STATUS_FAILED, attempts },
      });
      return;
    }
    const delay =
      OUTBOX_BACKOFF_MS[Math.min(attempts, OUTBOX_BACKOFF_MS.length - 1)];
    await this.prisma.outboxEvent.update({
      where: { id: event.id },
      data: {
        status: OUTBOX_STATUS_PENDING,
        attempts,
        nextAttemptAt: new Date(Date.now() + delay),
      },
    });
  }
}
