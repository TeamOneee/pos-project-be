// memverifikasi query fact data penjualan lengkap pada SalesReportingRepository (FR-024).
import { PrismaReadService } from '@app/platform';
import { SalesReportingQuery } from '../application/ports/sales-reporting-read.port';
import { SalesReportingRepository } from './sales-reporting.repository';

function makeMockPrismaRead() {
  return {
    $queryRaw: jest.fn(),
  } as unknown as PrismaReadService;
}

function makeQuery(
  overrides?: Partial<SalesReportingQuery>,
): SalesReportingQuery {
  return {
    merchantId: 'mch-001',
    dateFrom: new Date('2026-08-01T00:00:00Z'),
    dateTo: new Date('2026-08-31T23:59:59Z'),
    timezone: 'Asia/Jakarta',
    ...overrides,
  };
}

function capturedValues(mockPrismaRead: ReturnType<typeof makeMockPrismaRead>) {
  const mock = mockPrismaRead.$queryRaw as unknown as jest.Mock<
    unknown[],
    unknown[]
  >;
  return mock.mock.calls[0].slice(1);
}

function capturedSqlValues(
  mockPrismaRead: ReturnType<typeof makeMockPrismaRead>,
): unknown[] {
  return capturedValues(mockPrismaRead).flatMap((value) =>
    value &&
    typeof value === 'object' &&
    Array.isArray((value as { values?: unknown[] }).values)
      ? (value as { values: unknown[] }).values
      : [],
  );
}

describe('SalesReportingRepository', () => {
  let repo: SalesReportingRepository;
  let mockPrismaRead: ReturnType<typeof makeMockPrismaRead>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaRead = makeMockPrismaRead();
    repo = new SalesReportingRepository(mockPrismaRead);
  });

  describe('findCompletedTransactionFacts', () => {
    it('mengembalikan completed transaction facts dengan shape yang benar', async () => {
      const mockRows = [
        {
          transactionId: 'txn-001',
          outletId: 'out-001',
          occurredAt: new Date('2026-08-10T14:30:00Z'),
          total: '50000.00',
          productId: 'prod-001',
          productNameSnapshot: 'Kopi Susu',
          quantity: 2,
          subtotal: '30000.00',
        },
        {
          transactionId: 'txn-001',
          outletId: 'out-001',
          occurredAt: new Date('2026-08-10T14:30:00Z'),
          total: '50000.00',
          productId: 'prod-002',
          productNameSnapshot: 'Nasi Goreng',
          quantity: 1,
          subtotal: '20000.00',
        },
      ];
      (mockPrismaRead.$queryRaw as jest.Mock).mockResolvedValue(mockRows);

      const result = await repo.findCompletedTransactionFacts(makeQuery());

      expect(result).toEqual([
        {
          transactionId: 'txn-001',
          outletId: 'out-001',
          occurredAt: new Date('2026-08-10T14:30:00Z'),
          total: '50000.00',
          items: [
            {
              productId: 'prod-001',
              productNameSnapshot: 'Kopi Susu',
              quantity: 2,
              subtotal: '30000.00',
            },
            {
              productId: 'prod-002',
              productNameSnapshot: 'Nasi Goreng',
              quantity: 1,
              subtotal: '20000.00',
            },
          ],
        },
      ]);
    });

    it('mempertahankan occurredAt dari baris query (COALESCE paid_at/created_at)', async () => {
      const occurredAt = new Date('2026-08-10T14:25:00Z');
      (mockPrismaRead.$queryRaw as jest.Mock).mockResolvedValue([
        {
          transactionId: 'txn-002',
          outletId: 'out-001',
          occurredAt,
          total: '25000.00',
          productId: 'prod-001',
          productNameSnapshot: 'Kopi Susu',
          quantity: 1,
          subtotal: '25000.00',
        },
      ]);

      const result = await repo.findCompletedTransactionFacts(makeQuery());

      expect(result[0].occurredAt).toEqual(occurredAt);
    });

    it('menerapkan filter outletId jika disediakan', async () => {
      (mockPrismaRead.$queryRaw as jest.Mock).mockResolvedValue([]);

      await repo.findCompletedTransactionFacts(
        makeQuery({ outletId: 'out-002' }),
      );

      expect(capturedSqlValues(mockPrismaRead)).toContain('out-002');
    });

    it('tidak menerapkan filter outletId jika undefined', async () => {
      (mockPrismaRead.$queryRaw as jest.Mock).mockResolvedValue([]);

      await repo.findCompletedTransactionFacts(
        makeQuery({ outletId: undefined }),
      );

      expect(capturedSqlValues(mockPrismaRead)).not.toContain('out-002');
    });

    it('mengirim merchantId, status, dan rentang paidAt ke query', async () => {
      (mockPrismaRead.$queryRaw as jest.Mock).mockResolvedValue([]);

      await repo.findCompletedTransactionFacts(makeQuery());

      const values = capturedValues(mockPrismaRead);
      expect(values).toContain('mch-001');
      expect(
        values.some(
          (value) =>
            value instanceof Date &&
            value.getTime() === new Date('2026-08-01T00:00:00Z').getTime(),
        ),
      ).toBe(true);
      expect(
        values.some(
          (value) =>
            value instanceof Date &&
            value.getTime() === new Date('2026-08-31T23:59:59Z').getTime(),
        ),
      ).toBe(true);
    });

    it('mengembalikan array kosong jika tidak ada data', async () => {
      (mockPrismaRead.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await repo.findCompletedTransactionFacts(makeQuery());

      expect(result).toEqual([]);
    });
  });
});
