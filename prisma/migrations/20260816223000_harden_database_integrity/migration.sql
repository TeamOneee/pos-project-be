-- Perkuat invariant Iterasi 1 di level PostgreSQL, bukan hanya di DTO/service.
-- Migration ini sengaja gagal bila data lama sudah melanggar aturan agar data
-- dibersihkan sebelum constraint diberlakukan.

-- Nilai threshold stok tidak boleh negatif.
ALTER TABLE "product"
  ADD CONSTRAINT "product_low_stock_threshold_nonnegative"
  CHECK ("low_stock_threshold" >= 0);

ALTER TABLE "inventory"
  ADD CONSTRAINT "inventory_low_stock_threshold_override_nonnegative"
  CHECK (
    "low_stock_threshold_override" IS NULL
    OR "low_stock_threshold_override" >= 0
  );

-- Pembayaran manual MVP selalu selesai saat checkout commit.
ALTER TABLE "transaction"
  ADD CONSTRAINT "transaction_payment_status_confirmed"
  CHECK ("payment_status" = 'CONFIRMED');

-- Unique key komposit mendukung foreign key yang memverifikasi tenant scope.
CREATE UNIQUE INDEX "outlet_id_merchant_id_key"
  ON "outlet"("id", "merchant_id");

CREATE UNIQUE INDEX "category_id_merchant_id_key"
  ON "category"("id", "merchant_id");

CREATE UNIQUE INDEX "product_id_merchant_id_key"
  ON "product"("id", "merchant_id");

-- Lindungi relasi yang langsung membentuk katalog dan stok per Outlet.
ALTER TABLE "product"
  ADD CONSTRAINT "product_category_id_merchant_id_fkey"
  FOREIGN KEY ("category_id", "merchant_id")
  REFERENCES "category"("id", "merchant_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "outlet_product_price"
  ADD CONSTRAINT "outlet_product_price_outlet_tenant_fkey"
  FOREIGN KEY ("outlet_id", "merchant_id")
  REFERENCES "outlet"("id", "merchant_id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "outlet_product_price_product_tenant_fkey"
  FOREIGN KEY ("product_id", "merchant_id")
  REFERENCES "product"("id", "merchant_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory"
  ADD CONSTRAINT "inventory_outlet_tenant_fkey"
  FOREIGN KEY ("outlet_id", "merchant_id")
  REFERENCES "outlet"("id", "merchant_id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_product_tenant_fkey"
  FOREIGN KEY ("product_id", "merchant_id")
  REFERENCES "product"("id", "merchant_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
