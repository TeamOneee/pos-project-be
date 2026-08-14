import { Injectable } from '@nestjs/common';
import { Outlet } from '@prisma/client';
import { ApiError } from '@app/platform';
import { PrismaWriteService } from '@app/platform';
import { OutletRepository } from '../infrastructure/outlet.repository';

// FR-TEN-010, FR-TEN-004: isolasi tenant lintas modul. Konsumen: catalog, inventory, sales.
@Injectable()
export class TenantAuthorizationService {
  constructor(
    private readonly outletRepository: OutletRepository,
    private readonly prisma: PrismaWriteService,
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

  // Boundary note: tabel `users` milik modul `identity`. Sampai identity
  // mengekspos port read (UserReadPort), validasi ini dibaca langsung lewat
  // PrismaWriteService. Saat port tersedia, pindahkan pemanggilan ini (06 §3.2).
  async assertUserBelongsToMerchant(
    userId: string,
    merchantId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, merchantId },
      select: { id: true },
    });
    if (!user) {
      throw ApiError.notFound('User tidak ditemukan.'); // FR-TEN-010: disamarkan
    }
  }
}
