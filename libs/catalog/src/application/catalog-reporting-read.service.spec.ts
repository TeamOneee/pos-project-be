import { CatalogReportingReadService } from './catalog-reporting-read.service';
import { CatalogReportingRepository } from '../infrastructure/catalog-reporting.repository';

// memverifikasi current catalog untuk product aktif dengan nol penjualan.
describe('CatalogReportingReadService', () => {
  const repository = {
    findSellableProducts: jest.fn(),
    findCatalogSummary: jest.fn(),
  };
  const service = new CatalogReportingReadService(
    repository as unknown as CatalogReportingRepository,
  );

  it('FR-REP-003B: meneruskan product yang efektif dapat dijual', async () => {
    repository.findSellableProducts.mockResolvedValue([
      { id: 'product-1', name: 'Produk' },
    ]);
    await expect(service.getSellableProducts('merchant-1')).resolves.toEqual([
      { id: 'product-1', name: 'Produk' },
    ]);
    expect(repository.findSellableProducts).toHaveBeenCalledWith('merchant-1');
  });

  it('FR-REP-007: meneruskan ringkasan operasional katalog', async () => {
    const summary = {
      activeProductCount: 10,
      inactiveProductCount: 2,
      inactiveCategoryCount: 1,
    };
    repository.findCatalogSummary.mockResolvedValue(summary);
    await expect(
      service.getCatalogReportingSummary('merchant-1'),
    ).resolves.toEqual(summary);
    expect(repository.findCatalogSummary).toHaveBeenCalledWith('merchant-1');
  });
});
