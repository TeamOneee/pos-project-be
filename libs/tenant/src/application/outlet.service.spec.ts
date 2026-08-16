import { Outlet } from '@prisma/client';
import { ApiError, AuthUser } from '@app/platform';
import { OutletService } from './outlet.service';
import { OutletRepository } from '../infrastructure/outlet.repository';
import { TenantAuthorizationService } from './tenant-authorization.service';

const actor: AuthUser = {
  userId: 'owner-1',
  merchantId: 'merchant-1',
  role: 'OWNER',
  outletId: null,
};

const makeOutlet = (overrides: Partial<Outlet> = {}): Outlet => ({
  id: 'outlet-1',
  merchantId: 'merchant-1',
  name: 'Outlet Margonda',
  address: 'Jl. Margonda No. 1',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('OutletService', () => {
  let service: OutletService;
  const outletRepository = {
    findByIdInMerchant: jest.fn(),
    findByNameInMerchant: jest.fn(),
    create: jest.fn((data: Record<string, unknown>) =>
      Promise.resolve(makeOutlet({ ...data })),
    ),
    find: jest.fn(),
    count: jest.fn(),
    update: jest.fn((id: string, data: Record<string, unknown>) =>
      Promise.resolve(makeOutlet({ id, ...data })),
    ),
  };
  const tenantAuthorizationService = {
    assertOutletOwnedByMerchant: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OutletService(
      outletRepository as unknown as OutletRepository,
      tenantAuthorizationService as unknown as TenantAuthorizationService,
    );
  });

  describe('create (FR-TEN-004)', () => {
    it('membuat outlet ACTIVE milik merchant dari JWT', async () => {
      outletRepository.findByNameInMerchant.mockResolvedValue(null);
      const result = await service.create(actor, {
        name: '  Outlet Margonda  ',
        address: '  Jl. Margonda No. 1  ',
      });
      expect(result).toMatchObject({
        merchant_id: 'merchant-1',
        name: 'Outlet Margonda',
        address: 'Jl. Margonda No. 1',
        status: 'ACTIVE',
      });
      expect(outletRepository.findByNameInMerchant).toHaveBeenCalledWith(
        'Outlet Margonda',
        'merchant-1',
        undefined,
      );
      expect(outletRepository.create).toHaveBeenCalledWith({
        merchantId: 'merchant-1',
        name: 'Outlet Margonda',
        address: 'Jl. Margonda No. 1',
      });
    });

    it('address opsional menjadi null', async () => {
      outletRepository.findByNameInMerchant.mockResolvedValue(null);
      await service.create(actor, { name: 'Outlet A' });
      expect(outletRepository.create).toHaveBeenCalledWith({
        merchantId: 'merchant-1',
        name: 'Outlet A',
        address: null,
      });
    });

    it('menolak nama yang sudah dipakai outlet lain (DR-007)', async () => {
      outletRepository.findByNameInMerchant.mockResolvedValue(
        makeOutlet({ id: 'outlet-2' }),
      );
      const err = await service
        .create(actor, { name: 'Outlet Margonda' })
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('VALIDATION_ERROR');
      expect(outletRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('list (FR-TEN-007)', () => {
    it('mengembalikan halaman outlet dengan filter status', async () => {
      outletRepository.find.mockResolvedValue([makeOutlet()]);
      outletRepository.count.mockResolvedValue(1);
      const result = await service.list(
        actor,
        { status: 'ACTIVE' },
        { page: 1, size: 10, skip: 0, take: 10 },
      );
      expect(result).toMatchObject({
        page: 1,
        size: 10,
        total_elements: 1,
      });
      expect(outletRepository.find).toHaveBeenCalledWith(
        'merchant-1',
        { status: 'ACTIVE' },
        0,
        10,
      );
    });
  });

  describe('update (FR-TEN-008)', () => {
    it('menolak patch kosong', async () => {
      const err = await service
        .update(actor, 'outlet-1', {})
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('VALIDATION_ERROR');
    });

    it('NOT_FOUND saat outlet bukan milik merchant (FR-TEN-010)', async () => {
      tenantAuthorizationService.assertOutletOwnedByMerchant.mockRejectedValue(
        ApiError.notFound(),
      );
      const err = await service
        .update(actor, 'outlet-99', { status: 'INACTIVE' })
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('NOT_FOUND');
      expect(outletRepository.update).not.toHaveBeenCalled();
    });

    it('mengupdate field yang diberikan', async () => {
      tenantAuthorizationService.assertOutletOwnedByMerchant.mockResolvedValue(
        makeOutlet(),
      );
      outletRepository.findByNameInMerchant.mockResolvedValue(null);
      const result = await service.update(actor, 'outlet-1', {
        name: '  Outlet Baru  ',
        status: 'INACTIVE',
      });
      expect(result).toMatchObject({ name: 'Outlet Baru', status: 'INACTIVE' });
      expect(outletRepository.findByNameInMerchant).toHaveBeenCalledWith(
        'Outlet Baru',
        'merchant-1',
        'outlet-1',
      );
      expect(outletRepository.update).toHaveBeenCalledWith('outlet-1', {
        name: 'Outlet Baru',
        status: 'INACTIVE',
      });
    });

    it('menolak rename ke nama yang sudah dipakai (DR-007)', async () => {
      tenantAuthorizationService.assertOutletOwnedByMerchant.mockResolvedValue(
        makeOutlet(),
      );
      outletRepository.findByNameInMerchant.mockResolvedValue(
        makeOutlet({ id: 'outlet-2', name: 'Outlet Baru' }),
      );
      const err = await service
        .update(actor, 'outlet-1', { name: 'Outlet Baru' })
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('VALIDATION_ERROR');
      expect(outletRepository.update).not.toHaveBeenCalled();
    });

    it('menolak aktivasi dengan nama bentrok outlet lain (07 §2.2)', async () => {
      tenantAuthorizationService.assertOutletOwnedByMerchant.mockResolvedValue(
        makeOutlet({ status: 'INACTIVE' }),
      );
      outletRepository.findByNameInMerchant.mockResolvedValue(
        makeOutlet({ id: 'outlet-2', name: 'Outlet Margonda' }),
      );
      const err = await service
        .update(actor, 'outlet-1', { status: 'ACTIVE' })
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('VALIDATION_ERROR');
      expect(outletRepository.findByNameInMerchant).toHaveBeenCalledWith(
        'Outlet Margonda',
        'merchant-1',
        'outlet-1',
      );
      expect(outletRepository.update).not.toHaveBeenCalled();
    });

    it('mengizinkan aktivasi bila nama tidak bentrok', async () => {
      tenantAuthorizationService.assertOutletOwnedByMerchant.mockResolvedValue(
        makeOutlet({ status: 'INACTIVE' }),
      );
      outletRepository.findByNameInMerchant.mockResolvedValue(null);
      const result = await service.update(actor, 'outlet-1', {
        status: 'ACTIVE',
      });
      expect(result).toMatchObject({ status: 'ACTIVE' });
      expect(outletRepository.update).toHaveBeenCalledWith('outlet-1', {
        status: 'ACTIVE',
      });
    });
  });
});
