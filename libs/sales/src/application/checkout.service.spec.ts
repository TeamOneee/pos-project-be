import { createHash } from 'crypto';
import { PaymentMethod, Prisma } from '@prisma/client';
import {
  ApiError,
  AuthUser,
  ErrorCode,
  PrismaWriteService,
} from '@app/platform';
import { ProductReadPort } from '@app/catalog';
import { StockReservationPort } from '@app/inventory';
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

const makeProduct = (overrides: Record<string, unknown> = {}) => ({
  id: 'product-1',
  merchantId: 'merchant-1',
  categoryId: 'category-1',
  name: 'Es Teh',
  isActive: true,
  isCategoryActive: true,
  effectivePrice: '5500.00',
  ...overrides,
});

const makeReceipt = (overrides: Record<string, unknown> = {}): CheckoutResultDto => ({
  transaction_id: 'txn-1',
  transaction_number: 'INV-2026-000001',
  status: 'COMPLETED',
  outlet_id: 'outlet-1',
  operator: { user_id: 'owner-1', role: 'OWNER', name: 'Test Owner' },
  items: [],
  subtotal: '0.00',
  total: '0.00',
  payment: { method: 'CASH', status: 'CONFIRMED', paid_at: '2026-01-01T00:00:00.000Z' },
  created_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeDto = (overrides: Record<string, unknown> = {}): CheckoutDto => ({
  checkout_request_id: 'req-1',
  outlet_id: 'outlet-1',
  items: [{ product_id: 'product-1', quantity: 2 }],
  payment_method: 'CASH' as PaymentMethod,
  ...overrides,
} as CheckoutDto);

// memverifikasi alur checkout (FR-CHK-001-014): idempotency, validasi harga,
// total = subtotal, pembuatan transaksi, dan reservasi stok.
describe('CheckoutService', () => {
  const prisma = { $transaction: jest.fn() };
  const repository = {
    findByCheckoutRequest: jest.fn(),
    nextTransactionNumber: jest.fn(),
    createTransaction: jest.fn(),
  };
  const receiptService = { compose: jest.fn() };
  const productRead = { getProductsForSaleValidation: jest.fn() };
  const reservation = { reserveForSale: jest.fn() };
  const tenantAuth = { assertOutletOwnedByActor: jest.fn() };
  let service: CheckoutService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
    );
    service = new CheckoutService(
      prisma as unknown as PrismaWriteService,
      repository as unknown as TransactionRepository,
      receiptService as unknown as ReceiptService,
      productRead as unknown as ProductReadPort,
      reservation as unknown as StockReservationPort,
      tenantAuth as unknown as TenantAuthorizationService,
    );
    tenantAuth.assertOutletOwnedByActor.mockResolvedValue(undefined);
    repository.findByCheckoutRequest.mockResolvedValue(null);
    productRead.getProductsForSaleValidation.mockResolvedValue([makeProduct()]);
    repository.nextTransactionNumber.mockResolvedValue('INV-2026-000001');
    repository.createTransaction.mockResolvedValue({ id: 'txn-1' });
    reservation.reserveForSale.mockResolvedValue({ ok: true });
    receiptService.compose.mockResolvedValue(makeReceipt());
  });

  it('FR-CHK-001: membuat transaksi + reservasi stok dan mengembalikan receipt', async () => {
    const result = await service.checkout(actor, makeDto());

    expect(result).toMatchObject({ transaction_id: 'txn-1' });
    expect(repository.createTransaction).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        merchantId: 'merchant-1',
        outletId: 'outlet-1',
        operatorUserId: 'owner-1',
        transactionNumber: 'INV-2026-000001',
        checkoutRequestId: 'req-1',
        status: 'COMPLETED',
        paymentMethod: 'CASH',
        paymentStatus: 'CONFIRMED',
        subtotal: expect.any(Prisma.Decimal),
        total: expect.any(Prisma.Decimal),
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
        transactionId: expect.any(String),
        lines: [{ productId: 'product-1', quantity: 2 }],
      }),
    );
  });

  it('OD-004/DR-013: total sama dengan subtotal', async () => {
    await service.checkout(actor, makeDto());
    const call = repository.createTransaction.mock.calls[0][1];
    expect(call.subtotal.toFixed(2)).toBe('11000.00');
    expect(call.total.toFixed(2)).toBe('11000.00');
    expect(call.total.equals(call.subtotal)).toBe(true);
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
    // urutan sorted product_id, quantity gabungan.
    expect(productRead.getProductsForSaleValidation).toHaveBeenCalledWith({
      merchantId: 'merchant-1',
      outletId: 'outlet-1',
      productIds: ['product-1', 'product-2'],
    });
    const call = repository.createTransaction.mock.calls[0][1];
    expect(call.items).toHaveLength(2);
    expect(call.items[1]).toMatchObject({ productId: 'product-2', quantity: 4 });
  });

  it('FR-CHK-003/OD-012: replay saat checkout_request_id sama dengan hash sama', async () => {
    const dto = makeDto();
    const expectedHash = sha256(
      JSON.stringify({
        merchant_id: 'merchant-1',
        outlet_id: 'outlet-1',
        operator_user_id: 'owner-1',
        items: [{ product_id: 'product-1', quantity: 2, expected_unit_price: null }],
        payment_method: 'CASH',
      }),
    );
    repository.findByCheckoutRequest
      .mockResolvedValueOnce({ id: 'txn-0', requestHash: expectedHash })
      .mockResolvedValueOnce({ id: 'txn-0', requestHash: expectedHash });
    receiptService.compose.mockResolvedValue(makeReceipt({ transaction_id: 'txn-0' }));

    const result = await service.checkout(actor, dto);

    expect(result).toMatchObject({ transaction_id: 'txn-0' });
    expect(receiptService.compose).toHaveBeenCalledWith({}, 'txn-0', actor);
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
            { product_id: 'product-1', quantity: 2, expected_unit_price: '5500.00' },
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
        items: [{ product_id: 'product-1', quantity: 2, expected_unit_price: null }],
        payment_method: 'CASH',
      }),
    );
    repository.findByCheckoutRequest
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'txn-1', requestHash: expectedHash });
    receiptService.compose.mockResolvedValue(makeReceipt({ transaction_id: 'txn-1' }));

    const result = await service.checkout(actor, dto);

    expect(result).toMatchObject({ transaction_id: 'txn-1' });
    expect(reservation.reserveForSale).not.toHaveBeenCalled();
  });
});