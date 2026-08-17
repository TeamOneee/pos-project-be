import { Prisma } from '@prisma/client';
import { ApiError, AuthUser, PrismaWriteService } from '@app/platform';
import { TransactionRepository } from '../infrastructure/transaction.repository';
import { ReceiptService } from './receipt.service';
import { TransactionQueryService } from './transaction-query.service';

const owner: AuthUser = {
  userId: 'owner-1',
  merchantId: 'merchant-1',
  role: 'OWNER',
  outletId: null,
};
const cashier: AuthUser = {
  userId: 'cashier-1',
  merchantId: 'merchant-1',
  role: 'CASHIER',
  outletId: 'outlet-1',
};

const makeTxRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'txn-1',
  merchantId: 'merchant-1',
  outletId: 'outlet-1',
  transactionNumber: 'INV-2026-000001',
  status: 'COMPLETED',
  total: new Prisma.Decimal('11000.00'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  operator: { name: 'Test Owner' },
  ...overrides,
});

// memverifikasi daftar transaksi, detail, dan pencarian berdasarkan nomor.
describe('TransactionQueryService', () => {
  const prisma = {} as PrismaWriteService;
  const repository = {
    listTransactions: jest.fn(),
    countTransactions: jest.fn(),
    findTransactionByNumber: jest.fn(),
  };
  const receiptService = { compose: jest.fn() };
  let service: TransactionQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TransactionQueryService(
      prisma,
      repository as unknown as TransactionRepository,
      receiptService as unknown as ReceiptService,
    );
  });

  it('FR-TX: memetakan baris transaksi ke summary dengan paginasi', async () => {
    repository.listTransactions.mockResolvedValue([makeTxRow()]);
    repository.countTransactions.mockResolvedValue(1);
    const result = await service.list(owner, {
      page: 0,
      size: 20,
      skip: 0,
      take: 20,
    });
    expect(result).toMatchObject({
      total_elements: 1,
      content: [
        {
          transaction_id: 'txn-1',
          transaction_number: 'INV-2026-000001',
          operator_name: 'Test Owner',
          total: '11000.00',
        },
      ],
    });
  });

  it('OD-003: CASHIER hanya melihat transaksinya sendiri (scope dipaksa service)', async () => {
    repository.listTransactions.mockResolvedValue([]);
    repository.countTransactions.mockResolvedValue(0);
    await service.list(cashier, { page: 0, size: 20, skip: 0, take: 20 });
    expect(repository.listTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: 'merchant-1',
        operatorUserId: 'cashier-1',
        outletId: 'outlet-1',
      }),
      0,
      20,
    );
  });

  it('OWNER dapat memfilter berdasarkan outlet dan periode', async () => {
    repository.listTransactions.mockResolvedValue([]);
    repository.countTransactions.mockResolvedValue(0);
    await service.list(owner, {
      page: 0,
      size: 20,
      skip: 0,
      take: 20,
      outlet_id: 'outlet-2',
      date_from: '2026-01-01T00:00:00.000Z',
      date_to: '2026-01-31T23:59:59.999Z',
    });
    expect(repository.listTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        outletId: 'outlet-2',
        createdAt: {
          gte: new Date('2026-01-01T00:00:00.000Z'),
          lte: new Date('2026-01-31T23:59:59.999Z'),
        },
      }),
      0,
      20,
    );
  });

  it('detail meneruskan ke komposisi receipt', async () => {
    receiptService.compose.mockResolvedValue({ id: 'txn-1' });
    await service.detail(owner, 'txn-1');
    expect(receiptService.compose).toHaveBeenCalledWith(prisma, 'txn-1', owner);
  });

  it('FR-TX: mencari transaksi berdasarkan nomor transaksi', async () => {
    repository.findTransactionByNumber.mockResolvedValue({ id: 'txn-1' });
    receiptService.compose.mockResolvedValue({ transaction_id: 'txn-1' });
    const result = await service.searchByTransactionNumber(
      owner,
      'INV-2026-000001',
    );
    expect(result).toMatchObject({ transaction_id: 'txn-1' });
    expect(repository.findTransactionByNumber).toHaveBeenCalledWith(
      'merchant-1',
      'INV-2026-000001',
    );
  });

  it('mengembalikan 404 saat nomor transaksi tidak ditemukan', async () => {
    repository.findTransactionByNumber.mockResolvedValue(null);
    const error = await service
      .searchByTransactionNumber(owner, 'INV-2026-000999')
      .catch((e: unknown) => e);
    expect((error as ApiError).code).toBe('NOT_FOUND');
  });
});
