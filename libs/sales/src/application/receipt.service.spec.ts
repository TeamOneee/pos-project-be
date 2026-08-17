import { Prisma } from '@prisma/client';
import { ApiError, AuthUser, PrismaWriteService } from '@app/platform';
import { ReceiptService } from './receipt.service';

const actor: AuthUser = {
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

const makeTx = (overrides: Record<string, unknown> = {}) => ({
  id: 'txn-1',
  merchantId: 'merchant-1',
  outletId: 'outlet-1',
  transactionNumber: 'INV-2026-000001',
  status: 'COMPLETED',
  operatorUserId: 'owner-1',
  paymentMethod: 'CASH',
  paymentStatus: 'CONFIRMED',
  paidAt: new Date('2026-01-01T00:00:00.000Z'),
  subtotal: new Prisma.Decimal('11000.00'),
  total: new Prisma.Decimal('11000.00'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  items: [
    {
      productId: 'product-1',
      productNameSnapshot: 'Es Teh',
      unitPriceSnapshot: new Prisma.Decimal('5500.00'),
      quantity: 2,
      subtotal: new Prisma.Decimal('11000.00'),
    },
  ],
  operator: { id: 'owner-1', name: 'Test Owner', role: 'OWNER' },
  merchant: { name: 'Test Merchant' },
  outlet: { name: 'Outlet Pusat', address: 'Jl. Merdeka' },
  ...overrides,
});

// memverifikasi komposisi receipt dari snapshot transaksi (07 §5.2).
describe('ReceiptService', () => {
  const findUnique = jest.fn();
  const db = {
    transaction: { findUnique },
  } as unknown as Prisma.TransactionClient;
  let service: ReceiptService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReceiptService(db as unknown as PrismaWriteService);
  });

  it('FR-RCP: menyusun detail transaksi dari snapshot tanpa re-query katalog', async () => {
    findUnique.mockResolvedValue(makeTx());
    const result = await service.compose(db, 'txn-1', actor, true);
    expect(result).toMatchObject({
      transaction_id: 'txn-1',
      transaction_number: 'INV-2026-000001',
      subtotal: '11000.00',
      total: '11000.00',
      items: [
        {
          product_id: 'product-1',
          name: 'Es Teh',
          unit_price: '5500.00',
          quantity: 2,
        },
      ],
      payment: { method: 'CASH', status: 'CONFIRMED' },
      merchant_name: 'Test Merchant',
      outlet_name: 'Outlet Pusat',
      outlet_address: 'Jl. Merdeka',
    });
  });

  it('menolak transaksi lintas Merchant', async () => {
    findUnique.mockResolvedValue(makeTx({ merchantId: 'merchant-9' }));
    const error = await service
      .compose(db, 'txn-1', actor)
      .catch((e: unknown) => e);
    expect((error as ApiError).code).toBe('NOT_FOUND');
  });

  it('menolak transaksi yang tidak ada', async () => {
    findUnique.mockResolvedValue(null);
    const error = await service
      .compose(db, 'txn-9', actor)
      .catch((e: unknown) => e);
    expect((error as ApiError).code).toBe('NOT_FOUND');
  });

  it('OD-003: CASHIER hanya dapat membaca transaksinya sendiri', async () => {
    findUnique.mockResolvedValue(makeTx({ operatorUserId: 'owner-1' }));
    const error = await service
      .compose(db, 'txn-1', cashier)
      .catch((e: unknown) => e);
    expect((error as ApiError).code).toBe('FORBIDDEN');
  });
});
