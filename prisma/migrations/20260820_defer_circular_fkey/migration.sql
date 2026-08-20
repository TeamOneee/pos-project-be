-- Alter circular FK constraints to be DEFERRABLE so register() can create
-- both User and Merchant in a single transaction with SET CONSTRAINTS ALL DEFERRED.

-- Drop and re-add Merchant.ownerUserId -> User.id
ALTER TABLE "merchant" DROP CONSTRAINT "merchant_owner_user_id_fkey";
ALTER TABLE "merchant"
  ADD CONSTRAINT "merchant_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "user"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Drop and re-add User.merchantId -> Merchant.id
ALTER TABLE "user" DROP CONSTRAINT "user_merchant_id_fkey";
ALTER TABLE "user"
  ADD CONSTRAINT "user_merchant_id_fkey"
  FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;
