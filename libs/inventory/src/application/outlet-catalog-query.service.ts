import { Injectable } from '@nestjs/common';
import {
  ApiError,
  AuthUser,
  PageRequestDto,
  PageResponseDto,
} from '@app/platform';
import { ProductReadPort } from '@app/catalog';
import { TenantAuthorizationService } from '@app/tenant';
import { InventoryRepository } from '../infrastructure/inventory.repository';
import { CatalogProductResult, OutletCatalogQuery } from './inventory.models';

// katalog POS per Outlet (FR-CAT-006): hanya Product aktif + Category aktif
// yang punya inventory di Outlet; harga = harga efektif Outlet.
@Injectable()
export class OutletCatalogQueryService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly productReadPort: ProductReadPort,
    private readonly tenantAuth: TenantAuthorizationService,
  ) {}

  async catalog(
    actor: AuthUser,
    query: OutletCatalogQuery,
    page: PageRequestDto,
  ): Promise<PageResponseDto<CatalogProductResult>> {
    if (actor.role === 'CASHIER' && actor.outletId !== query.outletId) {
      throw ApiError.forbidden('Outlet bukan Outlet tugas kasir.');
    }
    const outlet = await this.tenantAuth.assertOutletOwnedByMerchant(
      query.outletId,
      actor.merchantId,
    );
    if (outlet.status !== 'ACTIVE') {
      throw ApiError.forbidden(
        'Owner hanya dapat memilih Outlet aktif dalam Merchant.',
      );
    }

    const rows = await this.inventoryRepository.findInOutlet(
      actor.merchantId,
      query.outletId,
    );
    const productIds = rows.map((r) => r.productId);
    if (productIds.length === 0) {
      return PageResponseDto.from([], page.page, page.size, 0);
    }

    const products = await this.productReadPort.getProductsForSaleValidation({
      merchantId: actor.merchantId,
      outletId: query.outletId,
      productIds,
    });
    const quantityByProduct = new Map(
      rows.map((r) => [r.productId, r.quantity]),
    );

    let items = products.filter(
      (p) => p.isActive && p.isCategoryActive && quantityByProduct.has(p.id),
    );
    if (query.search) {
      const needle = query.search.toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(needle));
    }
    if (query.categoryId) {
      items = items.filter((p) => p.categoryId === query.categoryId);
    }

    const content: CatalogProductResult[] = items
      .slice(page.skip, page.skip + page.take)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.effectivePrice,
        categoryId: p.categoryId,
        stockQuantity: quantityByProduct.get(p.id) ?? 0,
      }));

    return PageResponseDto.from(content, page.page, page.size, items.length);
  }
}
