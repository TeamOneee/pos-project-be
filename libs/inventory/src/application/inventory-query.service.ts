import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser, PrismaWriteService } from '@app/platform';
import { InventoryQueryDto } from '../web/dto/inventory-query.dto';
import { PageResponseDto } from '../web/dto/pagination.dto';
import { InventoryItemDto } from '../web/dto/inventory-response.dto';

@Injectable()
export class InventoryQueryService {
  constructor(private readonly prisma: PrismaWriteService) {}

  async list(
    actor: AuthenticatedUser,
    query: InventoryQueryDto,
  ): Promise<PageResponseDto<InventoryItemDto>> {
    const where: Prisma.InventoryWhereInput = {
      merchantId: actor.merchantId,
    };
    if (query.outlet_id) where.outletId = query.outlet_id;
    if (query.product_id) where.productId = query.product_id;

    const rows = await this.prisma.inventory.findMany({
      where,
      include: { product: true },
    });

    const outletIds = [...new Set(rows.map((r) => r.outletId))];
    const outlets = outletIds.length
      ? await this.prisma.outlet.findMany({
          where: { id: { in: outletIds } },
          select: { id: true, name: true },
        })
      : [];
    const outletName = new Map(outlets.map((o) => [o.id, o.name]));

    let items: InventoryItemDto[] = rows.map((r) => {
      const base = r.product.lowStockThreshold;
      const effective = r.lowStockThresholdOverride ?? base;
      return {
        id: r.id,
        outlet_id: r.outletId,
        outlet_name: outletName.get(r.outletId) ?? '',
        product_id: r.productId,
        product_name: r.product.name,
        quantity: r.quantity,
        base_low_stock_threshold: base,
        low_stock_threshold_override: r.lowStockThresholdOverride,
        effective_low_stock_threshold: effective,
        is_low_stock: r.quantity <= effective,
        updated_at: r.updatedAt.toISOString(),
      };
    });

    if (query.low_stock_only) {
      items = items.filter((i) => i.is_low_stock);
    }

    const total = items.length;
    const content = items.slice(query.offset, query.offset + query.limit);
    return PageResponseDto.of(content, total, query.page ?? 0, query.size ?? 20);
  }
}