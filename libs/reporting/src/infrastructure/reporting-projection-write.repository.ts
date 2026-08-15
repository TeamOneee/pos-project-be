import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaWriteService } from '@app/platform';
import { TransactionCompletedEventV1 } from '../application/events/transaction-completed.event';
import { ReportingBucket } from '../application/reporting.models';

export interface ProjectionBucketWrite {
  bucket: ReportingBucket;
  periodStart: Date;
  periodEnd: Date;
}

export interface ProductMetricWrite {
  productId: string;
  productNameSnapshot: string;
  quantity: bigint;
  omzet: string;
}

@Injectable()
// memperbarui projection primary secara atomik dan idempotent per transaksi.
export class ReportingProjectionWriteRepository {
  constructor(private readonly prisma: PrismaWriteService) {}

  async apply(
    event: TransactionCompletedEventV1,
    buckets: ProjectionBucketWrite[],
    products: ProductMetricWrite[],
    unitsSold: bigint,
  ): Promise<boolean> {
    // seluruh receipt dan aggregate berada dalam transaksi primary yang sama.
    try {
      await this.prisma.$transaction(async (transaction) => {
        // receipt unik memastikan retry event tidak menggandakan agregat fr-rep-008.
        await transaction.reportingEventReceipt.create({
          data: {
            transactionId: event.transactionId,
            merchantId: event.merchantId,
          },
        });
        for (const bucket of buckets) {
          await this.upsertSales(transaction, event, bucket, unitsSold);
          for (const product of products) {
            await this.updateProductMetric(transaction, event, bucket, product);
          }
        }
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // duplicate receipt berarti event pernah selesai diproyeksikan dan aman diabaikan.
        return false;
      }
      throw error;
    }
  }

  private async upsertSales(
    transaction: Prisma.TransactionClient,
    event: TransactionCompletedEventV1,
    bucket: ProjectionBucketWrite,
    unitsSold: bigint,
  ): Promise<void> {
    // sql upsert memakai increment dan greatest agar aman terhadap worker paralel.
    await transaction.$executeRaw`
      INSERT INTO "reporting_projection" (
        "id", "merchant_id", "outlet_id", "period_start", "period_end",
        "granularity", "omzet", "transaction_count", "units_sold", "metrics",
        "source_watermark", "updated_at"
      ) VALUES (
        ${randomUUID()}, ${event.merchantId}, ${event.outletId},
        ${bucket.periodStart}, ${bucket.periodEnd}, ${bucket.bucket},
        ${event.total}::decimal, ${BigInt(1)}, ${unitsSold},
        '{"products": {}}'::jsonb,
        ${event.occurredAt}, CURRENT_TIMESTAMP
      )
      ON CONFLICT (
        "merchant_id", "outlet_id", "period_start", "granularity"
      ) DO UPDATE SET
        "period_end" = EXCLUDED."period_end",
        "omzet" = "reporting_projection"."omzet" + EXCLUDED."omzet",
        "transaction_count" = "reporting_projection"."transaction_count" + 1,
        "units_sold" = "reporting_projection"."units_sold" + EXCLUDED."units_sold",
        "source_watermark" = GREATEST(
          "reporting_projection"."source_watermark",
          EXCLUDED."source_watermark"
        ),
        "updated_at" = CURRENT_TIMESTAMP
    `;
  }

  private async updateProductMetric(
    transaction: Prisma.TransactionClient,
    event: TransactionCompletedEventV1,
    bucket: ProjectionBucketWrite,
    product: ProductMetricWrite,
  ): Promise<void> {
    // metrics products berada di projection yang sama sesuai data model srs.
    await transaction.$executeRaw`
      UPDATE "reporting_projection"
      SET "metrics" = jsonb_set(
        jsonb_set(
          COALESCE("metrics", '{}'::jsonb),
          '{products}',
          COALESCE("metrics"->'products', '{}'::jsonb),
          true
        ),
        ARRAY['products'::text, ${product.productId}::text],
        jsonb_build_object(
          'name', ${product.productNameSnapshot},
          'unitsSold', (
            COALESCE(
              "metrics" #>> ARRAY[
                'products'::text,
                ${product.productId}::text,
                'unitsSold'::text
              ],
              '0'
            )::bigint + ${product.quantity}
          )::text,
          'omzet', (
            COALESCE(
              "metrics" #>> ARRAY[
                'products'::text,
                ${product.productId}::text,
                'omzet'::text
              ],
              '0'
            )::decimal + ${product.omzet}::decimal
          )::text
        ),
        true
      )
      WHERE "merchant_id" = ${event.merchantId}
        AND "outlet_id" = ${event.outletId}
        AND "period_start" = ${bucket.periodStart}
        AND "granularity" = ${bucket.bucket}
    `;
  }
}
