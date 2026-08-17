// memverifikasi dispatch HTTP ke CheckoutService pada CheckoutController (FR-017/FR-021).
import { AuthUser } from '@app/platform';
import { CheckoutService } from '../application/checkout.service';
import { IdempotencyQueryService } from '../application/idempotency-query.service';
import { CheckoutController } from './checkout.controller';

function makeMockCheckoutService() {
  return { checkout: jest.fn() };
}

function makeMockIdempotencyQueryService() {
  return { getStatus: jest.fn() };
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

describe('CheckoutController', () => {
  let controller: CheckoutController;
  let mockCheckoutService: ReturnType<typeof makeMockCheckoutService>;
  let mockIdempotencyQueryService: ReturnType<typeof makeMockIdempotencyQueryService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckoutService = makeMockCheckoutService();
    mockIdempotencyQueryService = makeMockIdempotencyQueryService();
    controller = new CheckoutController(
      mockCheckoutService as unknown as CheckoutService,
      mockIdempotencyQueryService as unknown as IdempotencyQueryService,
    );
  });

  describe('POST /checkout', () => {
    it('mendelegasikan ke CheckoutService.checkout dengan actor dan dto', async () => {
      const actor = makeActor();
      const dto = {
        idempotencyKey: 'idem-001',
        outletId: 'out-001',
        paymentMethod: 'CASH',
        items: [{ productId: 'prod-001', quantity: 2 }],
        confirm: true,
      };
      mockCheckoutService.checkout.mockResolvedValue({ id: 'txn-001' });

      const result = await controller.checkout(actor, dto as never);

      expect(mockCheckoutService.checkout).toHaveBeenCalledWith(actor, dto);
      expect(result).toEqual({ id: 'txn-001' });
    });
  });

  describe('GET /transactions/status', () => {
    it('mendelegasikan ke IdempotencyQueryService.getStatus dengan actor dan query', async () => {
      const actor = makeActor();
      const query = { idempotency_key: 'idem-001' };
      mockIdempotencyQueryService.getStatus.mockResolvedValue({ status: 'COMPLETED' });

      const result = await controller.status(actor, query as never);

      expect(mockIdempotencyQueryService.getStatus).toHaveBeenCalledWith(actor, query);
      expect(result).toEqual({ status: 'COMPLETED' });
    });
  });
});
