import { Outlet } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';
import { TenantAuthorizationService } from './tenant-authorization.service';
import { OutletRepository } from '../infrastructure/outlet.repository';

const makeOutlet = (overrides: Partial<Outlet> = {}): Outlet => ({
  id: 'outlet-1',
  merchantId: 'merchant-1',
  name: 'Outlet Margonda',
  address: null,
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('TenantAuthorizationService', () => {
  let service: TenantAuthorizationService;
  const outletRepository = {
    findByIdInMerchant: jest.fn(),
  };
  const prisma = {
    user: { findFirst: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TenantAuthorizationService(
      outletRepository as unknown as OutletRepository,
      prisma as unknown as PrismaWriteService,
    );
  });

  describe('assertOutletOwnedByMerchant (FR-TEN-010)', () => {
    it('mengembalikan outlet bila milik merchant', async () => {
      outletRepository.findByIdInMerchant.mockResolvedValue(makeOutlet());
      const outlet = await service.assertOutletOwnedByMerchant(
        'outlet-1',
        'merchant-1',
      );
      expect(outlet).toMatchObject({ id: 'outlet-1' });
    });

    it('NOT_FOUND saat outlet bukan milik merchant', async () => {
      outletRepository.findByIdInMerchant.mockResolvedValue(null);
      const err = await service
        .assertOutletOwnedByMerchant('outlet-99', 'merchant-1')
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('NOT_FOUND');
    });

    it('NOT_FOUND saat outlet INACTIVE dan requireActive=true (FR-TEN-004)', async () => {
      outletRepository.findByIdInMerchant.mockResolvedValue(
        makeOutlet({ status: 'INACTIVE' }),
      );
      const err = await service
        .assertOutletOwnedByMerchant('outlet-1', 'merchant-1', {
          requireActive: true,
        })
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('NOT_FOUND');
    });

    it('mengizinkan outlet INACTIVE saat requireActive=false', async () => {
      outletRepository.findByIdInMerchant.mockResolvedValue(
        makeOutlet({ status: 'INACTIVE' }),
      );
      const outlet = await service.assertOutletOwnedByMerchant(
        'outlet-1',
        'merchant-1',
      );
      expect(outlet).toMatchObject({ status: 'INACTIVE' });
    });
  });

  describe('assertUserBelongsToMerchant (FR-TEN-010)', () => {
    it('pass saat user milik merchant', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
      await expect(
        service.assertUserBelongsToMerchant('user-1', 'merchant-1'),
      ).resolves.toBeUndefined();
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-1', merchantId: 'merchant-1' },
        select: { id: true },
      });
    });

    it('NOT_FOUND saat user bukan milik merchant', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      const err = await service
        .assertUserBelongsToMerchant('user-99', 'merchant-1')
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('NOT_FOUND');
    });
  });
});
