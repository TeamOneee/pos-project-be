import { Module } from '@nestjs/common';
import { TenantModule } from '@app/tenant';
import { CategoryService } from './application/category.service';
import { OutletPriceService } from './application/outlet-price.service';
import { ProductReadPort } from './application/ports/product-read.port';
import { ProductReadService } from './application/product-read.service';
import { ProductService } from './application/product.service';
import { CategoryRepository } from './infrastructure/category.repository';
import { OutletPriceRepository } from './infrastructure/outlet-price.repository';
import { ProductRepository } from './infrastructure/product.repository';
import { CategoryController } from './web/category.controller';
import { ProductController } from './web/product.controller';

// menyatukan fitur catalog dan hanya mengekspor kontrak baca lintas modul.
@Module({
  imports: [TenantModule],
  controllers: [CategoryController, ProductController],
  providers: [
    CategoryService,
    ProductService,
    OutletPriceService,
    ProductReadService,
    CategoryRepository,
    ProductRepository,
    OutletPriceRepository,
    { provide: ProductReadPort, useExisting: ProductReadService },
  ],
  exports: [ProductReadPort],
})
export class CatalogModule {}
