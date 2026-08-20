import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ApiError,
  AuthUser,
  PageResponseDto,
  PrismaWriteService,
} from '@app/platform';
import { TransactionQueryDto } from '../web/dto/transaction-query.dto';
import { TransactionSummaryDto } from '../web/dto/checkout-result.dto';
import { TransactionRepository } from '../infrastructure/transaction.repository';
import { ReceiptService } from './receipt.service';

@Injectable()
export class TransactionQueryService {
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly repository: TransactionRepository,
    private readonly receiptService: ReceiptService,
  ) {}

  async list(
    actor: AuthUser,
    query: TransactionQueryDto,
  ): Promise<PageResponseDto<TransactionSummaryDto>> {
    const where: Prisma.TransactionWhereInput = {
      merchantId: actor.merchantId,
    };

    // OD-003: Kasir hanya melihat transaksinya sendiri — dipaksa di service, bukan dari query.
    if (actor.role === 'CASHIER') {
      where.operatorUserId = actor.userId;
      where.outletId = actor.outletId ?? undefined;
    } else if (query.outlet_id) {
      where.outletId = query.outlet_id;
    }

    if (query.date_from || query.date_to) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query.date_from) dateFilter.gte = new Date(query.date_from);
      if (query.date_to) dateFilter.lte = new Date(query.date_to);
      where.createdAt = dateFilter;
    }

    const [rows, total] = await Promise.all([
      this.repository.listTransactions(where, query.skip, query.take),
      this.repository.countTransactions(where),
    ]);

    const content: TransactionSummaryDto[] = rows.map((r) => ({
      transaction_id: r.id,
      transaction_number: r.transactionNumber,
      outlet_id: r.outletId,
      operator_name: r.operator.name,
      total: r.total.toFixed(2),
      status: r.status,
      created_at: r.createdAt.toISOString(),
    }));

    return PageResponseDto.from(content, query.page, query.size, total);
  }

  async detail(actor: AuthUser, id: string) {
    return this.receiptService.compose(this.prisma, id, actor);
  }

  async searchByTransactionNumber(actor: AuthUser, transactionNumber: string) {
    const found = await this.repository.findTransactionByNumber(
      actor.merchantId,
      transactionNumber,
    );
    if (!found) throw ApiError.notFound('Transaction tidak ditemukan.');
    return this.receiptService.compose(this.prisma, found.id, actor);
  }
}
