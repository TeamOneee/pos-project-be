// memverifikasi query fact data penjualan lengkap pada SalesReportingRepository (FR-024).
import { Prisma } from '@prisma/client';
import { PrismaReadService } from '@app/platform';
import { SalesReportingQuery } from '../application/ports/sales-reporting-read.port';
import { SalesReportingRepository } from './sales-reporting.repository';

function makeMockPrismaRead() {
  return { transaction: { findMany: jest.fn() } } as unknown as PrismaReadService;
}

function makeQuery(overrides?: Partial<SalesReportingQuery>): SalesReportingQuery {
  return {
    merchantId: 'mch-001',
    dateFrom: new Date('2026-08-01T00:00:00Z'),
    dateTo: new Date('2026-08-31T23:59:59Z'),
    timezone: 'Asia/Jakarta',
    ...overrides,
  };
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
      const mockResult = [
        {
          id: 'txn-001',
          outletId: 'out-001',
          paidAt: new Date('2026-08-10T14:30:00Z'),
          createdAt: new Date('2026-08-10T14:25:00Z'),
          total: new Prisma.Decimal('50000'),
          items: [
            { productId: 'prod-001', productNameSnapshot: 'Kopi Susu', quantity: 2, subtotal: new Prisma.Decimal('50000') },
          ],
        },
      ];
      (mockPrismaRead.transaction.findMany as jest.Mock).mockResolvedValue(mockResult);

      const result = await repo.findCompletedTransactionFacts(makeQuery());

      expect(result).toEqual([
        {
          transactionId: 'txn-001',
          outletId: 'out-001',
          occurredAt: new Date('2026-08-10T14:30:00Z'),
          total: '50000.00',
          items: [
            { productId: 'prod-001', productNameSnapshot: 'Kopi Susu', quantity: 2, subtotal: '50000.00' },
          ],
        },
      ]);
    });

    it('menggunakan createdAt sebagai occurredAt jika paidAt null', async () => {
      const createdAt = new Date('2026-08-10T14:25:00Z');
      const mockResult = [
        {
          id: 'txn-002',
          outletId: 'out-001',
          paidAt: null,
          createdAt,
          total: new Prisma.Decimal('25000'),
          items: [],
        },
      ];
      (mockPrismaRead.transaction.findMany as jest.Mock).mockResolvedValue(mockResult);

      const result = await repo.findCompletedTransactionFacts(makeQuery());

      expect(result[0].occurredAt).toEqual(createdAt);
    });

    it('menerapkan filter outletId jika disediakan', async () => {
      (mockPrismaRead.transaction.findMany as jest.Mock).mockResolvedValue([]);

      await repo.findCompletedTransactionFacts(makeQuery({ outletId: 'out-002' }));

      expect(mockPrismaRead.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ outletId: 'out-002' }),
        }),
      );
    });

    it('tidak menerapkan filter outletId jika undefined', async () => {
      (mockPrismaRead.transaction.findMany as jest.Mock).mockResolvedValue([]);

      await repo.findCompletedTransactionFacts(makeQuery({ outletId: undefined }));

      expect(mockPrismaRead.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ outletId: expect.anything() }),
        }),
      );
    });

    it('hanya mengambil transaksi dengan status COMPLETED', async () => {
      (mockPrismaRead.transaction.findMany as jest.Mock).mockResolvedValue([]);

      await repo.findCompletedTransactionFacts(makeQuery());

      expect(mockPrismaRead.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });

    it('menerapkan filter dateFrom dan dateTo pada paidAt', async () => {
      (mockPrismaRead.transaction.findMany as jest.Mock).mockResolvedValue([]);
      const dateFrom = new Date('2026-08-01T00:00:00Z');
      const dateTo = new Date('2026-08-31T23:59:59Z');

      await repo.findCompletedTransactionFacts(makeQuery({ dateFrom, dateTo }));

      expect(mockPrismaRead.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            paidAt: { gte: dateFrom, lte: dateTo },
          }),
        }),
      );
    });

    it('mengembalikan array kosong jika tidak ada data', async () => {
      (mockPrismaRead.transaction.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repo.findCompletedTransactionFacts(makeQuery());

      expect(result).toEqual([]);
    });
  });
});
