import { ApiError, AuthUser, PrismaWriteService } from '@app/platform';
import { TransactionRepository } from '../infrastructure/transaction.repository';
import { ReceiptService } from './receipt.service';
import { IdempotencyQueryService } from './idempotency-query.service';

const actor: AuthUser = {
  userId: 'owner-1',
  merchantId: 'merchant-1',
  role: 'OWNER',
  outletId: null,
};

// memverifikasi status idempotency checkout (FR-CHK-012).
describe('IdempotencyQueryService', () => {
  const prisma = {} as PrismaWriteService;
  const repository = { findByCheckoutRequest: jest.fn() };
  const receiptService = { compose: jest.fn() };
  let service: IdempotencyQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IdempotencyQueryService(
      prisma,
      repository as unknown as TransactionRepository,
      receiptService as unknown as ReceiptService,
    );
  });

  it('FR-CHK-012: mengembalikan status transaksi bila request sudah pernah checkout', async () => {
    repository.findByCheckoutRequest.mockResolvedValue({ id: 'txn-1' });
    receiptService.compose.mockResolvedValue({ transaction_id: 'txn-1' });
    const result = await service.getStatus(actor, {
      checkout_request_id: 'req-1',
    });
    expect(result).toMatchObject({ transaction_id: 'txn-1' });
    expect(repository.findByCheckoutRequest).toHaveBeenCalledWith(
      prisma,
      'merchant-1',
      'req-1',
    );
  });

  it('FR-CHK-004: 404 saat checkout request belum ada (boleh submit ulang)', async () => {
    repository.findByCheckoutRequest.mockResolvedValue(null);
    const error = await service
      .getStatus(actor, { checkout_request_id: 'req-99' })
      .catch((e: unknown) => e);
    expect((error as ApiError).code).toBe('NOT_FOUND');
    expect(receiptService.compose).not.toHaveBeenCalled();
  });
});