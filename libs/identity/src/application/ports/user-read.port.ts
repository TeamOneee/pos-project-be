// Port read milik identity untuk konsumen lintas modul (06 §3.2/5.5).
// Tenant memakai `userBelongsToMerchant` untuk isolasi FR-TEN-010 tanpa
// membaca tabel `users` langsung lewat Prisma.
export abstract class UserReadPort {
  abstract userBelongsToMerchant(
    userId: string,
    merchantId: string,
  ): Promise<boolean>;
}
