// memverifikasi query dan pembuatan data pada TransactionRepository (OD-012, DR-003).
import { Prisma, TransactionStatus, PaymentMethod } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';
import {
  TransactionRepository,
  CreateTransactionData,
} from './transaction.repository';

function makeMockPrisma() {
  return {
    transaction: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
  } as unknown as PrismaWriteService;
}

function makeMockTx() {
  return {
    transaction: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
  } as {
    transaction: { findUnique: jest.Mock; create: jest.Mock };
    $queryRaw: jest.Mock;
  };
}

function makeTransactionData(
  overrides?: Partial<CreateTransactionData>,
): CreateTransactionData {
  return {
    id: 'txn-001',
    merchantId: 'mch-001',
    outletId: 'out-001',
    operatorUserId: 'user-001',
    transactionNumber: 'INV-2026-000001',
    checkoutRequestId: 'chk-001',
    requestHash: 'hash-abc',
    status: TransactionStatus.COMPLETED,
    paymentMethod: PaymentMethod.CASH,
    paymentStatus: 'PAID',
    paidAt: new Date('2026-08-17T10:00:00Z'),
    subtotal: new Prisma.Decimal('95000'),
    total: new Prisma.Decimal('95000'),
    items: [
      {
        productId: 'prod-001',
        productNameSnapshot: 'Kopi Susu',
        unitPriceSnapshot: new Prisma.Decimal('25000'),
        quantity: 2,
        subtotal: new Prisma.Decimal('50000'),
      },
      {
        productId: 'prod-002',
        productNameSnapshot: 'Roti Bakar',
        unitPriceSnapshot: new Prisma.Decimal('15000'),
        quantity: 3,
        subtotal: new Prisma.Decimal('45000'),
      },
    ],
    ...overrides,
  };
}

describe('TransactionRepository', () => {
  let repo: TransactionRepository;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = makeMockPrisma();
    repo = new TransactionRepository(mockPrisma);
  });

  describe('findByCheckoutRequest', () => {
    it('mengembalikan id dan requestHash jika transaksi ditemukan', async () => {
      const mockTx = makeMockTx();
      mockTx.transaction.findUnique.mockResolvedValue({
        id: 'txn-001',
        requestHash: 'hash-abc',
      });

      const result = await repo.findByCheckoutRequest(
        mockTx as never,
        'mch-001',
        'chk-001',
      );

      expect(mockTx.transaction.findUnique).toHaveBeenCalledWith({
        where: {
          merchantId_checkoutRequestId: {
            merchantId: 'mch-001',
            checkoutRequestId: 'chk-001',
          },
        },
        select: { id: true, requestHash: true },
      });
      expect(result).toEqual({ id: 'txn-001', requestHash: 'hash-abc' });
    });

    it('mengembalikan null jika transaksi tidak ditemukan', async () => {
      const mockTx = makeMockTx();
      mockTx.transaction.findUnique.mockResolvedValue(null);

      const result = await repo.findByCheckoutRequest(
        mockTx as never,
        'mch-001',
        'chk-999',
      );

      expect(result).toBeNull();
    });
  });

  describe('nextTransactionNumber', () => {
    it('menghasilkan nomor transaksi format INV-{year}-{6-digit} (DR-003/BR-018)', async () => {
      const mockTx = makeMockTx();
      mockTx.$queryRaw.mockResolvedValue([{ seq: 42n }]);

      const result = await repo.nextTransactionNumber(mockTx as never);

      const year = new Date().getFullYear();
      expect(result).toBe(`INV-${year}-000042`);
      expect(mockTx.$queryRaw).toHaveBeenCalled();
    });

    it('memformat angka sequence dengan padStart 6 digit', async () => {
      const mockTx = makeMockTx();
      mockTx.$queryRaw.mockResolvedValue([{ seq: 1n }]);

      const result = await repo.nextTransactionNumber(mockTx as never);
      const year = new Date().getFullYear();
      expect(result).toBe(`INV-${year}-000001`);
    });
  });

  describe('createTransaction', () => {
    it('membuat transaksi beserta items (OD-012)', async () => {
      const mockTx = makeMockTx();
      const data = makeTransactionData();
      const created = { id: 'txn-001', transactionNumber: 'INV-2026-000001' };
      mockTx.transaction.create.mockResolvedValue(created);

      const result = await repo.createTransaction(mockTx as never, data);

      expect(mockTx.transaction.create).toHaveBeenCalledWith({
        data: {
          id: data.id,
          merchantId: data.merchantId,
          outletId: data.outletId,
          operatorUserId: data.operatorUserId,
          transactionNumber: data.transactionNumber,
          checkoutRequestId: data.checkoutRequestId,
          requestHash: data.requestHash,
          status: data.status,
          paymentMethod: data.paymentMethod,
          paymentStatus: data.paymentStatus,
          paidAt: data.paidAt,
          subtotal: data.subtotal,
          total: data.total,
          items: { create: data.items },
        },
      });
      expect(result).toBe(created);
    });
  });

  describe('findTransactionByNumber', () => {
    it('mengembalikan id transaksi berdasarkan merchantId dan nomor', async () => {
      (mockPrisma.transaction.findFirst as jest.Mock).mockResolvedValue({
        id: 'txn-001',
      });

      const result = await repo.findTransactionByNumber(
        'mch-001',
        'INV-2026-000001',
      );

      expect(mockPrisma.transaction.findFirst).toHaveBeenCalledWith({
        where: { merchantId: 'mch-001', transactionNumber: 'INV-2026-000001' },
        select: { id: true },
      });
      expect(result).toEqual({ id: 'txn-001' });
    });
  });

  describe('listTransactions', () => {
    it('mengembalikan daftar transaksi dengan include operator dan order by desc', async () => {
      const where = { merchantId: 'mch-001' } as Prisma.TransactionWhereInput;
      (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repo.listTransactions(where, 0, 10);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where,
        include: { operator: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual([]);
    });
  });

  describe('countTransactions', () => {
    it('menghitung jumlah transaksi berdasarkan where', async () => {
      const where = {
        merchantId: 'mch-001',
        status: 'COMPLETED',
      } as Prisma.TransactionWhereInput;
      (mockPrisma.transaction.count as jest.Mock).mockResolvedValue(5);

      const result = await repo.countTransactions(where);

      expect(mockPrisma.transaction.count).toHaveBeenCalledWith({ where });
      expect(result).toBe(5);
    });
  });
});
