import { Injectable } from '@nestjs/common';
import { Money } from '@app/platform';
import { TenantAuthorizationService } from '@app/tenant';
import { OutletPriceRepository } from '../infrastructure/outlet-price.repository';
import { ProductRepository } from '../infrastructure/product.repository';
import {
  ProductForSale,
  ProductReadPort,
  ProductReadRequest,
} from './ports/product-read.port';

// menyediakan data product untuk inventory dan sales tanpa mengekspos repository.
@Injectable()
export class ProductReadService extends ProductReadPort {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly outletPriceRepository: OutletPriceRepository,
    private readonly tenantAuthorization: TenantAuthorizationService,
  ) {
    super();
  }

  async getProductsForSaleValidation(
    request: ProductReadRequest,
  ): Promise<ProductForSale[]> {
    // memvalidasi outlet lalu memuat product dan harga override secara paralel.
    await this.tenantAuthorization.assertOutletOwnedByMerchant(
      request.outletId,
      request.merchantId,
      { requireActive: true },
    );
    const productIds = [...new Set(request.productIds)];
    const [products, overrides] = await Promise.all([
      this.productRepository.findByIdsInMerchant(
        productIds,
        request.merchantId,
      ),
      this.outletPriceRepository.findByOutletAndProductIds(
        request.merchantId,
        request.outletId,
        productIds,
      ),
    ]);
    const overrideByProductId = new Map(
      overrides.map((override) => [override.productId, override]),
    );
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );

    // mempertahankan urutan input agar sales dapat memasangkan item checkout.
    return productIds.flatMap((productId) => {
      const product = productById.get(productId);
      if (!product) return [];
      const override = overrideByProductId.get(product.id);
      return [
        {
          id: product.id,
          merchantId: product.merchantId,
          categoryId: product.categoryId,
          name: product.name,
          isActive: product.isActive,
          isCategoryActive: product.category.isActive,
          effectivePrice: Money.of(override?.price ?? product.price).toString(),
        },
      ];
    });
  }
}
