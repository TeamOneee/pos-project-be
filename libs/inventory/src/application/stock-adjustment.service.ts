import { Injectable } from '@nestjs/common';
import {
  ApiError,
  AuthenticatedUser,
  ErrorCode,
  NotFoundError,
  PrismaWriteService,
  ValidationError,
} from '@app/platform';
import { TenantAuthorizationService } from '@app/tenant';
import { AdjustStockDto } from '../web/dto/adjust-stock.dto';
import { AdjustmentResultDto } from '../web/dto/inventory-response.dto';

@Injectable()
export class StockAdjustmentService {
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly tenantAuth: TenantAuthorizationService,
  ) {}

  async adjust(
    actor: AuthenticatedUser,
    dto: AdjustStockDto,
  ): Promise<AdjustmentResultDto> {
    await this.tenantAuth.assertOutletActive(actor, dto.outlet_id);
    if (dto.delta === 0) {
      throw new ValidationError('delta must not be zero.');
    }
    if (!dto.reason.trim()) {
      throw new ValidationError('reason is required for stock adjustment.');
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: dto.product_id, merchantId: actor.merchantId },
      });
      if (!product) {
        throw new NotFoundError('Product not found.');
      }

      const row = await tx.inventory.findUnique({
        where: {
          outletId_productId: {
            outletId: dto.outlet_id,
            productId: dto.product_id,
          },
        },
      });

      const quantityBefore = row?.quantity ?? 0;
      const quantityAfter = quantityBefore + dto.delta;
      if (quantityAfter < 0) {
        throw new ApiError(
          409,
          ErrorCode.VALIDATION_ERROR,
          'Resulting stock must not be negative.',
          [
            {
              field: 'delta',
              reason: `stock=${quantityBefore}, delta=${dto.delta}`,
            },
          ],
        );
      }

      if (row) {
        const res = await tx.inventory.updateMany({
          where: { id: row.id, quantity: { gte: -dto.delta } },
          data: { quantity: { increment: dto.delta } },
        });
        if (res.count === 0) {
          throw new ApiError(
            409,
            ErrorCode.VALIDATION_ERROR,
            'Stock changed concurrently; retry the adjustment.',
            [{ field: 'delta', reason: 'concurrent update' }],
          );
        }
      } else {
        if (dto.delta < 0) {
          throw new ApiError(
            409,
            ErrorCode.VALIDATION_ERROR,
            'Resulting stock must not be negative.',
            [
              {
                field: 'delta',
                reason: `stock=0, delta=${dto.delta}`,
              },
            ],
          );
        }
        await tx.inventory.create({
          data: {
            merchantId: actor.merchantId,
            outletId: dto.outlet_id,
            productId: dto.product_id,
            quantity: quantityAfter,
            lowStockThresholdOverride: null,
          },
        });
      }

      const movement = await tx.stockMovement.create({
        data: {
          merchantId: actor.merchantId,
          outletId: dto.outlet_id,
          productId: dto.product_id,
          type: 'ADJUSTMENT',
          delta: dto.delta,
          quantityBefore,
          quantityAfter,
          reason: dto.reason,
          referenceId: null,
          actorUserId: actor.userId,
        },
      });

      return {
        movement_id: movement.id,
        outlet_id: dto.outlet_id,
        product_id: dto.product_id,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        delta: dto.delta,
        reason: dto.reason,
        actor_user_id: actor.userId,
        created_at: movement.createdAt.toISOString(),
      };
    });
  }
}
