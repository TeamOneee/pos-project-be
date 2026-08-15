import { Injectable } from '@nestjs/common';
import { AuthenticatedUser, PrismaWriteService } from '@app/platform';
import {
  CheckoutNotConfirmedError,
  NotFoundError,
  ValidationError,
} from '@app/platform';
import { ReceiptService } from './receipt.service';
import { TransactionStatusQueryDto } from '../web/dto/transaction-query.dto';

@Injectable()
export class IdempotencyQueryService {
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly receiptService: ReceiptService,
  ) {}

  async getStatus(actor: AuthenticatedUser, query: TransactionStatusQueryDto) {
    if (!actor.outletId) {
      throw new ValidationError('outlet_id is required for cashier.');
    }

    const record = await this.prisma.idempotencyRecord.findUnique({
      where: {
        merchantId_outletId_idempotencyKey: {
          merchantId: actor.merchantId,
          outletId: actor.outletId,
          idempotencyKey: query.idempotency_key,
        },
      },
    });

    if (!record) {
      throw new NotFoundError('Idempotency key not found.');
    }

    if (record.state === 'COMPLETED' && record.transactionId) {
      return this.receiptService.compose(
        this.prisma,
        record.transactionId,
        actor,
      );
    }
    if (record.state === 'PROCESSING') {
      return { status: 'PROCESSING' };
    }
    if (record.state === 'FAILED') {
      return { status: 'FAILED' };
    }

    throw new CheckoutNotConfirmedError();
  }
}
