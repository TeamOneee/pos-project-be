import { Prisma } from '@prisma/client';
import { InventoryRepository } from '../infrastructure/inventory.repository';
import { StockMovementRepository } from '../infrastructure/stock-movement.repository';
import { StockReservationResult } from './stock-reservation.port';
import { StockReservationService } from './stock-reservation.service';

const tx = {
  inventory: { findMany: jest.fn() },
} as unknown as Prisma.TransactionClient;

const baseCtx = {
  merchantId: 'merchant-1',
  outletId: 'outlet-1',
  transactionId: 'txn-1',
  actorUserId: 'cashier-1',
  tx,
};

const asFailure = (
  result: StockReservationResult,
): {
  ok: false;
  insufficient: Array<{
    productId: string;
    requested: number;
    available: number;
  }>;
} =>
  result as {
    ok: false;
    insufficient: Array<{
      productId: string;
      requested: number;
      available: number;
    }>;
  };

// memverifikasi reservasi stok saat checkout (FR-INV-004, AT-004):
// pengurangan atomik batch dan pencatatan movement SALE.
describe('StockReservationService', () => {
  const inventoryRepo = { bulkUpdateQuantityConditional: jest.fn() };
  const movementRepo = { createMany: jest.fn() };
  let service: StockReservationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StockReservationService(
      inventoryRepo as unknown as InventoryRepository,
      movementRepo as unknown as StockMovementRepository,
    );
  });

  it('mengembalikan insufficient saat semua line gagal', async () => {
    inventoryRepo.bulkUpdateQuantityConditional.mockResolvedValue([]);
    (tx.inventory.findMany as jest.Mock).mockResolvedValue([]);
    const result = await service.reserveForSale({
      ...baseCtx,
      lines: [{ productId: 'product-1', quantity: 3 }],
    });
    expect(asFailure(result)).toMatchObject({
      ok: false,
      insufficient: [{ productId: 'product-1', requested: 3, available: 0 }],
    });
    expect(inventoryRepo.bulkUpdateQuantityConditional).toHaveBeenCalledWith(
      tx,
      {
        merchantId: 'merchant-1',
        outletId: 'outlet-1',
        lines: [{ productId: 'product-1', delta: -3 }],
      },
    );
    expect(movementRepo.createMany).not.toHaveBeenCalled();
  });

  it('mengembalikan insufficient saat stok tidak mencukupi', async () => {
    inventoryRepo.bulkUpdateQuantityConditional.mockResolvedValue([]);
    (tx.inventory.findMany as jest.Mock).mockResolvedValue([
      { productId: 'product-1', quantity: 2 },
    ]);
    const result = await service.reserveForSale({
      ...baseCtx,
      lines: [{ productId: 'product-1', quantity: 3 }],
    });
    expect(asFailure(result).insufficient[0]).toMatchObject({
      productId: 'product-1',
      requested: 3,
      available: 2,
    });
  });

  it('FR-INV-004: mengurangi stok dan mencatat movement SALE saat cukup', async () => {
    inventoryRepo.bulkUpdateQuantityConditional.mockResolvedValue([
      { productId: 'product-1', quantityBefore: 10, quantityAfter: 7 },
    ]);
    movementRepo.createMany.mockResolvedValue({ count: 1 });

    const result = await service.reserveForSale({
      ...baseCtx,
      lines: [{ productId: 'product-1', quantity: 3 }],
    });

    expect(result).toEqual({ ok: true });
    expect(inventoryRepo.bulkUpdateQuantityConditional).toHaveBeenCalledWith(
      tx,
      {
        merchantId: 'merchant-1',
        outletId: 'outlet-1',
        lines: [{ productId: 'product-1', delta: -3 }],
      },
    );
    expect(movementRepo.createMany).toHaveBeenCalledWith(
      tx,
      expect.arrayContaining([
        expect.objectContaining({
          type: 'SALE',
          delta: -3,
          quantityBefore: 10,
          quantityAfter: 7,
          transactionId: 'txn-1',
          actorUserId: 'cashier-1',
        }),
      ]),
    );
  });

  it('menolak line yang gagal update atomik', async () => {
    inventoryRepo.bulkUpdateQuantityConditional.mockResolvedValue([]);
    (tx.inventory.findMany as jest.Mock).mockResolvedValue([
      { productId: 'product-1', quantity: 10 },
    ]);
    const result = await service.reserveForSale({
      ...baseCtx,
      lines: [{ productId: 'product-1', quantity: 3 }],
    });
    expect(asFailure(result).insufficient[0]).toMatchObject({ available: 10 });
    expect(movementRepo.createMany).not.toHaveBeenCalled();
  });

  it('menggabungkan hasil beberapa line dengan stok parsial', async () => {
    inventoryRepo.bulkUpdateQuantityConditional.mockResolvedValue([
      { productId: 'product-1', quantityBefore: 10, quantityAfter: 9 },
    ]);
    (tx.inventory.findMany as jest.Mock).mockResolvedValue([
      { productId: 'product-2', quantity: 2 },
    ]);
    const result = await service.reserveForSale({
      ...baseCtx,
      lines: [
        { productId: 'product-1', quantity: 1 },
        { productId: 'product-2', quantity: 99 },
      ],
    });
    expect(asFailure(result).insufficient).toEqual([
      { productId: 'product-2', requested: 99, available: 2 },
    ]);
    expect(movementRepo.createMany).not.toHaveBeenCalled();
  });
});
