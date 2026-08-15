import { Injectable } from '@nestjs/common';
import {
  AuthenticatedUser,
  NotFoundError,
  PrismaWriteService,
} from '@app/platform';
import { TenantAuthorizationService } from '@app/tenant';
import { LowStockThresholdDto } from '../web/dto/inventory-response.dto';

@Injectable()
export class LowStockThresholdService {
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly tenantAuth: TenantAuthorizationService,
  ) {}

  async setThreshold(
    actor: AuthenticatedUser,
    productId: string,
    outletId: string,
    threshold: number,
  ): Promise<LowStockThresholdDto> {
    await this.tenantAuth.assertOutletActive(actor, outletId);

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, merchantId: actor.merchantId },
      });
      if (!product) {
        throw new NotFoundError('Product not found.');
      }

      const row = await tx.inventory.upsert({
        where: { outletId_productId: { outletId, productId } },
        create: {
          merchantId: actor.merchantId,
          outletId,
          productId,
          quantity: 0,
          lowStockThresholdOverride: threshold,
        },
        update: { lowStockThresholdOverride: threshold },
      });

      return {
        product_id: productId,
        outlet_id: outletId,
        base_low_stock_threshold: product.lowStockThreshold,
        low_stock_threshold_override: row.lowStockThresholdOverride,
        effective_low_stock_threshold:
          row.lowStockThresholdOverride ?? product.lowStockThreshold,
        updated_at: row.updatedAt.toISOString(),
      };
    });
  }

  async deleteThreshold(
    actor: AuthenticatedUser,
    productId: string,
    outletId: string,
  ): Promise<void> {
    await this.tenantAuth.assertOutletActive(actor, outletId);

    const product = await this.prisma.product.findFirst({
      where: { id: productId, merchantId: actor.merchantId },
    });
    if (!product) {
      throw new NotFoundError('Product not found.');
    }

    const res = await this.prisma.inventory.updateMany({
      where: {
        outletId,
        productId,
        merchantId: actor.merchantId,
      },
      data: { lowStockThresholdOverride: null },
    });
    if (res.count === 0) {
      throw new NotFoundError('Inventory row not found.');
    }
  }
}
