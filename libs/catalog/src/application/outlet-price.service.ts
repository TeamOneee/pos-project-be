import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiError, AuthUser, ErrorCode, Money } from '@app/platform';
import { TenantAuthorizationService } from '@app/tenant';
import { OutletPriceRepository } from '../infrastructure/outlet-price.repository';
import { ProductRepository } from '../infrastructure/product.repository';
import { OutletPriceResult, UpsertOutletPriceCommand } from './catalog.models';

// mengelola harga override product untuk outlet aktif dalam merchant actor.
// harga hanya dapat diubah untuk product dan outlet aktif dalam merchant sama.
@Injectable()
export class OutletPriceService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly outletPriceRepository: OutletPriceRepository,
    private readonly tenantAuthorization: TenantAuthorizationService,
  ) {}

  async upsert(
    actor: AuthUser,
    productId: string,
    outletId: string,
    command: UpsertOutletPriceCommand,
  ): Promise<OutletPriceResult> {
    // memvalidasi product dan outlet lalu menyimpan harga override.
    // dto dan constraint database menjaga harga override tetap nonnegatif.
    await this.assertProductAndOutlet(actor, productId, outletId);
    const price = await this.outletPriceRepository.upsert(
      actor.merchantId,
      outletId,
      productId,
      new Prisma.Decimal(command.price),
    );
    return {
      productId: price.productId,
      outletId: price.outletId,
      price: Money.of(price.price).toString(),
      updatedAt: price.updatedAt,
    };
  }

  async remove(
    actor: AuthUser,
    productId: string,
    outletId: string,
  ): Promise<void> {
    // menghapus override agar harga efektif kembali ke harga master.
    await this.assertProductAndOutlet(actor, productId, outletId);
    const deleted = await this.outletPriceRepository.delete(
      actor.merchantId,
      outletId,
      productId,
    );
    if (!deleted) {
      throw ApiError.notFound('Override harga tidak ditemukan.');
    }
  }

  private async assertProductAndOutlet(
    actor: AuthUser,
    productId: string,
    outletId: string,
  ): Promise<void> {
    // memastikan product dan outlet aktif serta berada dalam merchant actor.
    const product = await this.productRepository.findByIdInMerchant(
      productId,
      actor.merchantId,
    );
    if (!product) {
      throw ApiError.notFound('Produk tidak ditemukan.');
    }
    if (!product.isActive) {
      throw ApiError.conflict(
        ErrorCode.PRODUCT_INACTIVE,
        'Produk tidak aktif dan tidak dapat diberi harga Outlet.',
      );
    }
    await this.tenantAuthorization.assertOutletOwnedByMerchant(
      outletId,
      actor.merchantId,
      { requireActive: true },
    );
  }
}
