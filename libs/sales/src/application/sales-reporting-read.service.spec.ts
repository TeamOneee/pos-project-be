import { Test, TestingModule } from '@nestjs/testing';
import { SalesReportingReadService } from './sales-reporting-read.service';
import { SalesReportingRepository } from '../infrastructure/sales-reporting.repository';
import { SalesReportingQuery } from './ports/sales-reporting-read.port';

describe('SalesReportingReadService', () => {
  let service: SalesReportingReadService;
  let repository: { findCompletedTransactionFacts: jest.Mock };

  beforeEach(async () => {
    repository = {
      findCompletedTransactionFacts: jest.fn().mockResolvedValue([
        {
          transactionId: 'tx-1',
          outletId: 'outlet-1',
          occurredAt: new Date('2026-08-15T10:00:00Z'),
          total: '50000.00',
          items: [
            {
              productId: 'prod-1',
              productNameSnapshot: 'Kopi Susu',
              quantity: 2,
              subtotal: '50000.00',
            },
          ],
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesReportingReadService,
        { provide: SalesReportingRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<SalesReportingReadService>(SalesReportingReadService);
  });

  it('should delegate findCompletedTransactionFacts to repository', async () => {
    const query: SalesReportingQuery = {
      merchantId: 'merchant-1',
      dateFrom: new Date('2026-08-01T00:00:00Z'),
      dateTo: new Date('2026-08-31T23:59:59Z'),
      timezone: 'Asia/Jakarta',
    };

    const result = await service.listCompletedTransactionFacts(query);

    expect(repository.findCompletedTransactionFacts).toHaveBeenCalledWith(
      query,
    );
    expect(result).toHaveLength(1);
    expect(result[0].transactionId).toBe('tx-1');
    expect(result[0].total).toBe('50000.00');
  });
});
