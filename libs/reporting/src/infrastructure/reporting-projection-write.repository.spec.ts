import { Prisma } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';
import { TransactionCompletedEventV1 } from '../application/events/transaction-completed.event';
import { ReportingProjectionWriteRepository } from './reporting-projection-write.repository';

const event: TransactionCompletedEventV1 = {
  schemaVersion: 1,
  transactionId: 'transaction-1',
  merchantId: 'merchant-1',
  outletId: 'outlet-1',
  status: 'COMPLETED',
  occurredAt: new Date('2026-08-15T03:15:00.000Z'),
  merchantTimezone: 'Asia/Jakarta',
  total: '10000.00',
  lines: [],
};

// memverifikasi receipt dan seluruh upsert berada dalam satu transaksi prisma.
describe('ReportingProjectionWriteRepository', () => {
  const receipt = { create: jest.fn() };
  const transaction = {
    reportingEventReceipt: receipt,
    $executeRaw: jest.fn(),
  };
  const prisma = { $transaction: jest.fn() };
  const repository = new ReportingProjectionWriteRepository(
    prisma as unknown as PrismaWriteService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    receipt.create.mockResolvedValue({});
    transaction.$executeRaw.mockResolvedValue(1);
    prisma.$transaction.mockImplementation(
      async (callback: (value: typeof transaction) => Promise<void>) =>
        callback(transaction),
    );
  });

  it('FR-REP-008: menulis receipt sebelum projection hour dan day', async () => {
    const applied = await repository.apply(
      event,
      [
        {
          bucket: 'HOUR',
          periodStart: new Date('2026-08-15T03:00:00.000Z'),
          periodEnd: new Date('2026-08-15T04:00:00.000Z'),
        },
        {
          bucket: 'DAY',
          periodStart: new Date('2026-08-14T17:00:00.000Z'),
          periodEnd: new Date('2026-08-15T17:00:00.000Z'),
        },
      ],
      [
        {
          productId: 'product-1',
          productNameSnapshot: 'Produk',
          quantity: BigInt(1),
          omzet: '10000.00',
        },
      ],
      BigInt(1),
    );
    expect(applied).toBe(true);
    expect(receipt.create).toHaveBeenCalledWith({
      data: {
        transactionId: 'transaction-1',
        merchantId: 'merchant-1',
      },
    });
    expect(transaction.$executeRaw).toHaveBeenCalledTimes(4);
  });

  it('FR-REP-008: duplicate receipt menjadi no-op yang sukses', async () => {
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.4.0',
      }),
    );
    await expect(repository.apply(event, [], [], BigInt(0))).resolves.toBe(
      false,
    );
  });
});
