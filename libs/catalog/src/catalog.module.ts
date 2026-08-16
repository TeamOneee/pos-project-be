import { Module } from '@nestjs/common';
import { PlatformModule } from '@app/platform';
import { TenantModule } from '@app/tenant';
import { CatalogReportingReadService } from './application/catalog-reporting-read.service';
import { CategoryService } from './application/category.service';
import { OutletPriceService } from './application/outlet-price.service';
import { CatalogReportingReadPort } from './application/ports/catalog-reporting-read.port';
import { ProductReadPort } from './application/ports/product-read.port';
import { ProductReadService } from './application/product-read.service';
import { ProductService } from './application/product.service';
import { CategoryRepository } from './infrastructure/category.repository';
import { CatalogReportingRepository } from './infrastructure/catalog-reporting.repository';
import { OutletPriceRepository } from './infrastructure/outlet-price.repository';
import { ProductRepository } from './infrastructure/product.repository';
import { CategoryController } from './web/category.controller';
import { ProductController } from './web/product.controller';

// menyatukan fitur catalog dan hanya mengekspor kontrak baca lintas modul.
@Module({
  imports: [PlatformModule, TenantModule],
  controllers: [CategoryController, ProductController],
  providers: [
    CategoryService,
    ProductService,
    OutletPriceService,
    ProductReadService,
    CatalogReportingReadService,
    CategoryRepository,
    CatalogReportingRepository,
    ProductRepository,
    OutletPriceRepository,
    { provide: ProductReadPort, useExisting: ProductReadService },
    {
      provide: CatalogReportingReadPort,
      useExisting: CatalogReportingReadService,
    },
  ],
  exports: [ProductReadPort, CatalogReportingReadPort],
})
export class CatalogModule {}
