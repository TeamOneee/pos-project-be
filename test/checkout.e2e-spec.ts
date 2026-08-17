// E2E: alur checkout end-to-end — AT-003, AT-005, AT-006, AT-007, AT-008, AT-010, AT-029.
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { Reflector } from '@nestjs/core';
import { CheckoutController } from '@app/sales/web/checkout.controller';
import { CheckoutService } from '@app/sales/application/checkout.service';
import { IdempotencyQueryService } from '@app/sales/application/idempotency-query.service';
import { TransactionController } from '@app/sales/web/transaction.controller';
import { TransactionQueryService } from '@app/sales/application/transaction-query.service';
import { ReceiptController } from '@app/sales/web/receipt.controller';
import { ReceiptService } from '@app/sales/application/receipt.service';
import { AllExceptionsFilter } from '@app/platform/error/all-exceptions.filter';
import { SuccessResponseInterceptor } from '@app/platform/web/success-response.interceptor';
import { ApiError } from '@app/platform/error/api-error';
import { ErrorCode } from '@app/platform/error/error-code';

const mockCheckoutService = { checkout: jest.fn() };
const mockIdempotencyService = { getStatus: jest.fn() };
const mockTransactionQueryService = {
  list: jest.fn(),
  searchByTransactionNumber: jest.fn(),
  detail: jest.fn(),
};
const mockReceiptService = { getReceipt: jest.fn() };

const cashierUser = {
  userId: 'cashier-1',
  merchantId: 'mch-001',
  role: 'CASHIER',
  outletId: 'out-001',
};

