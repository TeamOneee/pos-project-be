import { Injectable } from '@nestjs/common';
import {
  AuthenticatedUser,
  ForbiddenError,
  PrismaWriteService,
  ValidationError,
} from '@app/platform';
import { ProductReadPort } from '@app/catalog';
import { OutletCatalogQueryDto } from '../web/dto/outlet-catalog-query.dto';
import { PageResponseDto } from '../web/dto/pagination.dto';
import { CatalogProductDto } from '../web/dto/inventory-response.dto';

@Injectable()
export class OutletCatalogQueryService {
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly productReadPort: ProductReadPort,
  ) {}

  async catalog(
    actor: AuthenticatedUser,
    query: OutletCatalogQueryDto,
  ): Promise<PageResponseDto<CatalogProductDto>> {
    if (!query.outlet_id) {
      throw new ValidationError('outlet_id is required.');
    }
    if (actor.role === 'CASHIER' && actor.outletId !== query.outlet_id) {
      throw new ForbiddenError('Outlet is not assigned to this cashier.');
    }

    const rows = await this.prisma.inventory.findMany({
      where: { merchantId: actor.merchantId, outletId: query.outlet_id },
    });
    const productIds = rows.map((r) => r.productId);
    if (productIds.length === 0) {
      return PageResponseDto.of([], 0, query.page ?? 0, query.size ?? 20);
    }

    const products = await this.productReadPort.getProductsForSaleValidation({
      merchantId: actor.merchantId,
      outletId: query.outlet_id,
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
    if (query.category_id) {
      items = items.filter((p) => p.categoryId === query.category_id);
    }

    const content: CatalogProductDto[] = items
      .slice(query.offset, query.offset + query.limit)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.effectivePrice,
        category_id: p.categoryId,
        stock_quantity: quantityByProduct.get(p.id) ?? 0,
      }));

    return PageResponseDto.of(
      content,
      items.length,
      query.page ?? 0,
      query.size ?? 20,
    );
  }
}
