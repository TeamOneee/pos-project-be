import { Injectable } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { AuthenticatedUser, PrismaWriteService } from '@app/platform';
import { StockMovementQueryDto } from '../web/dto/stock-movement-query.dto';
import { PageResponseDto } from '../web/dto/pagination.dto';
import { StockMovementDto } from '../web/dto/inventory-response.dto';

@Injectable()
export class StockMovementQueryService {
  constructor(private readonly prisma: PrismaWriteService) {}

  async list(
    actor: AuthenticatedUser,
    query: StockMovementQueryDto,
  ): Promise<PageResponseDto<StockMovementDto>> {
    const where: Prisma.StockMovementWhereInput = {
      merchantId: actor.merchantId,
    };
    if (query.outlet_id) where.outletId = query.outlet_id;
    if (query.product_id) where.productId = query.product_id;
    if (query.type) where.type = query.type as StockMovementType;

    if (query.date_from || query.date_to) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query.date_from) dateFilter.gte = new Date(query.date_from);
      if (query.date_to) dateFilter.lte = new Date(query.date_to);
      where.createdAt = dateFilter;
    }

    const [rows, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.offset,
        take: query.limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    const content: StockMovementDto[] = rows.map((m) => ({
      id: m.id,
      outlet_id: m.outletId,
      product_id: m.productId,
      type: m.type,
      delta: m.delta,
      quantity_before: m.quantityBefore,
      quantity_after: m.quantityAfter,
      reason: m.reason,
      reference_id: m.referenceId,
      actor_user_id: m.actorUserId,
      created_at: m.createdAt.toISOString(),
    }));

    return PageResponseDto.of(
      content,
      total,
      query.page ?? 0,
      query.size ?? 20,
    );
  }
}
