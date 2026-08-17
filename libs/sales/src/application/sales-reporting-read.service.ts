import { Injectable } from '@nestjs/common';
import {
  CompletedTransactionFact,
  SalesReportingQuery,
  SalesReportingReadPort,
} from './ports/sales-reporting-read.port';
import { SalesReportingRepository } from '../infrastructure/sales-reporting.repository';

@Injectable()
export class SalesReportingReadService implements SalesReportingReadPort {
  constructor(private readonly repository: SalesReportingRepository) {}

  async listCompletedTransactionFacts(
    query: SalesReportingQuery,
  ): Promise<CompletedTransactionFact[]> {
    return this.repository.findCompletedTransactionFacts(query);
  }
}
