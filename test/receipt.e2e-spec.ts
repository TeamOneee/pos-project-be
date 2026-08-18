// E2E: struk transaksi — AT-013 (CASHIER hanya boleh struk outlet sendiri).
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { Reflector } from '@nestjs/core';
import { ReceiptController } from '@app/sales/web/receipt.controller';
import { ReceiptService } from '@app/sales/application/receipt.service';
import { AllExceptionsFilter } from '@app/platform/error/all-exceptions.filter';
import { SuccessResponseInterceptor } from '@app/platform/web/success-response.interceptor';
import { ApiError } from '@app/platform/error/api-error';

const mockReceiptService = { getReceipt: jest.fn() };

const cashierUser = {
  userId: 'cashier-1',
  merchantId: 'mch-001',
  role: 'CASHIER',
  outletId: 'out-001',
};

describe('E2E — Receipt (AT-013)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ReceiptController],
      providers: [
        { provide: ReceiptService, useValue: mockReceiptService },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: (ctx: {
              switchToHttp: () => { getRequest: () => { user: unknown } };
            }) => {
              ctx.switchToHttp().getRequest().user = cashierUser;
              return true;
            },
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalInterceptors(new SuccessResponseInterceptor(new Reflector()));
    app.useGlobalFilters(
      new AllExceptionsFilter({
        get: jest.fn().mockReturnValue('test-corr-id'),
      } as never),
    );
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/v1/receipts/:transaction_id', () => {
    it('AT-013: kasir mengambil struk transaksi dari outlet yang sama — berhasil', async () => {
      mockReceiptService.getReceipt.mockResolvedValue({
        transactionId: 'tx-001',
        transactionNumber: 'INV-2026-000001',
        outlet: { outletId: 'out-001', name: 'Outlet A' },
        merchant: { name: 'Kopi Nusantara' },
        customerName: null,
        paymentMethod: 'CASH',
        subtotal: '25000',
        discountTotal: '0',
        taxableAmount: '25000',
        taxTotal: '2750',
        grandTotal: '27500',
        items: [
          {
            name: 'Kopi Susu',
            quantity: 1,
            unitPrice: '25000',
            lineTotal: '25000',
          },
        ],
        createdAt: new Date('2026-08-17T10:00:00Z'),
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/receipts/tx-001')
        .expect(200);

      expect(res.body.data).toMatchObject({
        transactionNumber: 'INV-2026-000001',
        paymentMethod: 'CASH',
        grandTotal: '27500',
      });
      expect(res.body.data.items).toHaveLength(1);
    });

    it('AT-013: kasir mengambil struk transaksi dari outlet berbeda — ditolak', async () => {
      mockReceiptService.getReceipt.mockRejectedValue(
        ApiError.forbidden('Akses ditolak'),
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/receipts/tx-002')
        .expect(403);

      expect(res.body).toHaveProperty('message');
    });
  });
});
