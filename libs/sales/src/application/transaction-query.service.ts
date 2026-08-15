import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser, PrismaWriteService } from '@app/platform';
import { ForbiddenError, NotFoundError } from '@app/platform';
import {
  PageResponseDto,
  TransactionQueryDto,
} from '../web/dto/transaction-query.dto';
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
    actor: AuthenticatedUser,
    query: TransactionQueryDto,
  ): Promise<PageResponseDto<TransactionSummaryDto>> {
    const where: Prisma.TransactionWhereInput = {
      merchantId: actor.merchantId,
    };

    // OD-003: Kasir hanya melihat transaksinya sendiri — dipaksa di service, bukan dari query.
    if (actor.role === 'CASHIER') {
      where.cashierUserId = actor.userId;
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
      this.repository.listTransactions(where, query.offset, query.limit),
      this.repository.countTransactions(where),
    ]);

    const userIds = [...new Set(rows.map((r) => r.cashierUserId))];
    const users = userIds.length
      ? await this.repository.findUsersByIds(userIds)
      : [];
    const nameById = new Map(users.map((u) => [u.id, u.fullName]));

    const content: TransactionSummaryDto[] = rows.map((r) => ({
      transaction_id: r.id,
      receipt_number: r.receiptNumber,
      outlet_id: r.outletId,
      cashier_name: nameById.get(r.cashierUserId) ?? '',
      total: r.total.toFixed(2),
      status: r.status,
      created_at: r.createdAt.toISOString(),
    }));

    return PageResponseDto.of(
      content,
      total,
      query.page ?? 0,
      query.size ?? 20,
    );
  }

  async detail(actor: AuthenticatedUser, id: string) {
    const tx = await this.repository.findTransactionById(this.prisma, id);
    if (!tx || tx.merchantId !== actor.merchantId) {
      throw new NotFoundError('Transaction not found.');
    }
    if (actor.role === 'CASHIER' && tx.cashierUserId !== actor.userId) {
      throw new ForbiddenError('You cannot access this transaction.');
    }
    return this.receiptService.compose(this.prisma, tx.id, actor);
  }

  async searchByReceipt(actor: AuthenticatedUser, receiptNumber: string) {
    const tx = await this.repository.findTransactionByReceipt(
      actor.merchantId,
      receiptNumber,
    );
    if (!tx) throw new NotFoundError('Transaction not found.');
    if (actor.role === 'CASHIER' && tx.cashierUserId !== actor.userId) {
      throw new ForbiddenError('You cannot access this transaction.');
    }
    return this.receiptService.compose(this.prisma, tx.id, actor);
  }
}
