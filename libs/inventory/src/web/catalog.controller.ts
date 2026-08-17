import { Controller, Get, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, PageResponseDto, Roles } from '@app/platform';
import { OutletCatalogQueryService } from '../application/outlet-catalog-query.service';
import { toCatalogProductDto } from './inventory.presenter';
import { OutletCatalogQueryDto } from './dto/outlet-catalog-query.dto';

@Controller('products/catalog')
// katalog POS per Outlet (FR-CAT-006); path domain Catalog tapi diimplementasikan
// di modul Inventory karena membaca tabel inventory (06 §3.3-3.4).
export class CatalogController {
  constructor(
    private readonly outletCatalogQueryService: OutletCatalogQueryService,
  ) {}

  @Get()
  @Roles('CASHIER', 'OWNER')
  async catalog(
    @CurrentUser() actor: AuthUser,
    @Query() query: OutletCatalogQueryDto,
  ) {
    const page = await this.outletCatalogQueryService.catalog(
      actor,
      {
        outletId: query.outlet_id,
        search: query.search,
        categoryId: query.category_id,
      },
      query,
    );
    return PageResponseDto.from(
      page.content.map(toCatalogProductDto),
      page.page,
      page.size,
      page.total_elements,
    );
  }
}
