import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '@app/platform';
import { OutletCatalogQueryService } from '../application/outlet-catalog-query.service';
import { OutletCatalogQueryDto } from './dto/outlet-catalog-query.dto';

@Controller('products/catalog')
export class CatalogController {
  constructor(
    private readonly outletCatalogQueryService: OutletCatalogQueryService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER')
  @Get()
  async catalog(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: OutletCatalogQueryDto,
  ) {
    return this.outletCatalogQueryService.catalog(actor, query);
  }
}
