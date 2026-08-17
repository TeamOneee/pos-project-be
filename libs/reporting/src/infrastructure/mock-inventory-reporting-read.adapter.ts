// adapter mock sementara data inventory agar reporting operasional dapat boot sebelum modul inventory selesai.
import { Injectable } from '@nestjs/common';
import {
  InventoryReportingQuery,
  InventoryReportingReadPort,
} from '../application/ports/inventory-reporting-read.port';
import {
  LowStockItem,
  OperationalDashboardData,
} from '../application/reporting.models';

@Injectable()
export class MockInventoryReportingReadAdapter extends InventoryReportingReadPort {
  getOperationalData(
    _query: InventoryReportingQuery,
  ): Promise<
    Pick<
      OperationalDashboardData,
      'inventoryItemCount' | 'lowStockItemCount' | 'outOfStockItemCount'
    >
  > {
    void _query;
    return Promise.resolve({
      inventoryItemCount: 0,
      lowStockItemCount: 0,
      outOfStockItemCount: 0,
    });
  }

  listLowStock(_query: InventoryReportingQuery): Promise<LowStockItem[]> {
    void _query;
    return Promise.resolve<LowStockItem[]>([]);
  }
}
