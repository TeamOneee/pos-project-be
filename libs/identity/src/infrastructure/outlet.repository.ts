import { Injectable } from '@nestjs/common';
import { Outlet } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';

// Boundary note: tabel `outlet` adalah milik modul `tenant`. Identity
// memvalidasi kepemilikan Outlet saat create/update staff (FR-TEN-005/006).
// Sampai modul tenant menyediakan `TenantAuthorizationService`, validasi ini
// dibaca langsung lewat PrismaWriteService. Saat tenant selesai dibangun,
// pindahkan pemanggilan ini ke port tenant (06 §3.2).
@Injectable()
export class OutletRepository {
  constructor(private readonly prisma: PrismaWriteService) {}

  findActiveInMerchant(
    outletId: string,
    merchantId: string,
  ): Promise<Outlet | null> {
    return this.prisma.outlet.findFirst({
      where: { id: outletId, merchantId, status: 'ACTIVE' },
    });
  }
}
