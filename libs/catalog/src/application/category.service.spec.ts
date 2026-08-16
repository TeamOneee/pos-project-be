import { Category, Prisma } from '@prisma/client';
import { AuthUser } from '@app/platform';
import { CategoryService } from './category.service';
import { CategoryRepository } from '../infrastructure/category.repository';

const actor: AuthUser = {
  userId: 'admin-1',
  merchantId: 'merchant-1',
  role: 'ADMIN',
  outletId: null,
};

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'category-1',
  merchantId: 'merchant-1',
  name: 'Makanan',
  isActive: true,
  ...overrides,
});

// memverifikasi lifecycle category tanpa membutuhkan database sungguhan.
// repository dimock agar test fokus pada validasi dan scope service.
describe('CategoryService', () => {
  const repository = {
    findByNameInMerchant: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    findByIdInMerchant: jest.fn(),
    update: jest.fn(),
  };
  let service: CategoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoryService(repository as unknown as CategoryRepository);
  });

  it('FR-CAT-001: Admin dapat membuat Category aktif', async () => {
    repository.findByNameInMerchant.mockResolvedValue(null);
    repository.create.mockResolvedValue(makeCategory());
    const result = await service.create(actor, { name: '  Makanan  ' });
    expect(result).toMatchObject({ name: 'Makanan', isActive: true });
    expect(repository.create).toHaveBeenCalledWith('merchant-1', 'Makanan');
  });

  it('FR-CAT-009: menolak nama Category duplikat pada Merchant sama', async () => {
    repository.findByNameInMerchant.mockResolvedValue(makeCategory());
    const error = await service
      .create(actor, { name: 'Makanan' })
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('VALIDATION_ERROR');
  });

  it('FR-CAT-009: mengubah konflik unique index saat create menjadi validation error', async () => {
    repository.findByNameInMerchant.mockResolvedValue(null);
    repository.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.4.0',
      }),
    );
    const error = await service
      .create(actor, { name: 'Makanan' })
      .catch((value: unknown) => value);
    expect((error as { code: string }).code).toBe('VALIDATION_ERROR');
  });

  it('FR-CAT-004: Cashier hanya menerima Category aktif walau meminta filter false', async () => {
    repository.find.mockResolvedValue([makeCategory()]);
    repository.count.mockResolvedValue(1);
    await service.list(
      { ...actor, role: 'CASHIER', outletId: 'outlet-1' },
      { isActive: false },
      { page: 1, size: 10, skip: 0, take: 10 },
    );
    expect(repository.find).toHaveBeenCalledWith(
      'merchant-1',
      { isActive: true },
      0,
      10,
    );
  });

  it('FR-CAT-001: Category dinonaktifkan, tidak dihapus', async () => {
    repository.findByIdInMerchant.mockResolvedValue(makeCategory());
    repository.update.mockResolvedValue(makeCategory({ isActive: false }));
    const result = await service.update(actor, 'category-1', {
      isActive: false,
    });
    expect(result.isActive).toBe(false);
    expect(repository.update).toHaveBeenCalledWith('category-1', {
      isActive: false,
    });
  });

  it('menolak patch Category kosong', async () => {
    const error = await service
      .update(actor, 'category-1', {})
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('VALIDATION_ERROR');
  });

  it('FR-CAT-003: menolak nama Category yang hanya berisi spasi', async () => {
    const error = await service
      .create(actor, { name: '   ' })
      .catch((e: unknown) => e);
    expect((error as { code: string }).code).toBe('VALIDATION_ERROR');
    expect(repository.create).not.toHaveBeenCalled();
  });
});