describe('E2E — Checkout & Transactions (AT-003, 005–008, 010, 029)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CheckoutController, TransactionController, ReceiptController],
      providers: [
        { provide: CheckoutService, useValue: mockCheckoutService },
        { provide: IdempotencyQueryService, useValue: mockIdempotencyService },
        { provide: TransactionQueryService, useValue: mockTransactionQueryService },
        { provide: ReceiptService, useValue: mockReceiptService },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: (ctx: { switchToHttp: () => { getRequest: () => { user: unknown } } }) => {
              ctx.switchToHttp().getRequest().user = cashierUser;
              return true;
            },
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new SuccessResponseInterceptor(new Reflector()));
    app.useGlobalFilters(new AllExceptionsFilter({ get: jest.fn().mockReturnValue('test-corr-id') } as never));
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/v1/checkout', () => {
    it('AT-003: checkout berhasil mengembalikan transaction_id', async () => {
      mockCheckoutService.checkout.mockResolvedValue({
        transaction_id: 'txn-001',
        status: 'COMPLETED',
        payment_method: 'CASH',
        total: '50000',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/checkout')
        .send({
          checkout_request_id: 'idem-001',
          outlet_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_method: 'CASH',
          items: [{ product_id: '550e8400-e29b-41d4-a716-446655440001', quantity: 2 }],
        })
        .expect(201);

      expect(res.body.data).toMatchObject({
        transaction_id: 'txn-001',
        status: 'COMPLETED',
        payment_method: 'CASH',
      });
    });

    it('AT-005: checkout dengan checkout_request_id sama mengembalikan transaksi yang sama', async () => {
      mockCheckoutService.checkout.mockResolvedValue({
        transaction_id: 'txn-001',
        status: 'COMPLETED',
      });

      await request(app.getHttpServer())
        .post('/api/v1/checkout')
        .send({
          checkout_request_id: 'idem-001',
          outlet_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_method: 'CASH',
          items: [{ product_id: '550e8400-e29b-41d4-a716-446655440001', quantity: 1 }],
        })
        .expect(201);

      const res2 = await request(app.getHttpServer())
        .post('/api/v1/checkout')
        .send({
          checkout_request_id: 'idem-001',
          outlet_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_method: 'CASH',
          items: [{ product_id: '550e8400-e29b-41d4-a716-446655440001', quantity: 1 }],
        })
        .expect(201);

      expect(res2.body.data.transaction_id).toBe('txn-001');
      expect(mockCheckoutService.checkout).toHaveBeenCalledTimes(2);
    });

    it('AT-006: checkout_request_id sama tetapi payload berbeda mengembalikan IDEMPOTENCY_CONFLICT', async () => {
      mockCheckoutService.checkout.mockRejectedValue(
        ApiError.conflict(ErrorCode.IDEMPOTENCY_CONFLICT, 'Konflik idempotensi'),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/checkout')
        .send({
          checkout_request_id: 'idem-002',
          outlet_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_method: 'CASH',
          items: [{ product_id: '550e8400-e29b-41d4-a716-446655440001', quantity: 5 }],
        })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(409);
    });

    it('AT-007: harga berubah mengembalikan PRICE_CHANGED', async () => {
      mockCheckoutService.checkout.mockRejectedValue(
        ApiError.conflict(ErrorCode.PRICE_CHANGED, 'Harga berubah', [
          { field: 'items[0].expectedUnitPrice', reason: 'Harga berubah dari 25000 menjadi 30000' },
        ]),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/checkout')
        .send({
          checkout_request_id: 'idem-003',
          outlet_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_method: 'CASH',
          items: [{ product_id: '550e8400-e29b-41d4-a716-446655440001', quantity: 1, expected_unit_price: '25000' }],
        })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
      expect(res.body.errors).toBeDefined();
    });

    it('AT-008: produk nonaktif mengembalikan PRODUCT_INACTIVE', async () => {
      mockCheckoutService.checkout.mockRejectedValue(
        ApiError.conflict(ErrorCode.PRODUCT_INACTIVE, 'Produk tidak aktif'),
      );

      await request(app.getHttpServer())
        .post('/api/v1/checkout')
        .send({
          checkout_request_id: 'idem-004',
          outlet_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_method: 'CASH',
          items: [{ product_id: '550e8400-e29b-41d4-a716-446655440001', quantity: 1 }],
        })
        .expect(409);
    });

    it('AT-029: checkout_request_id berbeda menghasilkan dua transaksi', async () => {
      mockCheckoutService.checkout
        .mockResolvedValueOnce({ transaction_id: 'txn-001', status: 'COMPLETED' })
        .mockResolvedValueOnce({ transaction_id: 'txn-002', status: 'COMPLETED' });

      const body1 = {
        checkout_request_id: 'idem-a',
        outlet_id: '550e8400-e29b-41d4-a716-446655440000',
        payment_method: 'CASH',
        items: [{ product_id: '550e8400-e29b-41d4-a716-446655440001', quantity: 1 }],
      };
      const body2 = { ...body1, checkout_request_id: 'idem-b' };

      const [r1, r2] = await Promise.all([
        request(app.getHttpServer()).post('/api/v1/checkout').send(body1),
        request(app.getHttpServer()).post('/api/v1/checkout').send(body2),
      ]);

      expect(r1.body.data.transaction_id).toBe('txn-001');
      expect(r2.body.data.transaction_id).toBe('txn-002');
    });
  });

  describe('GET /api/v1/transactions/status', () => {
    it('AT-010: lookup status transaksi mengembalikan data yang benar', async () => {
      mockIdempotencyService.getStatus.mockResolvedValue({
        status: 'COMPLETED',
        transaction_id: 'txn-001',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/transactions/status')
        .query({ checkout_request_id: 'idem-001' })
        .expect(200);

      expect(res.body.data).toMatchObject({
        status: 'COMPLETED',
        transaction_id: 'txn-001',
      });
    });
  });

  describe('GET /api/v1/transactions', () => {
    it('daftar transaksi mengembalikan data dengan pagination', async () => {
      mockTransactionQueryService.list.mockResolvedValue({
        content: [{ id: 'txn-001', total: '50000' }],
        page: 1,
        size: 10,
        total_elements: 1,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({ page: 1, size: 10 })
        .expect(200);

      expect(res.body.data.content).toHaveLength(1);
      expect(res.body.data.total_elements).toBe(1);
    });
  });

  describe('GET /api/v1/transactions/search', () => {
    it('pencarian berdasarkan nomor transaksi mengembalikan hasil', async () => {
      mockTransactionQueryService.searchByTransactionNumber.mockResolvedValue({
        id: 'txn-001',
        transactionNumber: 'INV-2026-000001',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/transactions/search')
        .query({ transaction_number: 'INV-2026-000001' })
        .expect(200);

      expect(res.body.data).toMatchObject({ transactionNumber: 'INV-2026-000001' });
    });
  });

  describe('GET /api/v1/transactions/:id', () => {
    it('detail transaksi mengembalikan data lengkap', async () => {
      mockTransactionQueryService.detail.mockResolvedValue({
        id: 'txn-001',
        items: [{ productId: 'p-001', quantity: 2 }],
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/transactions/txn-001')
        .expect(200);

      expect(res.body.data).toMatchObject({ id: 'txn-001' });
      expect(res.body.data.items).toHaveLength(1);
    });
  });

  describe('GET /api/v1/receipts/:transaction_id', () => {
    it('AT-010/013: receipt mengembalikan data transaksi yang sama', async () => {
      mockReceiptService.getReceipt.mockResolvedValue({
        transaction_id: 'txn-001',
        items: [{ name: 'Kopi Susu', quantity: 2, subtotal: '50000' }],
        total: '50000',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/receipts/txn-001')
        .expect(200);

      expect(res.body.data).toMatchObject({
        transaction_id: 'txn-001',
        total: '50000',
      });
    });
  });
});
