import { parseTransactionCompletedEvent } from './transaction-completed.event';

const payload = (): Record<string, unknown> => ({
  schemaVersion: 1,
  transactionId: 'transaction-1',
  merchantId: 'merchant-1',
  outletId: 'outlet-1',
  status: 'COMPLETED',
  occurredAt: '2026-08-15T03:15:00.000Z',
  merchantTimezone: 'Asia/Jakarta',
  total: '20000.00',
  lines: [
    {
      productId: 'product-1',
      productNameSnapshot: 'Nasi Goreng',
      quantity: 1,
      subtotal: '20000.00',
    },
  ],
});

// memverifikasi boundary event sebelum data masuk ke projection fr-rep-001.
describe('parseTransactionCompletedEvent', () => {
  it('menerima payload v1 completed dan mengubah occurredAt menjadi date', () => {
    const result = parseTransactionCompletedEvent(payload());
    expect(result.schemaVersion).toBe(1);
    expect(result.occurredAt).toEqual(new Date('2026-08-15T03:15:00.000Z'));
  });

  it('menolak versi, status, timezone, atau quantity yang tidak valid', () => {
    expect(() =>
      parseTransactionCompletedEvent({ ...payload(), schemaVersion: 2 }),
    ).toThrow('Payload TransactionCompletedEvent tidak valid.');
    expect(() =>
      parseTransactionCompletedEvent({ ...payload(), status: 'PENDING' }),
    ).toThrow('Payload TransactionCompletedEvent tidak valid.');
    expect(() =>
      parseTransactionCompletedEvent({
        ...payload(),
        merchantTimezone: 'Invalid/Timezone',
      }),
    ).toThrow('merchantTimezone');
    expect(() =>
      parseTransactionCompletedEvent({
        ...payload(),
        lines: [
          {
            productId: 'product-1',
            productNameSnapshot: 'Produk',
            quantity: 0,
            subtotal: '0.00',
          },
        ],
      }),
    ).toThrow('quantity');
  });
});
