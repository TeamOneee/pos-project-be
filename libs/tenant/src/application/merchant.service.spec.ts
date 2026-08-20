import { Merchant } from '@prisma/client';
import { AuthUser } from '@app/platform';
import { MerchantService } from './merchant.service';
import { MerchantRepository } from '../infrastructure/merchant.repository';

const actor: AuthUser = {
  userId: 'owner-1',
  merchantId: 'merchant-1',
  role: 'OWNER',
  outletId: null,
};

const makeMerchant = (overrides: Partial<Merchant> = {}): Merchant => ({
  id: 'merchant-1',
  ownerUserId: 'owner-1',
  name: 'Warung Budi',
  timezone: 'Asia/Jakarta',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('MerchantService', () => {
  let service: MerchantService;
  const merchantRepository = {
    findById: jest.fn(),
    update: jest.fn((id: string, data: Record<string, unknown>) =>
      Promise.resolve(makeMerchant({ id, ...data })),
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MerchantService(
      merchantRepository as unknown as MerchantRepository,
    );
  });

  describe('getProfile (FR-TEN-001-003)', () => {
    it('mengembalikan profil merchant dari klaim JWT', async () => {
      merchantRepository.findById.mockResolvedValue(makeMerchant());
      const result = await service.getProfile(actor);
      expect(result).toEqual({
        id: 'merchant-1',
        name: 'Warung Budi',
        timezone: 'Asia/Jakarta',
        status: 'ACTIVE',
      });
      expect(merchantRepository.findById).toHaveBeenCalledWith('merchant-1');
    });

    it('NOT_FOUND saat merchant tidak ada (FR-TEN-010)', async () => {
      merchantRepository.findById.mockResolvedValue(null);
      const err = await service.getProfile(actor).catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('NOT_FOUND');
    });
  });

  describe('updateProfile (FR-TEN-011)', () => {
    it('mengubah nama merchant', async () => {
      const result = await service.updateProfile(actor, {
        name: '  Warung Baru  ',
      });
      expect(result).toMatchObject({ name: 'Warung Baru' });
      expect(merchantRepository.update).toHaveBeenCalledWith('merchant-1', {
        name: 'Warung Baru',
      });
    });

    it('menolak patch kosong', async () => {
      const err = await service
        .updateProfile(actor, {})
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('VALIDATION_ERROR');
    });
  });
});
