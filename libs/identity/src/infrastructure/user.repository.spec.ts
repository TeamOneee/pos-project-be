// memverifikasi operasi CRUD dan query UserRepository pada identity.
import { AccountStatus, UserRole } from '@prisma/client';
import { PrismaReadService, PrismaWriteService } from '@app/platform';
import {
  UserRepository,
  CreateUserData,
  StaffListFilter,
} from './user.repository';

function makeMockPrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };
}

function makeCreateData(overrides?: Partial<CreateUserData>): CreateUserData {
  return {
    merchantId: 'mch-001',
    outletId: null,
    name: 'Budi',
    email: 'budi@test.com',
    passwordHash: 'bcrypt-hash',
    role: UserRole.OWNER,
    status: AccountStatus.ACTIVE,
    ...overrides,
  };
}

describe('UserRepository', () => {
  let repo: UserRepository;
  let mockReadPrisma: ReturnType<typeof makeMockPrisma>;
  let mockWritePrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadPrisma = makeMockPrisma();
    mockWritePrisma = makeMockPrisma();
    repo = new UserRepository(
      mockReadPrisma as unknown as PrismaReadService,
      mockWritePrisma as unknown as PrismaWriteService,
    );
  });

  describe('findByEmail', () => {
    it('mengembalikan user berdasarkan email', async () => {
      const user = { id: 'u-1', email: 'budi@test.com' };
      (mockReadPrisma.user.findUnique as jest.Mock).mockResolvedValue(user);

      const result = await repo.findByEmail('budi@test.com');

      expect(mockReadPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'budi@test.com' },
      });
      expect(result).toBe(user);
    });

    it('mengembalikan null jika email tidak ditemukan', async () => {
      (mockReadPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repo.findByEmail('unknown@test.com');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('mengembalikan user berdasarkan id', async () => {
      (mockReadPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u-1',
      });

      const result = await repo.findById('u-1');

      expect(mockReadPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'u-1' },
      });
      expect(result).toEqual({ id: 'u-1' });
    });
  });

  describe('findByIdInMerchant', () => {
    it('mengembalikan user jika milik merchant', async () => {
      (mockReadPrisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'u-1',
        merchantId: 'mch-001',
      });

      const result = await repo.findByIdInMerchant('u-1', 'mch-001');

      expect(mockReadPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'u-1', merchantId: 'mch-001' },
      });
      expect(result).toBeTruthy();
    });
  });

  describe('findStaffById', () => {
    it('hanya mencari user dengan role ADMIN atau CASHIER', async () => {
      (mockReadPrisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'u-1',
        role: 'ADMIN',
      });

      await repo.findStaffById('u-1', 'mch-001');

      expect(mockReadPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'u-1',
          merchantId: 'mch-001',
          role: { in: ['ADMIN', 'CASHIER'] },
        },
      });
    });
  });

  describe('findStaff', () => {
    it('mengembalikan daftar staff dengan order by desc', async () => {
      const filter: StaffListFilter = { role: 'CASHIER', status: 'ACTIVE' };
      (mockReadPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repo.findStaff('mch-001', filter, 0, 10);

      expect(mockReadPrisma.user.findMany).toHaveBeenCalledWith({
        where: { merchantId: 'mch-001', role: 'CASHIER', status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual([]);
    });
  });

  describe('countStaff', () => {
    it('menghitung jumlah staff berdasarkan filter', async () => {
      const filter: StaffListFilter = {};
      (mockReadPrisma.user.count as jest.Mock).mockResolvedValue(5);

      const result = await repo.countStaff('mch-001', filter);

      expect(mockReadPrisma.user.count).toHaveBeenCalledWith({
        where: { merchantId: 'mch-001', role: undefined, status: undefined },
      });
      expect(result).toBe(5);
    });
  });

  describe('updateStaff', () => {
    it('mengupdate user berdasarkan id', async () => {
      const data = { name: 'Budi Baru' };
      (mockWritePrisma.user.update as jest.Mock).mockResolvedValue({
        id: 'u-1',
        name: 'Budi Baru',
      });

      const result = await repo.updateStaff('u-1', data);

      expect(mockWritePrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data,
      });
      expect(result).toMatchObject({ name: 'Budi Baru' });
    });
  });

  describe('create', () => {
    it('membuat user baru', async () => {
      const data = makeCreateData();
      const created = { id: 'u-1', ...data };
      (mockWritePrisma.user.create as jest.Mock).mockResolvedValue(created);

      const result = await repo.create(data);

      expect(mockWritePrisma.user.create).toHaveBeenCalledWith({ data });
      expect(result).toBe(created);
    });
  });
});
