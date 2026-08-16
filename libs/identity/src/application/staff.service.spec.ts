import { User } from '@prisma/client';
import { AuthUser } from '@app/platform';
import { StaffService } from './staff.service';
import { PasswordService } from './password.service';
import { OutletRepository } from '../infrastructure/outlet.repository';
import { UserRepository } from '../infrastructure/user.repository';

const actor: AuthUser = {
  userId: 'owner-1',
  merchantId: 'merchant-1',
  role: 'OWNER',
  outletId: null,
};

const makeStaff = (overrides: Partial<User> = {}): User => ({
  id: 'staff-1',
  merchantId: 'merchant-1',
  outletId: null,
  emailNormalized: 'sari@warungku.id',
  emailOriginal: 'Sari@Warungku.id',
  passwordHash: 'argon2-hash',
  fullName: 'Sari',
  role: 'ADMIN',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
});

const baseCreate = {
  name: 'Sari',
  email: 'Sari@Warungku.id',
  password: 'InitPass1!',
  role: 'ADMIN' as const,
};

describe('StaffService', () => {
  let service: StaffService;
  const userRepository = {
    findByEmail: jest.fn(),
    findStaffById: jest.fn(),
    findStaff: jest.fn(),
    countStaff: jest.fn(),
    updateStaff: jest.fn((id: string, data: Record<string, unknown>) =>
      Promise.resolve(makeStaff({ id, ...data })),
    ),
    create: jest.fn((data: Record<string, unknown>) =>
      Promise.resolve(makeStaff({ ...data })),
    ),
  };
  const outletRepository = {
    findActiveInMerchant: jest.fn(),
  };
  const passwordService = {
    hash: jest.fn(() => Promise.resolve('argon2-hash')),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StaffService(
      userRepository as unknown as UserRepository,
      outletRepository as unknown as OutletRepository,
      passwordService as unknown as PasswordService,
    );
  });

  describe('create (FR-AUTH-011/012)', () => {
    it('membuat ADMIN tanpa outlet', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      const result = await service.create(actor, baseCreate);
      expect(result).toMatchObject({ role: 'ADMIN', outlet_id: null });
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantId: 'merchant-1',
          outletId: null,
          role: 'ADMIN',
        }),
      );
    });

    it('menolak ADMIN yang membawa outlet_id', async () => {
      const err = await service
        .create(actor, { ...baseCreate, outlet_id: 'o-1' })
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('VALIDATION_ERROR');
    });

    it('menolak CASHIER tanpa outlet', async () => {
      const err = await service
        .create(actor, { ...baseCreate, role: 'CASHIER' })
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('VALIDATION_ERROR');
    });

    it('mengembalikan NOT_FOUND bila outlet bukan milik merchant (FR-TEN-010)', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      outletRepository.findActiveInMerchant.mockResolvedValue(null);
      const err = await service
        .create(actor, { ...baseCreate, role: 'CASHIER', outlet_id: 'o-99' })
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('NOT_FOUND');
    });

    it('menolak email duplikat (FR-AUTH-013)', async () => {
      userRepository.findByEmail.mockResolvedValue(makeStaff());
      const err = await service
        .create(actor, baseCreate)
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('EMAIL_ALREADY_REGISTERED');
    });
  });

  describe('update (FR-AUTH-014)', () => {
    it('menolak patch kosong', async () => {
      const err = await service
        .update(actor, 'staff-1', {})
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('VALIDATION_ERROR');
    });

    it('menolak staf yang tidak ditemukan', async () => {
      userRepository.findStaffById.mockResolvedValue(null);
      const err = await service
        .update(actor, 'staff-9', { status: 'INACTIVE' })
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('NOT_FOUND');
    });

    it('mengosongkan outlet saat role berubah menjadi ADMIN', async () => {
      userRepository.findStaffById.mockResolvedValue(
        makeStaff({ id: 'staff-1', role: 'CASHIER', outletId: 'o-1' }),
      );
      await service.update(actor, 'staff-1', {
        role: 'ADMIN',
        outlet_id: null,
      });
      expect(userRepository.updateStaff).toHaveBeenCalledWith(
        'staff-1',
        expect.objectContaining({ role: 'ADMIN', outletId: null }),
      );
    });

    it('memvalidasi outlet CASHIER milik merchant yang sama', async () => {
      userRepository.findStaffById.mockResolvedValue(
        makeStaff({ id: 'staff-1', role: 'ADMIN', outletId: null }),
      );
      outletRepository.findActiveInMerchant.mockResolvedValue(null);
      const err = await service
        .update(actor, 'staff-1', { role: 'CASHIER', outlet_id: 'o-99' })
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('NOT_FOUND');
    });

    it('menolak ADMIN dengan outlet_id non-kosong', async () => {
      userRepository.findStaffById.mockResolvedValue(makeStaff());
      const err = await service
        .update(actor, 'staff-1', { outlet_id: 'o-1' })
        .catch((e: unknown) => e);
      expect((err as { code: string }).code).toBe('VALIDATION_ERROR');
    });
  });

  describe('list', () => {
    it('mengembalikan halaman staf (FR-TEN-005/006)', async () => {
      userRepository.findStaff.mockResolvedValue([makeStaff()]);
      userRepository.countStaff.mockResolvedValue(1);
      const result = await service.list(
        actor,
        {},
        { page: 1, size: 10, skip: 0, take: 10 },
      );
      expect(result).toMatchObject({ page: 1, size: 10, total_elements: 1 });
      expect(userRepository.findStaff).toHaveBeenCalledWith(
        'merchant-1',
        {},
        0,
        10,
      );
    });
  });
});
