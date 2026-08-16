import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
  PageRequestDto,
  PageResponseDto,
  Roles,
  SuccessMessage,
} from '@app/platform';
import { OutletPriceService } from '../application/outlet-price.service';
import { ProductService } from '../application/product.service';
import { ProductResult } from '../application/catalog.models';
import { toProductDto, toProductOutletPriceDto } from './catalog.presenter';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';
import { ProductOutletPriceDto } from './dto/product-outlet-price.dto';
import { ProductDto } from './dto/product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpsertProductOutletPriceDto } from './dto/upsert-product-outlet-price.dto';

@Controller('products')
// menyediakan api product master dan harga override untuk owner dan admin.
// cashier memperoleh katalog jual melalui inventory, bukan endpoint ini.
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly outletPriceService: OutletPriceService,
  ) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @SuccessMessage('Produk berhasil dibuat.')
  async create(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateProductDto,
  ): Promise<ProductDto> {
    return toProductDto(
      await this.productService.create(actor, {
        name: dto.name,
        price: dto.price,
        categoryId: dto.category_id,
        lowStockThreshold: dto.low_stock_threshold,
        isActive: dto.is_active,
      }),
    );
  }

  @Get()
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Daftar produk berhasil dimuat.')
  async list(
    @CurrentUser() actor: AuthUser,
    @Query() query: ProductListQueryDto,
    @Query() page: PageRequestDto,
  ): Promise<PageResponseDto<ProductDto>> {
    return this.mapPage(
      await this.productService.list(
        actor,
        {
          search: query.search,
          categoryId: query.category_id,
          isActive: query.is_active,
        },
        page,
      ),
    );
  }

  @Patch(':product_id')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Produk berhasil diperbarui.')
  async update(
    @CurrentUser() actor: AuthUser,
    @Param('product_id', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductDto> {
    return toProductDto(
      await this.productService.update(actor, productId, {
        name: dto.name,
        price: dto.price,
        categoryId: dto.category_id,
        lowStockThreshold: dto.low_stock_threshold,
        isActive: dto.is_active,
      }),
    );
  }

  @Put(':product_id/outlet-prices/:outlet_id')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Harga outlet berhasil diperbarui.')
  async upsertOutletPrice(
    @CurrentUser() actor: AuthUser,
    @Param('product_id', ParseUUIDPipe) productId: string,
    @Param('outlet_id', ParseUUIDPipe) outletId: string,
    @Body() dto: UpsertProductOutletPriceDto,
  ): Promise<ProductOutletPriceDto> {
    return toProductOutletPriceDto(
      await this.outletPriceService.upsert(actor, productId, outletId, {
        price: dto.price,
      }),
    );
  }

  @Delete(':product_id/outlet-prices/:outlet_id')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOutletPrice(
    @CurrentUser() actor: AuthUser,
    @Param('product_id', ParseUUIDPipe) productId: string,
    @Param('outlet_id', ParseUUIDPipe) outletId: string,
  ): Promise<void> {
    await this.outletPriceService.remove(actor, productId, outletId);
  }

  private mapPage(
    page: PageResponseDto<ProductResult>,
  ): PageResponseDto<ProductDto> {
    return PageResponseDto.from(
      page.content.map(toProductDto),
      page.page,
      page.size,
      page.total_elements,
    );
  }
}
