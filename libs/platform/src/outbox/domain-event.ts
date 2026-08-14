export interface DomainEventEnvelope<T = Record<string, unknown>> {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: T;
  occurredAt: Date;
}
