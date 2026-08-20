import { Injectable } from '@nestjs/common';
import { AuthUser, PageRequestDto, PageResponseDto } from '@app/platform';
import { InventoryRepository } from '../infrastructure/inventory.repository';
import { InventoryListFilter, InventoryRowResult } from './inventory.models';

// daftar stok seluruh Outlet dalam Merchant dengan filter opsional (FR-INV-002, FR-INV-007).
@Injectable()
export class InventoryQueryService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async list(
    actor: AuthUser,
    filter: InventoryListFilter,
    page: PageRequestDto,
  ): Promise<PageResponseDto<InventoryRowResult>> {
    const rows = await this.inventoryRepository.findByMerchantWithDetails(
      actor.merchantId,
      { outletId: filter.outletId, productId: filter.productId },
    );

    let items: InventoryRowResult[] = rows.map((r) => {
      const effective =
        r.lowStockThresholdOverride ?? r.product.lowStockThreshold;
      return {
        id: r.id,
        outletId: r.outletId,
        outletName: r.outlet.name,
        productId: r.productId,
        productName: r.product.name,
        quantity: r.quantity,
        baseLowStockThreshold: r.product.lowStockThreshold,
        lowStockThresholdOverride: r.lowStockThresholdOverride,
        effectiveLowStockThreshold: effective,
        isLowStock: r.quantity <= effective,
        updatedAt: r.updatedAt,
      };
    });

    if (filter.lowStockOnly) {
      items = items.filter((i) => i.isLowStock);
    }

    const content = items.slice(page.skip, page.skip + page.take);
    return PageResponseDto.from(content, page.page, page.size, items.length);
  }
}
