-- AlterTable: tambah unique constraint nama outlet per merchant (07 §2.2, DR-007).
CREATE UNIQUE INDEX "outlet_merchant_id_name_key" ON "outlet"("merchant_id", "name");
