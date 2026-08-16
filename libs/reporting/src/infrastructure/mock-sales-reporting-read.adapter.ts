// adapter mock sementara fakta sales agar reporting dapat boot sebelum modul sales selesai.
import { Injectable } from '@nestjs/common';
import {
  CompletedTransactionFact,
  SalesReportingQuery,
  SalesReportingReadPort,
} from '../application/ports/sales-reporting-read.port';

@Injectable()
export class MockSalesReportingReadAdapter extends SalesReportingReadPort {
  listCompletedTransactionFacts(
    _query: SalesReportingQuery,
  ): Promise<CompletedTransactionFact[]> {
    void _query;
    return Promise.resolve<CompletedTransactionFact[]>([]);
  }
}
