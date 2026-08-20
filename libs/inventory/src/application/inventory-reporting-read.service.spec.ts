import { Test, TestingModule } from '@nestjs/testing';
import { InventoryReportingReadService } from './inventory-reporting-read.service';
import { InventoryReportingRepository } from '../infrastructure/inventory-reporting.repository';
import { InventoryReportingQuery } from './ports/inventory-reporting-read.port';

describe('InventoryReportingReadService', () => {
  let service: InventoryReportingReadService;
  let repository: {
    getOperationalData: jest.Mock;
    listLowStock: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      getOperationalData: jest.fn().mockResolvedValue({
        inventoryItemCount: 10,
        lowStockItemCount: 2,
        outOfStockItemCount: 1,
      }),
      listLowStock: jest.fn().mockResolvedValue([
        {
          productId: 'prod-1',
          name: 'Kopi Susu',
          outletId: 'outlet-1',
          outletName: 'Cabang Pusat',
          quantity: 2,
          baseLowStockThreshold: 5,
          lowStockThresholdOverride: null,
          effectiveLowStockThreshold: 5,
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryReportingReadService,
        { provide: InventoryReportingRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<InventoryReportingReadService>(
      InventoryReportingReadService,
    );
  });

  it('should delegate getOperationalData to repository', async () => {
    const query: InventoryReportingQuery = {
      merchantId: 'merchant-1',
      outletId: 'outlet-1',
    };

    const result = await service.getOperationalData(query);

    expect(repository.getOperationalData).toHaveBeenCalledWith(query);
    expect(result.inventoryItemCount).toBe(10);
    expect(result.lowStockItemCount).toBe(2);
    expect(result.outOfStockItemCount).toBe(1);
  });

  it('should delegate listLowStock to repository', async () => {
    const query: InventoryReportingQuery = {
      merchantId: 'merchant-1',
    };

    const result = await service.listLowStock(query);

    expect(repository.listLowStock).toHaveBeenCalledWith(query);
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe('prod-1');
    expect(result[0].effectiveLowStockThreshold).toBe(5);
  });
});
