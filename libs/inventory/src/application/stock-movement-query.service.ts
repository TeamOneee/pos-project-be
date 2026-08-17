import { Injectable } from '@nestjs/common';
import { AuthUser, PageRequestDto, PageResponseDto } from '@app/platform';
import { StockMovementRepository } from '../infrastructure/stock-movement.repository';
import {
  StockMovementListFilter,
  StockMovementResult,
} from './inventory.models';

// riwayat pergerakan stok (FR-INV-003) dengan filter Outlet/Product/jenis/tanggal.
@Injectable()
export class StockMovementQueryService {
  constructor(
    private readonly stockMovementRepository: StockMovementRepository,
  ) {}

  async list(
    actor: AuthUser,
    filter: StockMovementListFilter,
    page: PageRequestDto,
  ): Promise<PageResponseDto<StockMovementResult>> {
    const dbFilter = {
      outletId: filter.outletId,
      productId: filter.productId,
      type: filter.type,
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
    };

    const [rows, total] = await Promise.all([
      this.stockMovementRepository.findByMerchant(
        actor.merchantId,
        dbFilter,
        page.skip,
        page.take,
      ),
      this.stockMovementRepository.countByMerchant(actor.merchantId, dbFilter),
    ]);

    const content: StockMovementResult[] = rows.map((m) => ({
      id: m.id,
      outletId: m.outletId,
      productId: m.productId,
      type: m.type,
      delta: m.delta,
      quantityBefore: m.quantityBefore,
      quantityAfter: m.quantityAfter,
      reason: m.reason,
      transactionId: m.transactionId,
      actorUserId: m.actorUserId,
      createdAt: m.createdAt,
    }));

    return PageResponseDto.from(content, page.page, page.size, total);
  }
}
