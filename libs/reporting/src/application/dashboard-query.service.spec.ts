import { DashboardQueryService } from './dashboard-query.service';
import { ReportingProjectionReadRepository } from '../infrastructure/reporting-projection-read.repository';

// memverifikasi tenant scope dan pemilihan query projection dari application layer.
describe('DashboardQueryService', () => {
  const repository = { findSales: jest.fn() };
  const catalog = { getSellableProducts: jest.fn() };
  const tenant = { getContext: jest.fn() };
  let service: DashboardQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findSales.mockResolvedValue([]);
    catalog.getSellableProducts.mockResolvedValue([]);
    tenant.getContext.mockResolvedValue({
      timezone: 'Asia/Jakarta',
      outlets: [],
    });
    service = new DashboardQueryService(
      repository as unknown as ReportingProjectionReadRepository,
      catalog,
      tenant,
    );
  });

  it('FR-REP-009: meneruskan merchant dan outlet ke seluruh query projection', async () => {
    await service.getTopProducts({
      merchantId: 'merchant-1',
      outletId: 'outlet-1',
      dateFrom: new Date('2026-08-01T00:00:00.000Z'),
      dateTo: new Date('2026-08-31T23:59:59.999Z'),
    });
    expect(tenant.getContext).toHaveBeenCalledWith('merchant-1', 'outlet-1');
    expect(repository.findSales).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: 'merchant-1',
        outletId: 'outlet-1',
      }),
    );
  });

  it('menghindari query product dan catalog untuk endpoint summary', async () => {
    await service.getSummary({
      merchantId: 'merchant-1',
      dateFrom: new Date('2026-08-01T00:00:00.000Z'),
      dateTo: new Date('2026-08-31T23:59:59.999Z'),
    });
    expect(repository.findSales).toHaveBeenCalledTimes(1);
    expect(catalog.getSellableProducts).not.toHaveBeenCalled();
  });

  it('menolak periode terbalik sebelum membaca context atau projection', async () => {
    await expect(
      service.getSummary({
        merchantId: 'merchant-1',
        dateFrom: new Date('2026-08-31T00:00:00.000Z'),
        dateTo: new Date('2026-08-01T00:00:00.000Z'),
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(tenant.getContext).not.toHaveBeenCalled();
    expect(repository.findSales).not.toHaveBeenCalled();
  });

  it('menolak outlet lintas merchant sebelum membaca projection', async () => {
    tenant.getContext.mockRejectedValue({ code: 'NOT_FOUND' });
    await expect(
      service.getSummary({
        merchantId: 'merchant-1',
        outletId: 'outlet-other',
        dateFrom: new Date('2026-08-01T00:00:00.000Z'),
        dateTo: new Date('2026-08-31T00:00:00.000Z'),
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(repository.findSales).not.toHaveBeenCalled();
  });
});
