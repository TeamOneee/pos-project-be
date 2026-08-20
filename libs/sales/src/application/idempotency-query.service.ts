import { Injectable } from '@nestjs/common';
import { ApiError, AuthUser, PrismaWriteService } from '@app/platform';
import { ReceiptService } from './receipt.service';
import { TransactionStatusQueryDto } from '../web/dto/transaction-query.dto';
import { TransactionRepository } from '../infrastructure/transaction.repository';
import { CheckoutResultDto } from '../web/dto/checkout-result.dto';

// status idempotency checkout (07 §5.2 GET /transactions/status, FR-CHK-012).
@Injectable()
export class IdempotencyQueryService {
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly repository: TransactionRepository,
    private readonly receiptService: ReceiptService,
  ) {}

  async getStatus(
    actor: AuthUser,
    query: TransactionStatusQueryDto,
  ): Promise<CheckoutResultDto> {
    const record = await this.repository.findByCheckoutRequest(
      this.prisma,
      actor.merchantId,
      query.checkout_request_id,
    );

    // Tidak ada state ambiguitas terpisah: "transaksi ada" (200) atau "belum ada"
    // (404, client boleh submit ulang sebagai checkout baru) — FR-CHK-003/004.
    if (!record) {
      throw ApiError.notFound('Checkout request tidak ditemukan.');
    }

    return this.receiptService.compose(this.prisma, record.id, actor);
  }
}
