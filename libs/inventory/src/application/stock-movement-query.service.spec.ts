import { AuthUser } from '@app/platform';
import { StockMovementRepository } from '../infrastructure/stock-movement.repository';
import { StockMovementQueryService } from './stock-movement-query.service';

const actor: AuthUser = {
  userId: 'owner-1',
  merchantId: 'merchant-1',
  role: 'OWNER',
  outletId: null,
};

const makeMovement = (overrides: Record<string, unknown> = {}) => ({
  id: 'move-1',
  merchantId: 'merchant-1',
  outletId: 'outlet-1',
  productId: 'product-1',
  type: 'ADJUSTMENT',
  delta: 100,
  quantityBefore: 0,
  quantityAfter: 100,
  reason: 'Stok awal',
  transactionId: null,
  actorUserId: 'owner-1',
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

const page = { page: 0, size: 20, skip: 0, take: 20 };

// memverifikasi riwayat movement stok (FR-INV-003) dengan filter dan paginasi.
describe('StockMovementQueryService', () => {
  const movementRepo = { findByMerchant: jest.fn(), countByMerchant: jest.fn() };
  let service: StockMovementQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StockMovementQueryService(
      movementRepo as unknown as StockMovementRepository,
    );
  });

  it('memetakan baris movement ke hasil dan total count', async () => {
    movementRepo.findByMerchant.mockResolvedValue([makeMovement()]);
    movementRepo.countByMerchant.mockResolvedValue(1);
    const result = await service.list(actor, {}, page);
    expect(result).toMatchObject({
      total_elements: 1,
      content: [
        {
          id: 'move-1',
          type: 'ADJUSTMENT',
          quantityBefore: 0,
          quantityAfter: 100,
        },
      ],
    });
  });

  it('FR-INV-003: meneruskan filter ke repository dengan scope Merchant', async () => {
    movementRepo.findByMerchant.mockResolvedValue([]);
    movementRepo.countByMerchant.mockResolvedValue(0);
    await service.list(
      actor,
      {
        outletId: 'outlet-1',
        productId: 'product-1',
        type: 'SALE',
        dateFrom: '2026-01-01T00:00:00.000Z',
        dateTo: '2026-01-02T00:00:00.000Z',
      },
      { page: 1, size: 10, skip: 10, take: 10 },
    );
    expect(movementRepo.findByMerchant).toHaveBeenCalledWith(
      'merchant-1',
      {
        outletId: 'outlet-1',
        productId: 'product-1',
        type: 'SALE',
        dateFrom: '2026-01-01T00:00:00.000Z',
        dateTo: '2026-01-02T00:00:00.000Z',
      },
      10,
      10,
    );
    expect(movementRepo.countByMerchant).toHaveBeenCalledWith(
      'merchant-1',
      expect.objectContaining({ type: 'SALE' }),
    );
  });

  it('mengembalikan halaman kosong bila tidak ada riwayat', async () => {
    movementRepo.findByMerchant.mockResolvedValue([]);
    movementRepo.countByMerchant.mockResolvedValue(0);
    const result = await service.list(actor, {}, page);
    expect(result.content).toEqual([]);
    expect(result.total_elements).toBe(0);
  });
});