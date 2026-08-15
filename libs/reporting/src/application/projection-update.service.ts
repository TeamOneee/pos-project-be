import { Injectable } from '@nestjs/common';
import { ApiError, Money } from '@app/platform';
import {
  TransactionCompletedEventV1,
  TransactionCompletedLineV1,
} from './events/transaction-completed.event';
import { getBucketRange } from './reporting-time';
import {
  ProductMetricWrite,
  ReportingProjectionWriteRepository,
} from '../infrastructure/reporting-projection-write.repository';

@Injectable()
// menerapkan transaction completed ke projection di luar request checkout.
export class ProjectionUpdateService {
  constructor(
    private readonly repository: ReportingProjectionWriteRepository,
  ) {}

  async applyEvent(event: TransactionCompletedEventV1): Promise<boolean> {
    // todo(rebuild): sediakan command operator untuk membangun ulang periode bila projection rusak.
    // validasi angka mencegah event rusak mencemari seluruh hasil reporting.
    const total = Money.of(event.total);
    if (total.isNegative()) {
      throw ApiError.validation('Total event tidak boleh negatif.');
    }
    const products = this.combineProducts(event.lines);
    const lineTotal = products.reduce(
      (sum, product) => sum.add(Money.of(product.omzet)),
      Money.zero(),
    );
    if (!lineTotal.equals(total)) {
      throw ApiError.validation(
        'Total event tidak sama dengan subtotal lines.',
      );
    }
    const unitsSold = products.reduce(
      (sum, product) => sum + product.quantity,
      BigInt(0),
    );
    const buckets = (['HOUR', 'DAY'] as const).map((bucket) => ({
      bucket,
      periodStart: getBucketRange(
        event.occurredAt,
        event.merchantTimezone,
        bucket,
      ).start,
      periodEnd: getBucketRange(
        event.occurredAt,
        event.merchantTimezone,
        bucket,
      ).end,
    }));
    return this.repository.apply(event, buckets, products, unitsSold);
  }

  private combineProducts(
    lines: TransactionCompletedLineV1[],
  ): ProductMetricWrite[] {
    // menggabungkan product duplikat agar satu event melakukan upsert minimum.
    const products = new Map<string, ProductMetricWrite>();
    for (const line of lines) {
      const subtotal = Money.of(line.subtotal);
      if (subtotal.isNegative()) {
        throw ApiError.validation('Subtotal line tidak boleh negatif.');
      }
      const current = products.get(line.productId) ?? {
        productId: line.productId,
        productNameSnapshot: line.productNameSnapshot,
        quantity: BigInt(0),
        omzet: '0.00',
      };
      current.productNameSnapshot = line.productNameSnapshot;
      current.quantity += BigInt(line.quantity);
      current.omzet = Money.of(current.omzet).add(subtotal).toString();
      products.set(line.productId, current);
    }
    return [...products.values()];
  }
}
