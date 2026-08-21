-- Dashboard dan dataset insight memfilter transaksi selesai berdasarkan merchant,
-- rentang paid_at, dan kadang outlet. Index ini menjaga query reporting tidak
-- melakukan sequential scan pada primary maupun read replica.
CREATE INDEX "transaction_merchant_id_status_paid_at_idx"
ON "transaction"("merchant_id", "status", "paid_at");

CREATE INDEX "transaction_merchant_id_outlet_id_paid_at_idx"
ON "transaction"("merchant_id", "outlet_id", "paid_at");
