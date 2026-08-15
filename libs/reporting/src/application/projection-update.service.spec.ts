import { TransactionCompletedEventV1 } from './events/transaction-completed.event';
import { ProjectionUpdateService } from './projection-update.service';
import { ReportingProjectionWriteRepository } from '../infrastructure/reporting-projection-write.repository';

const event = (): TransactionCompletedEventV1 => ({
  schemaVersion: 1,
  transactionId: 'transaction-1',
  merchantId: 'merchant-1',
  outletId: 'outlet-1',
  status: 'COMPLETED',
  occurredAt: new Date('2026-08-15T03:15:00.000Z'),
  merchantTimezone: 'Asia/Jakarta',
  total: '25000.00',
  lines: [
    {
      productId: 'product-1',
      productNameSnapshot: 'Produk A',
      quantity: 1,
      subtotal: '10000.00',
    },
    {
      productId: 'product-1',
      productNameSnapshot: 'Produk A',
      quantity: 2,
      subtotal: '15000.00',
    },
  ],
});

// memverifikasi transform event sebelum repository melakukan transaksi database.
describe('ProjectionUpdateService', () => {
  const repository = { apply: jest.fn() };
  let service: ProjectionUpdateService;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.apply.mockResolvedValue(true);
    service = new ProjectionUpdateService(
      repository as unknown as ReportingProjectionWriteRepository,
    );
  });

  it('FR-REP-001/008: membentuk bucket timezone dan menggabungkan product duplikat', async () => {
    await expect(service.applyEvent(event())).resolves.toBe(true);
    expect(repository.apply).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: 'transaction-1' }),
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
          productNameSnapshot: 'Produk A',
          quantity: BigInt(3),
          omzet: '25000.00',
        },
      ],
      BigInt(3),
    );
  });

  it('menolak event ketika total tidak sama dengan jumlah line', async () => {
    const invalid = event();
    invalid.total = '24000.00';
    await expect(service.applyEvent(invalid)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(repository.apply).not.toHaveBeenCalled();
  });
});
