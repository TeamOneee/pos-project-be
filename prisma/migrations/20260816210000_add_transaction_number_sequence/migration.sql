-- CreateSequence
-- `transaction_number` berbentuk `INV-{YYYY}-{seq 6 digit}` (BR-018, DR-003).
-- Keputusan Iterasi 1 (poin 4): TIDAK ada tabel counter baru — cukup satu
-- sequence Postgres (object sequence bukan tabel). Unik global sehingga
-- otomatis unik per Merchant; angka berurutan dijamin oleh sequence.
CREATE SEQUENCE IF NOT EXISTS "transaction_number_seq" START 1;
