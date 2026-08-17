// memverifikasi dispatch HTTP ke TransactionQueryService pada TransactionController.
import { AuthUser } from '@app/platform';
import { TransactionQueryService } from '../application/transaction-query.service';
import { TransactionController } from './transaction.controller';

function makeMockTransactionQueryService() {
  return { list: jest.fn(), searchByTransactionNumber: jest.fn(), detail: jest.fn() };
}

function makeActor(overrides?: Partial<AuthUser>): AuthUser {
  return {
    userId: 'user-001',
    role: 'CASHIER',
    merchantId: 'mch-001',
    outletId: 'out-001',
    ...overrides,
  };
}

describe('TransactionController', () => {
  let controller: TransactionController;
  let mockQueryService: ReturnType<typeof makeMockTransactionQueryService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryService = makeMockTransactionQueryService();
    controller = new TransactionController(
      mockQueryService as unknown as TransactionQueryService,
    );
  });

  describe('GET /transactions', () => {
    it('mendelegasikan ke TransactionQueryService.list dengan actor dan query', async () => {
      const actor = makeActor();
      const query = { page: 1, limit: 10 };
      mockQueryService.list.mockResolvedValue({ data: [], total: 0 });

      const result = await controller.list(actor, query as never);

      expect(mockQueryService.list).toHaveBeenCalledWith(actor, query);
      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('GET /transactions/search', () => {
    it('mendelegasikan ke searchByTransactionNumber dengan actor dan transaction_number', async () => {
      const actor = makeActor();
      const query = { transaction_number: 'INV-2026-000001' };
      mockQueryService.searchByTransactionNumber.mockResolvedValue({ id: 'txn-001' });

      const result = await controller.search(actor, query as never);

      expect(mockQueryService.searchByTransactionNumber).toHaveBeenCalledWith(actor, 'INV-2026-000001');
      expect(result).toEqual({ id: 'txn-001' });
    });
  });

  describe('GET /transactions/:id', () => {
    it('mendelegasikan ke TransactionQueryService.detail dengan actor dan id', async () => {
      const actor = makeActor();
      mockQueryService.detail.mockResolvedValue({ id: 'txn-001', items: [] });

      const result = await controller.detail(actor, 'txn-001');

      expect(mockQueryService.detail).toHaveBeenCalledWith(actor, 'txn-001');
      expect(result).toEqual({ id: 'txn-001', items: [] });
    });
  });
});
