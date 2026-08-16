import { Outlet } from '@prisma/client';
import { AuthUser, PrismaWriteService } from '@app/platform';
import { TenantAuthorizationService } from './tenant-authorization.service';
import { OutletRepository } from '../infrastructure/outlet.repository';

const ownerActor: AuthUser = {
  userId: 'owner-1',
  merchantId: 'merchant-1',
  role: 'OWNER',
  outletId: null,
};

const cashierActor: AuthUser = {
  userId: 'cashier-1',
  merchantId: 'merchant-1',
  role: 'CASHIER',
  outletId: 'outlet-1',
};

const adminActor: AuthUser = {
  userId: 'admin-1',
  merchantId: 'merchant-1',
  role: 'ADMIN',
  outletId: null,
};

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

  describe('assertOutletOwnedByActor (06 §5.5, OD-010)', () => {
    it('OWNER: mengizinkan outlet aktif milik merchant', async () => {
      outletRepository.findByIdInMerchant.mockResolvedValue(makeOutlet());
      await expect(
        service.assertOutletOwnedByActor(ownerActor, 'outlet-1'),
      ).resolves.toBeUndefined();
      expect(outletRepository.findByIdInMerchant).toHaveBeenCalledWith(
        'outlet-1',
        'merchant-1',
      );
    });

    it('OWNER: NOT_FOUND saat outlet nonaktif (FR-TEN-004)', async () => {
      outletRepository.findByIdInMerchant.mockResolvedValue(
        makeOutlet({ status: 'INACTIVE' }),
      );
      const err = await service
        .assertOutletOwnedByActor(ownerActor, 'outlet-1')
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('NOT_FOUND');
    });

    it('CASHIER: mengizinkan outlet tugasnya yang aktif', async () => {
      outletRepository.findByIdInMerchant.mockResolvedValue(makeOutlet());
      await expect(
        service.assertOutletOwnedByActor(cashierActor, 'outlet-1'),
      ).resolves.toBeUndefined();
    });

    it('CASHIER: FORBIDDEN saat outlet bukan outlet tugasnya (OD-010)', async () => {
      const err = await service
        .assertOutletOwnedByActor(cashierActor, 'outlet-9')
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('FORBIDDEN');
      expect(outletRepository.findByIdInMerchant).not.toHaveBeenCalled();
    });

    it('ADMIN: selalu ditolak (OD-010)', async () => {
      const err = await service
        .assertOutletOwnedByActor(adminActor, 'outlet-1')
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('FORBIDDEN');
    });
  });
});
