import { Injectable } from '@nestjs/common';
import { Outlet } from '@prisma/client';
import { ApiError } from '@app/platform';
import { AuthUser } from '@app/platform';
import { UserReadPort } from '@app/identity';
import { OutletRepository } from '../infrastructure/outlet.repository';

// FR-TEN-010, FR-TEN-004: isolasi tenant lintas modul. Konsumen: catalog, inventory, sales.
@Injectable()
export class TenantAuthorizationService {
  constructor(
    private readonly outletRepository: OutletRepository,
    private readonly userReadPort: UserReadPort,
  ) {}

  // Pastikan outlet milik merchant pemanggil. Outlet INACTIVE read-only untuk
  // operasi bisnis (FR-TEN-004) — panggil dengan requireActive=true saat checkout/adjustment.
  async assertOutletOwnedByMerchant(
    outletId: string,
    merchantId: string,
    options: { requireActive?: boolean } = {},
  ): Promise<Outlet> {
    const outlet = await this.outletRepository.findByIdInMerchant(
      outletId,
      merchantId,
    );
    if (!outlet || (options.requireActive && outlet.status !== 'ACTIVE')) {
      throw ApiError.notFound('Outlet tidak ditemukan.'); // FR-TEN-010: disamarkan
    }
    return outlet;
  }

  // Validasi keanggotaan user via port identity — tidak membaca tabel `users` langsung (06 §3.2).
  async assertUserBelongsToMerchant(
    userId: string,
    merchantId: string,
  ): Promise<void> {
    const belongs = await this.userReadPort.userBelongsToMerchant(
      userId,
      merchantId,
    );
    if (!belongs) {
      throw ApiError.notFound('User tidak ditemukan.'); // FR-TEN-010: disamarkan
    }
  }

  // 06 §5.5: rule role saat memilih outlet operasional.
  // OWNER -> outlet aktif milik merchant (requireActive);
  // CASHIER -> wajib outlet tugasnya dari klaim JWT (OD-010);
  // ADMIN -> ditolak (OD-010).
  async assertOutletOwnedByActor(
    actor: AuthUser,
    outletId: string,
  ): Promise<void> {
    if (actor.role === 'ADMIN') {
      throw ApiError.forbidden('Akses ditolak.'); // OD-010
    }
    if (actor.role === 'CASHIER') {
      if (actor.outletId !== outletId) {
        throw ApiError.forbidden('Akses ditolak.'); // OD-010: bukan outlet tugas
      }
    }
    await this.assertOutletOwnedByMerchant(outletId, actor.merchantId, {
      requireActive: true, // FR-TEN-004: outlet nonaktif read-only
    });
  }
}
