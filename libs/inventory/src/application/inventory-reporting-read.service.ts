import { Injectable } from '@nestjs/common';
import {
  InventoryLowStockItem,
  InventoryOperationalData,
  InventoryReportingQuery,
  InventoryReportingReadPort,
} from './ports/inventory-reporting-read.port';
import { InventoryReportingRepository } from '../infrastructure/inventory-reporting.repository';

@Injectable()
export class InventoryReportingReadService implements InventoryReportingReadPort {
  constructor(private readonly repository: InventoryReportingRepository) {}

  async getOperationalData(
    query: InventoryReportingQuery,
  ): Promise<InventoryOperationalData> {
    return this.repository.getOperationalData(query);
  }

  async listLowStock(
    query: InventoryReportingQuery,
  ): Promise<InventoryLowStockItem[]> {
    return this.repository.listLowStock(query);
  }
}
