import { Injectable } from '@nestjs/common';
import { ApiError, AuthUser, PrismaWriteService } from '@app/platform';
import { ProductReadPort } from '@app/catalog';
import { TenantAuthorizationService } from '@app/tenant';
import { InventoryRepository } from '../infrastructure/inventory.repository';
import { LowStockThresholdResult } from './inventory.models';

// set/hapus low-stock threshold override Product-Outlet (FR-INV-007A, DR-011A).
@Injectable()
export class LowStockThresholdService {
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly tenantAuth: TenantAuthorizationService,
    private readonly productReadPort: ProductReadPort,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  async setThreshold(
    actor: AuthUser,
    productId: string,
    outletId: string,
    threshold: number,
  ): Promise<LowStockThresholdResult> {
    await this.assertActiveOutletInMerchant(outletId, actor.merchantId);
    await this.assertProductInMerchant(productId, outletId, actor.merchantId);

    return this.prisma.$transaction(async (tx) => {
      const row = await this.inventoryRepository.upsertThreshold(tx, {
        merchantId: actor.merchantId,
        outletId,
        productId,
        threshold,
      });
      return {
        productId,
        outletId,
        baseLowStockThreshold: row.product.lowStockThreshold,
        lowStockThresholdOverride: row.lowStockThresholdOverride,
        effectiveLowStockThreshold:
          row.lowStockThresholdOverride ?? row.product.lowStockThreshold,
        updatedAt: row.updatedAt,
      };
    });
  }

  async deleteThreshold(
    actor: AuthUser,
    productId: string,
    outletId: string,
  ): Promise<void> {
    await this.assertActiveOutletInMerchant(outletId, actor.merchantId);
    await this.assertProductInMerchant(productId, outletId, actor.merchantId);

    // hapus override; threshold efektif kembali ke threshold dasar Product.
    await this.prisma.$transaction((tx) =>
      this.inventoryRepository.clearThreshold(
        tx,
        actor.merchantId,
        outletId,
        productId,
      ),
    );
  }

  private async assertActiveOutletInMerchant(
    outletId: string,
    merchantId: string,
  ): Promise<void> {
    const outlet = await this.tenantAuth.assertOutletOwnedByMerchant(
      outletId,
      merchantId,
    );
    if (outlet.status !== 'ACTIVE') {
      throw ApiError.forbidden(
        'Outlet nonaktif hanya dapat dibaca sebagai histori.',
      );
    }
  }

  private async assertProductInMerchant(
    productId: string,
    outletId: string,
    merchantId: string,
  ): Promise<void> {
    const products = await this.productReadPort.getProductsForSaleValidation({
      merchantId,
      outletId,
      productIds: [productId],
    });
    if (products.length === 0) {
      throw ApiError.notFound('Product tidak ditemukan.');
    }
  }
}
