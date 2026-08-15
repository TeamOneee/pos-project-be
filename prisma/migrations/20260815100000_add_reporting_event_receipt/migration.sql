-- menyimpan receipt transaction untuk membuat retry event menjadi no-op.
CREATE TABLE "reporting_event_receipt" (
    "transaction_id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reporting_event_receipt_pkey" PRIMARY KEY ("transaction_id")
);

CREATE INDEX "reporting_event_receipt_merchant_id_processed_at_idx"
ON "reporting_event_receipt"("merchant_id", "processed_at");
