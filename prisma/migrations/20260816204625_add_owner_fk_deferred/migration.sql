-- AddForeignKey (raw SQL, tidak dimodelkan di schema.prisma)
-- FK ini DEFERRABLE INITIALLY DEFERRED agar registrasi Owner + Merchant
-- (saling menunjuk) dapat dibuat dalam satu transaksi: INSERT merchant
-- (FK owner belum dicek) -> INSERT user dengan merchant_id (user.merchant_id
-- FK ke merchant dicek saat itu juga) -> COMMIT -> FK owner dicek, user ada.
ALTER TABLE "merchant"
  ADD CONSTRAINT "merchant_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "user"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;
