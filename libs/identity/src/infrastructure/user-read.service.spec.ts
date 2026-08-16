import { User } from '@prisma/client';
import { UserReadService } from './user-read.service';
import { UserRepository } from './user.repository';

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  merchantId: 'merchant-1',
  outletId: null,
  name: 'Budi',
  email: 'budi@warungku.id',
  passwordHash: 'argon2-hash',
  role: 'OWNER',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
});

// Port read untuk isolasi tenant lintas modul (06 §3.2/5.5).
describe('UserReadService', () => {
  let service: UserReadService;
  const userRepository = {
    findByIdInMerchant: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserReadService(userRepository as unknown as UserRepository);
  });

  it('true saat user milik merchant', async () => {
    userRepository.findByIdInMerchant.mockResolvedValue(makeUser());
    await expect(
      service.userBelongsToMerchant('user-1', 'merchant-1'),
    ).resolves.toBe(true);
    expect(userRepository.findByIdInMerchant).toHaveBeenCalledWith(
      'user-1',
      'merchant-1',
    );
  });

  it('false saat user bukan milik merchant', async () => {
    userRepository.findByIdInMerchant.mockResolvedValue(null);
    await expect(
      service.userBelongsToMerchant('user-99', 'merchant-1'),
    ).resolves.toBe(false);
  });
});
