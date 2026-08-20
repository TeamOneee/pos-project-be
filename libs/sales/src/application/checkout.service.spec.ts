// memverifikasi alur checkout (FR-CHK-001-014): idempotency, validasi harga,
// total = subtotal, pembuatan transaksi, dan reservasi stok.
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import {
  ApiError,
  AuthUser,
  ErrorCode,
  PrismaWriteService,
} from '@app/platform';
import { TenantAuthorizationService } from '@app/tenant';
import { TransactionRepository } from '../infrastructure/transaction.repository';
import { ReceiptService } from './receipt.service';
import { CheckoutService } from './checkout.service';
import { CheckoutResultDto } from '../web/dto/checkout-result.dto';
import { CheckoutDto } from '../web/dto/checkout.dto';

const actor: AuthUser = {
  userId: 'owner-1',
  merchantId: 'merchant-1',
  role: 'OWNER',
  outletId: null,
};

const sha256 = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

const makeProduct = (overrides = {}) => ({
  id: 'product-1',
  merchantId: 'merchant-1',
  categoryId: 'category-1',
  name: 'Es Teh',
  isActive: true,
  isCategoryActive: true,
  effectivePrice: '5500.00',
  ...overrides,
});

const makeReceipt = (
  overrides: Partial<CheckoutResultDto> = {},
): CheckoutResultDto => ({
  transaction_id: 'txn-1',
  transaction_number: 'INV-2026-000001',
  status: 'COMPLETED',
  outlet_id: 'outlet-1',
  operator: { user_id: 'owner-1', role: 'OWNER', name: 'Test Owner' },
  items: [],
  subtotal: '11000.00',
  total: '11000.00',
  payment: {
    method: 'CASH',
    status: 'CONFIRMED',
    paid_at: '2026-01-01T00:00:00.000Z',
  },
  created_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeDto = (overrides: Partial<CheckoutDto> = {}): CheckoutDto => ({
  outlet_id: 'outlet-1',
  checkout_request_id: 'req-1',
  payment_method: 'CASH',
  items: [{ product_id: 'product-1', quantity: 2 }],
  ...overrides,
});

describe('CheckoutService', () => {
  let service: CheckoutService;
  let prisma: { $transaction: jest.Mock };
  let repository: {
    findByCheckoutRequest: jest.Mock;
    nextTransactionNumber: jest.Mock;
    createTransaction: jest.Mock;
  };
  let receiptService: { compose: jest.Mock };
  let productRead: { getProductsForSaleValidation: jest.Mock };
  let reservation: { reserveForSale: jest.Mock };
  let tenantAuth: { assertOutletOwnedByActor: jest.Mock };

  beforeEach(() => {
    prisma = {
      $transaction: jest
        .fn()
        .mockImplementation((cb: (tx: unknown) => Promise<unknown>) =>
          Promise.resolve(cb({})),
        ),
    };

    repository = {
      findByCheckoutRequest: jest.fn().mockResolvedValue(null),
      nextTransactionNumber: jest.fn().mockResolvedValue('INV-2026-000001'),
      createTransaction: jest.fn().mockResolvedValue({
        id: 'txn-1',
      }),
    };

    receiptService = {
      compose: jest.fn().mockResolvedValue(makeReceipt()),
    };

    productRead = {
      getProductsForSaleValidation: jest
        .fn()
        .mockResolvedValue([makeProduct()]),
    };

    reservation = {
      reserveForSale: jest.fn().mockResolvedValue({ ok: true }),
    };

    tenantAuth = {
      assertOutletOwnedByActor: jest.fn().mockResolvedValue(undefined),
    };

    service = new CheckoutService(
      prisma as unknown as PrismaWriteService,
      repository as unknown as TransactionRepository,
      receiptService as unknown as ReceiptService,
      productRead,
      reservation,
      tenantAuth as unknown as TenantAuthorizationService,
    );
  });

  it('FR-CHK-001/002/010: membuat transaksi + reservasi stok atomik dan mengembalikan receipt', async () => {
    const result = await service.checkout(actor, makeDto());

    expect(tenantAuth.assertOutletOwnedByActor).toHaveBeenCalledWith(
      actor,
      'outlet-1',
    );
    expect(productRead.getProductsForSaleValidation).toHaveBeenCalledWith({
      merchantId: 'merchant-1',
      outletId: 'outlet-1',
      productIds: ['product-1'],
    });
    expect(repository.createTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        merchantId: 'merchant-1',
        outletId: 'outlet-1',
        operatorUserId: 'owner-1',
        status: 'COMPLETED',
        paymentMethod: 'CASH',
        paymentStatus: 'CONFIRMED',
        subtotal: new Prisma.Decimal('11000.00'),
        total: new Prisma.Decimal('11000.00'),
        items: [
          expect.objectContaining({
            productId: 'product-1',
            productNameSnapshot: 'Es Teh',
            quantity: 2,
          }),
        ],
      }),
    );
    expect(reservation.reserveForSale).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: 'merchant-1',
        outletId: 'outlet-1',
        lines: [{ productId: 'product-1', quantity: 2 }],
      }),
    );
    expect(result).toMatchObject({ transaction_id: 'txn-1' });
  });

  it('OD-004/DR-013: total sama dengan subtotal', async () => {
    await service.checkout(actor, makeDto());
    expect(repository.createTransaction).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        subtotal: new Prisma.Decimal('11000.00'),
        total: new Prisma.Decimal('11000.00'),
      }),
    );
  });

  it('07 §5.6: menggabungkan dan mengurutkan item duplicate Product', async () => {
    productRead.getProductsForSaleValidation.mockResolvedValue([
      makeProduct(),
      makeProduct({ id: 'product-2', name: 'Kopi', effectivePrice: '3000.00' }),
    ]);
    await service.checkout(
      actor,
      makeDto({
        items: [
          { product_id: 'product-2', quantity: 1 },
          { product_id: 'product-1', quantity: 2 },
          { product_id: 'product-2', quantity: 3 },
        ],
      }),
    );
    expect(productRead.getProductsForSaleValidation).toHaveBeenCalledWith({
      merchantId: 'merchant-1',
      outletId: 'outlet-1',
      productIds: ['product-1', 'product-2'],
    });
    expect(repository.createTransaction).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        items: [
          expect.objectContaining({ productId: 'product-1', quantity: 2 }),
          expect.objectContaining({ productId: 'product-2', quantity: 4 }),
        ],
      }),
    );
  });

  it('FR-CHK-003/OD-012: replay saat checkout_request_id sama dengan hash sama', async () => {
    const dto = makeDto();
    const expectedHash = sha256(
      JSON.stringify({
        merchant_id: 'merchant-1',
        outlet_id: 'outlet-1',
        operator_user_id: 'owner-1',
        items: [
          { product_id: 'product-1', quantity: 2, expected_unit_price: null },
        ],
        payment_method: 'CASH',
      }),
    );
    repository.findByCheckoutRequest
      .mockResolvedValueOnce({ id: 'txn-0', requestHash: expectedHash })
      .mockResolvedValueOnce({ id: 'txn-0', requestHash: expectedHash });
    receiptService.compose.mockResolvedValue(
      makeReceipt({ transaction_id: 'txn-0' }),
    );

    const result = await service.checkout(actor, dto);

    expect(result).toMatchObject({ transaction_id: 'txn-0' });
    expect(receiptService.compose).toHaveBeenCalledWith(prisma, 'txn-0', actor);
    expect(repository.createTransaction).not.toHaveBeenCalled();
    expect(reservation.reserveForSale).not.toHaveBeenCalled();
  });

  it('FR-CHK-004: konflik idempotency saat hash berbeda untuk request yang sama', async () => {
    repository.findByCheckoutRequest.mockResolvedValue({
      id: 'txn-0',
      requestHash: 'different-hash',
    });
    const error = await service
      .checkout(actor, makeDto())
      .catch((e: unknown) => e);
    expect((error as ApiError).code).toBe(ErrorCode.IDEMPOTENCY_CONFLICT);
  });

  it('menolak Product yang tidak ditemukan', async () => {
    productRead.getProductsForSaleValidation.mockResolvedValue([]);
    const error = await service
      .checkout(actor, makeDto())
      .catch((e: unknown) => e);
    expect((error as ApiError).code).toBe(ErrorCode.NOT_FOUND);
  });

  it('BR-012: menolak Product nonaktif', async () => {
    productRead.getProductsForSaleValidation.mockResolvedValue([
      makeProduct({ isActive: false }),
    ]);
    const error = await service
      .checkout(actor, makeDto())
      .catch((e: unknown) => e);
    expect((error as ApiError).code).toBe(ErrorCode.PRODUCT_INACTIVE);
  });

  it('BR-019: menolak Product dengan Category nonaktif', async () => {
    productRead.getProductsForSaleValidation.mockResolvedValue([
      makeProduct({ isCategoryActive: false }),
    ]);
    const error = await service
      .checkout(actor, makeDto())
      .catch((e: unknown) => e);
    expect((error as ApiError).code).toBe(ErrorCode.CATEGORY_INACTIVE);
  });

  it('FR-CHK-005: menolak bila harga berubah dari expected_unit_price', async () => {
    productRead.getProductsForSaleValidation.mockResolvedValue([
      makeProduct({ effectivePrice: '6000.00' }),
    ]);
    const error = await service
      .checkout(
        actor,
        makeDto({
          items: [
            {
              product_id: 'product-1',
              quantity: 2,
              expected_unit_price: '5500.00',
            },
          ],
        }),
      )
      .catch((e: unknown) => e);
    expect((error as ApiError).code).toBe(ErrorCode.PRICE_CHANGED);
  });

  it('FR-INV-004: konflik saat stok tidak mencukupi', async () => {
    reservation.reserveForSale.mockResolvedValue({
      ok: false,
      insufficient: [{ productId: 'product-1', requested: 2, available: 1 }],
    });
    const error = await service
      .checkout(actor, makeDto())
      .catch((e: unknown) => e);
    expect((error as ApiError).code).toBe(ErrorCode.INSUFFICIENT_STOCK);
  });

  it('OD-012: replay transaksi saat createTransaction kena unique constraint', async () => {
    repository.createTransaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('P2002', {
        code: 'P2002',
        clientVersion: '6.0.0',
        meta: { target: ['merchantId', 'checkout_request_id'] },
      }),
    );
    const dto = makeDto();
    const expectedHash = sha256(
      JSON.stringify({
        merchant_id: 'merchant-1',
        outlet_id: 'outlet-1',
        operator_user_id: 'owner-1',
        items: [
          { product_id: 'product-1', quantity: 2, expected_unit_price: null },
        ],
        payment_method: 'CASH',
      }),
    );
    repository.findByCheckoutRequest
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'txn-1', requestHash: expectedHash });
    receiptService.compose.mockResolvedValue(
      makeReceipt({ transaction_id: 'txn-1' }),
    );

    const result = await service.checkout(actor, dto);

    expect(result).toMatchObject({ transaction_id: 'txn-1' });
    expect(reservation.reserveForSale).not.toHaveBeenCalled();
  });
});
