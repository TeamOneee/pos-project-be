// memverifikasi dispatch HTTP ke CategoryService pada CategoryController.
import { AuthUser } from '@app/platform';
import { CategoryService } from '../application/category.service';
import { CategoryController } from './category.controller';

function makeMockCategoryService() {
  return { create: jest.fn(), list: jest.fn() };
}

function makeActor(overrides?: Partial<AuthUser>): AuthUser {
  return {
    userId: 'user-001',
    role: 'OWNER',
    merchantId: 'mch-001',
    outletId: null,
    ...overrides,
  };
}

describe('CategoryController', () => {
  let controller: CategoryController;
  let mockService: ReturnType<typeof makeMockCategoryService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockService = makeMockCategoryService();
    controller = new CategoryController(
      mockService as unknown as CategoryService,
    );
  });

  describe('POST /categories', () => {
    it('mendelegasikan ke CategoryService.create', async () => {
      mockService.create.mockResolvedValue({ id: 'cat-001', name: 'Minuman' });

      const result = await controller.create(makeActor(), {
        name: 'Minuman',
      });

      expect(mockService.create).toHaveBeenCalledWith(makeActor(), {
        name: 'Minuman',
      });
      expect(result).toMatchObject({ id: 'cat-001', name: 'Minuman' });
    });
  });

  describe('GET /categories', () => {
    it('mendelegasikan ke CategoryService.list', async () => {
      mockService.list.mockResolvedValue({
        content: [],
        page: 1,
        size: 10,
        total_elements: 0,
      });

      const result = await controller.list(
        makeActor(),
        { is_active: 'true' } as never,
        { page: 1, size: 10, skip: 0, take: 10 },
      );

      expect(mockService.list).toHaveBeenCalledWith(
        makeActor(),
        { isActive: 'true' },
        expect.anything(),
      );
      expect(result).toMatchObject({ total_elements: 0 });
    });
  });
});
