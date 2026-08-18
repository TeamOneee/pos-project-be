// memverifikasi pemetaan model domain ke response DTO snake_case pada dashboard presenter.
import {
  toDashboardSummaryDto,
  toSalesTrendDto,
  toAovTrendDto,
  toTimePatternDto,
  toTopProductsDto,
  toOutletComparisonDto,
  toOperationalDashboardDto,
  toLowStockResultDto,
} from './dashboard.presenter';

function makeMeta() {
  return {
    dataUpdatedAt: new Date('2026-08-17T10:00:00Z'),
    freshnessStatus: 'FRESH' as const,
    timezone: 'Asia/Jakarta',
    periodStart: new Date('2026-08-01T00:00:00Z'),
    periodEnd: new Date('2026-08-31T23:59:59Z'),
  };
}

describe('DashboardPresenter', () => {
  describe('toDashboardSummaryDto', () => {
    it('memetakan field camelCase ke snake_case', () => {
      const result = toDashboardSummaryDto({
        omzet: '1000000',
        transactionCount: 50,
        averageTransactionValue: '20000',
        ...makeMeta(),
      });

      expect(result).toEqual({
        omzet: '1000000',
        transaction_count: 50,
        average_transaction_value: '20000',
        data_updated_at: expect.any(Date),
        freshness_status: 'FRESH',
        period_start: expect.any(Date),
        period_end: expect.any(Date),
        timezone: 'Asia/Jakarta',
      });
    });
  });

  describe('toSalesTrendDto', () => {
    it('memetakan points dengan bucket_start, omzet, transaction_count', () => {
      const result = toSalesTrendDto({
        bucket: 'DAY',
        meta: makeMeta(),
        points: [
          {
            bucketStart: new Date('2026-08-01T00:00:00Z'),
            omzet: '500000',
            transactionCount: 25,
          },
          {
            bucketStart: new Date('2026-08-02T00:00:00Z'),
            omzet: '500000',
            transactionCount: 25,
          },
        ],
      });

      expect(result.bucket).toBe('DAY');
      expect(result.points).toHaveLength(2);
      expect(result.points[0]).toEqual({
        bucket_start: expect.any(Date),
        omzet: '500000',
        transaction_count: 25,
      });
      expect(result).toHaveProperty('data_updated_at');
      expect(result).toHaveProperty('freshness_status');
    });
  });

  describe('toAovTrendDto', () => {
    it('memetakan points dengan bucket_start dan average_transaction_value', () => {
      const result = toAovTrendDto({
        bucket: 'HOUR',
        meta: makeMeta(),
        points: [
          {
            bucketStart: new Date('2026-08-01T08:00:00Z'),
            averageTransactionValue: '22000',
          },
        ],
      });

      expect(result.bucket).toBe('HOUR');
      expect(result.points).toEqual([
        { bucket_start: expect.any(Date), average_transaction_value: '22000' },
      ]);
    });
  });

  describe('toTimePatternDto', () => {
    it('memetakan points dengan hour_of_day, omzet, transaction_count', () => {
      const result = toTimePatternDto({
        meta: makeMeta(),
        points: [
          { hourOfDay: 8, omzet: '100000', transactionCount: 10 },
          { hourOfDay: 12, omzet: '300000', transactionCount: 30 },
        ],
      });

      expect(result.points).toHaveLength(2);
      expect(result.points[0]).toEqual({
        hour_of_day: 8,
        omzet: '100000',
        transaction_count: 10,
      });
    });
  });

  describe('toTopProductsDto', () => {
    it('memetakan top_selling dan least_selling dengan product_id, name, units_sold, omzet', () => {
      const result = toTopProductsDto({
        meta: makeMeta(),
        topSelling: [
          {
            productId: 'p-001',
            name: 'Kopi Susu',
            unitsSold: 100,
            omzet: '2500000',
          },
        ],
        leastSelling: [
          {
            productId: 'p-002',
            name: 'Teh Pahit',
            unitsSold: 2,
            omzet: '20000',
          },
        ],
      });

      expect(result.top_selling).toHaveLength(1);
      expect(result.top_selling[0]).toEqual({
        product_id: 'p-001',
        name: 'Kopi Susu',
        units_sold: 100,
        omzet: '2500000',
      });
      expect(result.least_selling).toHaveLength(1);
      expect(result.least_selling[0]).toEqual({
        product_id: 'p-002',
        name: 'Teh Pahit',
        units_sold: 2,
        omzet: '20000',
      });
    });
  });

  describe('toOutletComparisonDto', () => {
    it('memetakan items dengan outlet_id, outlet_name, omzet, transaction_count', () => {
      const result = toOutletComparisonDto({
        meta: makeMeta(),
        items: [
          {
            outletId: 'out-001',
            outletName: 'Outlet Margonda',
            omzet: '800000',
            transactionCount: 40,
          },
        ],
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        outlet_id: 'out-001',
        outlet_name: 'Outlet Margonda',
        omzet: '800000',
        transaction_count: 40,
      });
    });
  });

  describe('toOperationalDashboardDto', () => {
    it('memetakan semua field operasional ke snake_case', () => {
      const result = toOperationalDashboardDto({
        inventoryItemCount: 15,
        lowStockItemCount: 3,
        outOfStockItemCount: 1,
        activeProductCount: 20,
        inactiveProductCount: 5,
        inactiveCategoryCount: 2,
        outletId: 'out-001',
        dataUpdatedAt: new Date(),
        freshnessStatus: 'FRESH',
        timezone: 'Asia/Jakarta',
      });

      expect(result).toEqual({
        inventory_item_count: 15,
        low_stock_item_count: 3,
        out_of_stock_item_count: 1,
        active_product_count: 20,
        inactive_product_count: 5,
        inactive_category_count: 2,
        outlet_id: 'out-001',
        data_updated_at: expect.any(Date),
        freshness_status: 'FRESH',
        timezone: 'Asia/Jakarta',
      });
    });
  });

  describe('toLowStockResultDto', () => {
    it('memetakan items dan metadata', () => {
      const result = toLowStockResultDto({
        items: [
          {
            productId: 'p-001',
            name: 'Kopi',
            outletId: 'out-001',
            outletName: 'Outlet A',
            quantity: 2,
            baseLowStockThreshold: 5,
            lowStockThresholdOverride: null,
            effectiveLowStockThreshold: 5,
          },
        ],
        dataUpdatedAt: new Date(),
        freshnessStatus: 'FRESH',
        timezone: 'Asia/Jakarta',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        product_id: 'p-001',
        name: 'Kopi',
        outlet_id: 'out-001',
        outlet_name: 'Outlet A',
        quantity: 2,
        base_low_stock_threshold: 5,
        low_stock_threshold_override: null,
        effective_low_stock_threshold: 5,
      });
      expect(result.freshness_status).toBe('FRESH');
      expect(result.timezone).toBe('Asia/Jakarta');
    });
  });
});
