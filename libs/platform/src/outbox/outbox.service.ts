import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

export interface OutboxPublishMeta {
  aggregateType?: string;
  aggregateId?: string;
}

export type OutboxTransaction = Prisma.TransactionClient;

@Injectable()
export class OutboxService {
  async publish(
    tx: OutboxTransaction,
    eventType: string,
    payload: unknown,
    meta?: OutboxPublishMeta,
  ): Promise<void> {
    await tx.outboxEvent.create({
      data: {
        aggregateType: meta?.aggregateType ?? 'DOMAIN',
        aggregateId: meta?.aggregateId ?? randomUUID(),
        eventType,
        payload: payload as Prisma.InputJsonValue,
        status: 'PENDING',
      },
    });
  }
}
