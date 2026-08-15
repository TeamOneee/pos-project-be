import { Prisma } from '@prisma/client';
import { PrismaReadService } from '@app/platform';
import { ReportingProjectionReadRepository } from './reporting-projection-read.repository';

// memverifikasi query replica dan pembacaan product dari metrics projection.
describe('ReportingProjectionReadRepository', () => {
  const reportingProjection = { findMany: jest.fn() };
  const prisma = { reportingProjection };
  const repository = new ReportingProjectionReadRepository(
    prisma as unknown as PrismaReadService,
  );
  const request = {
    merchantId: 'merchant-1',
    outletId: 'outlet-1',
    dateFrom: new Date('2026-08-01T00:00:00.000Z'),
    dateTo: new Date('2026-08-31T23:59:59.999Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    reportingProjection.findMany.mockResolvedValue([]);
  });

  it('FR-REP-009: membatasi projection sesuai merchant, outlet, dan periode', async () => {
    await repository.findSales(request);
    expect(reportingProjection.findMany).toHaveBeenCalledWith({
      where: {
        merchantId: 'merchant-1',
        outletId: 'outlet-1',
        granularity: 'HOUR',
        periodStart: { gte: request.dateFrom, lte: request.dateTo },
      },
      orderBy: { periodStart: 'asc' },
    });
  });

  it('FR-REP-003B: membaca aggregate product dari metrics json', async () => {
    reportingProjection.findMany.mockResolvedValue([
      {
        id: 'projection-1',
        merchantId: 'merchant-1',
        outletId: 'outlet-1',
        periodStart: request.dateFrom,
        periodEnd: request.dateTo,
        granularity: 'HOUR',
        omzet: new Prisma.Decimal('20000.00'),
        transactionCount: BigInt(1),
        unitsSold: new Prisma.Decimal('2'),
        metrics: {
          products: {
            'product-1': {
              name: 'Produk',
              unitsSold: '2',
              omzet: '20000.00',
            },
          },
        },
        sourceWatermark: request.dateTo,
        updatedAt: request.dateTo,
      },
    ]);
    const result = await repository.findSales(request);
    expect(result[0]?.products[0]).toEqual({
      productId: 'product-1',
      productNameSnapshot: 'Produk',
      unitsSold: BigInt(2),
      omzet: '20000.00',
    });
  });
});
