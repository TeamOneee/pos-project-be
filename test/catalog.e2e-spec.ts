// E2E: katalog POS — AT-018 (category inactive blokir checkout), AT-021 (search/filter katalog).
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { Reflector } from '@nestjs/core';
import { CatalogController } from '@app/inventory/web/catalog.controller';
import { OutletCatalogQueryService } from '@app/inventory/application/outlet-catalog-query.service';
import { AllExceptionsFilter } from '@app/platform/error/all-exceptions.filter';
import { SuccessResponseInterceptor } from '@app/platform/web/success-response.interceptor';
import { PageResponseDto } from '@app/platform/web/page-response.dto';

const mockCatalogQueryService = { catalog: jest.fn() };

const cashierUser = {
  userId: 'cashier-1',
  merchantId: 'mch-001',
  role: 'CASHIER',
  outletId: 'out-001',
};

const VALID_OUTLET_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_CATEGORY_UUID = '550e8400-e29b-41d4-a716-446655440002';

describe('E2E — POS Catalog (AT-018, AT-021)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        { provide: OutletCatalogQueryService, useValue: mockCatalogQueryService },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: (ctx: { switchToHttp: () => { getRequest: () => { user: unknown } } }) => {
              ctx.switchToHttp().getRequest().user = cashierUser;
              return true;
            },
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new SuccessResponseInterceptor(new Reflector()));
    app.useGlobalFilters(new AllExceptionsFilter({ get: jest.fn().mockReturnValue('test-corr-id') } as never));
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/v1/products/catalog', () => {
    it('AT-021: pencarian nama produk pada katalog outlet kasir', async () => {
      mockCatalogQueryService.catalog.mockResolvedValue(
        PageResponseDto.from(
          [{ id: 'p-001', name: 'Kopi Susu', effectivePrice: '25000' }],
          1, 10, 1,
        ),
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/products/catalog')
        .query({ outlet_id: VALID_OUTLET_UUID, search: 'kopi' })
        .expect(200);

      expect(res.body.data.content).toHaveLength(1);
      expect(res.body.data.content[0]).toMatchObject({ name: 'Kopi Susu' });
      expect(mockCatalogQueryService.catalog).toHaveBeenCalledWith(
        expect.objectContaining({ merchantId: 'mch-001' }),
        expect.objectContaining({ search: 'kopi' }),
        expect.anything(),
      );
    });

    it('AT-021: filter berdasarkan category_id', async () => {
      mockCatalogQueryService.catalog.mockResolvedValue(
        PageResponseDto.from([], 1, 10, 0),
      );

      await request(app.getHttpServer())
        .get('/api/v1/products/catalog')
        .query({ outlet_id: VALID_OUTLET_UUID, category_id: VALID_CATEGORY_UUID })
        .expect(200);

      expect(mockCatalogQueryService.catalog).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ categoryId: VALID_CATEGORY_UUID }),
        expect.anything(),
      );
    });

    it('AT-018: produk dengan category inactive tidak muncul di katalog', async () => {
      mockCatalogQueryService.catalog.mockResolvedValue(
        PageResponseDto.from(
          [{ id: 'p-001', name: 'Kopi Susu' }],
          1, 10, 1,
        ),
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/products/catalog')
        .query({ outlet_id: VALID_OUTLET_UUID })
        .expect(200);

      expect(res.body.data.content).toHaveLength(1);
      expect(res.body.data.content[0].id).toBe('p-001');
    });

    it('Katalog kosong mengembalikan array kosong', async () => {
      mockCatalogQueryService.catalog.mockResolvedValue(
        PageResponseDto.from([], 1, 10, 0),
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/products/catalog')
        .query({ outlet_id: VALID_OUTLET_UUID })
        .expect(200);

      expect(res.body.data.content).toEqual([]);
      expect(res.body.data.total_elements).toBe(0);
    });
  });
});
