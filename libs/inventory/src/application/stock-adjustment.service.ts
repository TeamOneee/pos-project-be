import { Injectable, Logger } from '@nestjs/common';
import {
  ApiError,
  AuthUser,
  ErrorCode,
  PrismaWriteService,
} from '@app/platform';
import { posStockMovementsTotal } from '@app/platform/platform.metrics';
import { ProductReadPort } from '@app/catalog';
import { TenantAuthorizationService } from '@app/tenant';
import { InventoryRepository } from '../infrastructure/inventory.repository';
import { StockMovementRepository } from '../infrastructure/stock-movement.repository';
import { AdjustStockCommand, AdjustmentResult } from './inventory.models';

// stock adjustment manual oleh ADMIN/OWNER (FR-INV-003, FR-INV-004, FR-INV-008).
@Injectable()
export class StockAdjustmentService {
  private readonly logger = new Logger(StockAdjustmentService.name);
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly tenantAuth: TenantAuthorizationService,
    private readonly productReadPort: ProductReadPort,
    private readonly inventoryRepository: InventoryRepository,
    private readonly stockMovementRepository: StockMovementRepository,
  ) {}

  async adjust(
    actor: AuthUser,
    command: AdjustStockCommand,
  ): Promise<AdjustmentResult> {
    if (command.delta === 0) {
      throw ApiError.validation('delta tidak boleh 0.');
    }
    if (!command.reason.trim()) {
      throw ApiError.validation('reason wajib untuk stock adjustment.');
    }
    await this.assertActiveOutletInMerchant(command.outletId, actor.merchantId);

    const products = await this.productReadPort.getProductsForSaleValidation({
      merchantId: actor.merchantId,
      outletId: command.outletId,
      productIds: [command.productId],
    });
    if (products.length === 0) {
      throw ApiError.notFound('Product tidak ditemukan.');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await this.inventoryRepository.findByOutletAndProduct(
        tx,
        command.outletId,
        command.productId,
      );

      let quantityBefore: number;
      let quantityAfter: number;

      if (existing) {
        const updated =
          await this.inventoryRepository.updateQuantityConditional(tx, {
            inventoryId: existing.id,
            delta: command.delta,
          });
        if (!updated) {
          throw ApiError.conflict(
            ErrorCode.VALIDATION_ERROR,
            'Hasil stok tidak boleh negatif atau berubah bersamaan.',
            [
              {
                field: 'delta',
                reason: `stock=${existing.quantity}, delta=${command.delta}`,
              },
            ],
          );
        }
        quantityBefore = updated.quantityBefore;
        quantityAfter = updated.quantityAfter;
      } else {
        if (command.delta < 0) {
          throw ApiError.conflict(
            ErrorCode.VALIDATION_ERROR,
            'Hasil stok tidak boleh negatif.',
            [{ field: 'delta', reason: `stock=0, delta=${command.delta}` }],
          );
        }
        quantityBefore = 0;
        quantityAfter = command.delta;
        await this.inventoryRepository.create(tx, {
          merchantId: actor.merchantId,
          outletId: command.outletId,
          productId: command.productId,
          quantity: quantityAfter,
        });
      }

      const movement = await this.stockMovementRepository.create(tx, {
        merchantId: actor.merchantId,
        outletId: command.outletId,
        productId: command.productId,
        type: 'ADJUSTMENT',
        delta: command.delta,
        quantityBefore,
        quantityAfter,
        reason: command.reason,
        actorUserId: actor.userId,
      });

      posStockMovementsTotal.inc({ type: 'ADJUSTMENT' });

      this.logger.log(
        {
          movementId: movement.id,
          outletId: command.outletId,
          productId: command.productId,
          delta: command.delta,
          quantityBefore,
          quantityAfter,
          actorUserId: actor.userId,
          reason: command.reason,
        },
        'stock adjusted',
      );

      return {
        movementId: movement.id,
        outletId: command.outletId,
        productId: command.productId,
        quantityBefore,
        quantityAfter,
        delta: command.delta,
        reason: command.reason,
        actorUserId: actor.userId,
        createdAt: movement.createdAt,
      };
    });
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
}
