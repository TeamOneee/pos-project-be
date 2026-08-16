# Iterasi 1 — Panduan Dokumen dan Sumber Kebenaran

Dokumen ini adalah **pintu masuk** untuk paket Iterasi 1 Aplikasi K. Tujuannya membantu pembaca menemukan konteks yang tepat tanpa harus membaca seluruh dokumen dalam urutan acak.

> Ringkasan satu kalimat: Aplikasi K adalah POS SaaS multi-tenant untuk UMKM multi-outlet yang memprioritaskan checkout, menjaga katalog dan stok per Outlet, menyediakan dashboard bisnis, serta menghasilkan insight AI secara asynchronous setelah dipicu manual oleh Owner.

## 1. Urutan baca yang disarankan

| Kebutuhan pembaca | Mulai dari | Lanjutkan ke |
|---|---|---|
| Memahami tujuan dan alur bisnis | [`01-iterasi-1-business-flow.md`](./01-iterasi-1-business-flow.md) | Bagian aktor, flow Kasir/Admin/Owner, lalu scope MVP |
| Memvalidasi kebutuhan pengguna dan scope | [`02-iterasi-1-proposed-urs.md`](./02-iterasi-1-proposed-urs.md) | Requirement `UR-*`, permission matrix, user journey, dan open decisions |
| Memahami fitur, user story, use case, dan workflow | [`04-iterasi-1-proposed-frd.md`](./04-iterasi-1-proposed-frd.md) | Feature catalog, role matrix, NFR summary, dan Out-of-Scope |
| Mendesain atau mengimplementasikan sistem | [`03-iterasi-1-proposed-srs.md`](./03-iterasi-1-proposed-srs.md) | Requirement `FR-*`, business rule `BR-*`, data requirement `DR-*`, dan NFR |
| Menulis atau menjalankan test | SRS bagian acceptance scenario | Traceability matrix dan requirement ID terkait |
| Menganalisis satu domain secara terarah | Dokumen ini terlebih dahulu | FRD untuk flow fitur, URS untuk intent, lalu SRS pada domain yang sedang dikerjakan |

Tidak semua pembaca perlu membaca keempat dokumen inti dari awal sampai akhir. Setiap dokumen tetap dapat berdiri sendiri, tetapi mempunyai tanggung jawab yang berbeda.

## 2. Tanggung jawab setiap dokumen

| Dokumen | Pertanyaan yang dijawab | Tidak digunakan untuk |
|---|---|---|
| Business Flow | Mengapa aplikasi dibuat, siapa aktornya, dan bagaimana bisnis bergerak dari setup hingga keputusan Owner? | Mengunci endpoint, tabel fisik, framework, atau deployment |
| URS | Hasil apa yang harus diterima pengguna, apa scope MVP, dan siapa boleh melakukan apa? | Menentukan detail implementasi internal |
| FRD | Fitur apa yang tersedia, siapa menggunakannya, serta bagaimana user story, use case, workflow, NFR, dan scope boundary berhubungan? | Mengganti intent URS atau detail sistem normatif SRS |
| SRS | Perilaku sistem apa yang wajib dibangun dan bagaimana membuktikannya? | Mengganti keputusan bisnis yang belum disetujui |

Jika informasi yang sama muncul lebih dari sekali, intent pengguna berada di URS, tampilan feature-oriented berada di FRD, dan versi paling teknis serta dapat diuji berada di SRS. Pengulangan ringkas di Business Flow berfungsi sebagai konteks, bukan requirement baru.

## 3. Urutan sumber kebenaran

Jika terdapat perbedaan, gunakan urutan berikut:

1. keputusan stakeholder terbaru yang dicatat dan disetujui;
2. [URS Iterasi 1](./02-iterasi-1-proposed-urs.md) terbaru untuk kebutuhan pengguna dan scope bisnis;
3. [SRS Iterasi 1](./03-iterasi-1-proposed-srs.md) terbaru untuk perilaku sistem dan verifikasi;
4. [FRD Iterasi 1](./04-iterasi-1-proposed-frd.md) sebagai view fitur turunan dari URS/SRS;
5. [Study Case Indonesia](./StudyCase-Ind.md), [Final Project](./FinalProject.md), dan [How Understand](./HowUnderstand.md) sebagai **pedoman/problem set** yang wajib dipatuhi oleh seluruh dokumen di atas;
6. [Business Flow Iterasi 1](./01-iterasi-1-business-flow.md) sebagai konteks dan rationale;
7. implementasi saat ini.

Implementasi atau dokumen lama yang berbeda tidak otomatis mengubah requirement. Perubahan harus dicatat melalui change control.

## 4. Keputusan Iterasi 1 yang sudah dikunci

| Area | Keputusan terkini |
|---|---|
| Model SaaS | Platform dapat melayani banyak Merchant. Satu Owner memiliki tepat satu Merchant; satu Merchant memiliki banyak Outlet. |
| Akun | Semua pengguna login menggunakan email. Owner membuat dan mengelola langsung akun staf menggunakan password awal. |
| Authentication | MVP hanya menggunakan satu JWT access token dengan expiry tetap 900 detik. Tidak ada refresh token atau revocation server-side. Logout menghapus token dari client; setiap request terproteksi tetap memvalidasi signature, expiry, dan status akun saat ini. Token yang telah disalin tetap dapat digunakan sampai expiry selama akun masih aktif. |
| Role | Satu User memiliki tepat satu role enum: `OWNER`, `ADMIN`, atau `CASHIER`. |
| Scope staf | Owner dan Admin berada pada Merchant dengan `User.outlet_id = null`; Kasir berada pada tepat satu Outlet aktif. Ketika Owner menjalankan fungsi POS, Owner memilih satu Outlet aktif dalam Merchant sebagai konteks operasi. |
| Tanggung jawab | `OWNER` adalah role tertinggi dan mewarisi seluruh permission Admin serta Kasir, selain mengelola Merchant, Outlet, lifecycle staf, dashboard bisnis, dan BI insight. `ADMIN` hanya mengelola Category, Product master, harga, inventory, dan dashboard operasional seluruh Outlet. `CASHIER` hanya menjalankan penjualan pada Outlet tugasnya. |
| Checkout | Kasir dapat checkout pada Outlet tugasnya. Owner juga dapat checkout pada Outlet aktif yang dipilih dalam Merchant-nya. Admin tidak memiliki permission checkout. |
| Category | Setiap Product wajib memiliki satu Category aktif saat dipilih. Category dinonaktifkan, bukan dihapus fisik. Product yang Category-nya nonaktif tetap tersimpan untuk riwayat, tetapi tidak tampil di katalog Kasir dan tidak dapat di-checkout. |
| Inventory | Stok numerik disimpan per kombinasi Product + Outlet dan tidak boleh negatif. Setiap Product memiliki low-stock threshold dasar yang wajib ditentukan Owner atau Admin saat Product dibuat; threshold dapat dioverride pada setiap Outlet. Adjustment manual untuk menambah atau mengurangi stok wajib memiliki alasan. |
| Transfer stok | Tidak ada workflow transfer/pemindahan stok antar-Outlet pada MVP; setiap perubahan saldo dilakukan sebagai adjustment pada satu Outlet yang dipilih. |
| Audit | Audit trail umum untuk katalog, staf, dan Outlet berada di luar MVP. StockMovement tetap menyimpan actor/alasan perubahan stok, sedangkan log operasional digunakan untuk observability. |
| Dashboard Admin | Dashboard operasional Merchant berisi ringkasan inventory, daftar stok rendah, dan kondisi katalog. Admin tidak memperoleh omzet, AOV, analytics bisnis, atau insight BI; Owner dapat mengakses dashboard ini karena mewarisi permission Admin. |
| Transaksi | Riwayat transaksi wajib dipertahankan. Harga dan nama item saat penjualan disimpan sebagai snapshot. |
| Uang | Nilai uang menggunakan exact `DECIMAL/NUMERIC`; kontrak API mengirim nilai uang sebagai decimal string. |
| Dashboard Owner | Must mencakup omzet, jumlah transaksi, AOV, tren penjualan/AOV, pola waktu, produk terlaris/tidak laku, perbandingan Outlet, periode, dan waktu pembaruan. |
| Reporting | Dashboard Owner memakai cache-aside bersama dengan freshness TTL 30 menit. Cache miss mengagregasi hanya Transaction `COMPLETED`; cache tidak diperbarui pada checkout dan bukan sumber kebenaran. Worker hanya digunakan untuk pekerjaan AI. |
| AI/BI | **Fitur "AI Insight" diimplementasikan sebagai Business Intelligence (BI)**: kumpulan insight analitik berbasis data (beberapa tipe), dengan AI sebagai mesin pengerja/penjelas, bukan satu tipe insight tunggal. Hanya Owner yang dapat memicu dan melihat BI insight. Satu trigger manual maksimal satu kali per hari per Merchant memakai **satu `AiAnalysisJob`** yang dapat menghasilkan atau memperbarui beberapa tipe insight sekaligus, sesuai kecukupan data. Pemrosesan asynchronous dan terlindung dari checkout. |
| Payment | Tidak ada entitas/tabel Payment terpisah. `Transaction` menyimpan `payment_method` (`CASH`/`QRIS`/`TRANSFER`), `payment_status = CONFIRMED`, dan `paid_at`; `Transaction.total` menjadi jumlah pembayaran yang dikonfirmasi. |
| Idempotency checkout | Tidak ada `IdempotencyRecord` terpisah. Client membuat `checkout_request_id` UUID untuk satu niat pembayaran; server menyimpan ID tersebut dan `request_hash` pada `Transaction`. Kombinasi `merchant_id + checkout_request_id` unik. |

## 5. Keputusan yang masih terbuka

| ID | Keputusan yang dibutuhkan | Default usulan saat ini |
|---|---|---|
| OD-001 | Batas final payment manual | **Locked**: atribut pembayaran disimpan langsung pada `Transaction`: metode `CASH`/`QRIS`/`TRANSFER`, status selalu `CONFIRMED`, dan `paid_at`; tidak ada tabel Payment terpisah |
| OD-002 | Harga Product global atau dapat dioverride per Outlet | **Locked**: harga master global + boleh override per Outlet (`product_outlet_price`); tanpa override, harga master dipakai |
| OD-003 | Riwayat Kasir hanya transaksi sendiri atau seluruh Outlet | **Locked**: Kasir hanya melihat transaksi yang dilakukan oleh dirinya sendiri |
| OD-004 | Diskon, pajak, dan service charge | **Locked**: di luar MVP. Tidak ada field, kalkulasi, atau konfigurasi diskon, pajak, maupun service charge; `total = subtotal`. |
| OD-005 | Refund/void transaksi final | **Locked**: tidak ada refund/void pada MVP |
| OD-006 | Freshness dashboard | **Locked**: cached aggregate dashboard Owner berumur maksimal 30 menit pada kondisi normal |
| OD-007 | BI insight minimum untuk demo | **Locked**: beberapa tipe — tren penjualan, perbandingan Outlet, produk terlaris/tidak laku, pola waktu, dan tren AOV |
| OD-008 | Kewajiban memakai provider/model AI eksternal | Tidak wajib |
| OD-009 | Target concurrency resmi | Menggunakan proposed baseline SRS sampai divalidasi |
| OD-010 | Hierarki role dan checkout | **Locked**: `OWNER` mewarisi seluruh permission `ADMIN` dan `CASHIER`; Owner checkout pada Outlet aktif yang dipilih dalam Merchant-nya, Kasir hanya pada Outlet tugasnya, dan Admin tidak checkout |
| OD-011 | Model authentication dan logout | **Locked**: JWT access token tunggal dengan expiry 900 detik; tanpa refresh token/revocation server-side; logout menghapus token dari client |
| OD-012 | Model idempotency checkout | **Locked**: `checkout_request_id` dan `request_hash` disimpan pada `Transaction`; kombinasi `merchant_id + checkout_request_id` unik, sedangkan `request_hash` tidak harus unik; tanpa tabel `IdempotencyRecord` terpisah |

Keputusan terbuka tidak boleh diasumsikan sebagai keputusan final dalam implementasi atau proposal. Gunakan default hanya untuk melanjutkan analisis dan tandai dampaknya.

## 6. Konvensi istilah

| Istilah | Arti konsisten dalam paket ini |
|---|---|
| Owner | Pemilik Merchant dan otoritas tertinggi dalam satu Merchant |
| Admin | Staf scope Merchant yang mengelola katalog dan inventory seluruh Outlet |
| Kasir/Cashier | Manusia yang melakukan transaksi; bukan mesin/register POS |
| Merchant/tenant | Satu organisasi UMKM dan batas utama isolasi data |
| Outlet | Lokasi/unit operasional Merchant |
| Product master | Identitas, Category, nama, harga aktif, dan status Product pada Merchant |
| Inventory | Saldo stok satu Product pada satu Outlet |
| Transaction | Catatan penjualan yang memiliki state terdefinisi |
| Reporting cache | Cached aggregate sementara untuk dashboard Owner dengan freshness TTL 30 menit; bukan sumber kebenaran dan dapat dibangun ulang dari Transaction `COMPLETED`. Data lebih lama hanya boleh dipertahankan secara bounded untuk fallback `STALE`. |
| AiAnalysisJob | Pekerjaan asynchronous khusus analisis BI harian satu Merchant; menyimpan state dan retry, bukan jenis job generik. |
| Insight BI | **AI Insight yang diwujudkan sebagai Business Intelligence**: beberapa tipe insight analitik turunan untuk Owner, berbasis metrik/evidence; tidak boleh mengubah data bisnis secara otomatis |

Nama entitas konseptual ditulis dengan kapital awal (`Merchant`, `Outlet`, `Category`, `Product`, `User`, `Transaction`). Nama field dan nilai enum ditulis sebagai kode, misalnya `User.outlet_id` dan `CASHIER`.

## 7. Pola traceability

```text
Business need
  -> UR-*  kebutuhan pengguna
      -> US-* / UC-FRD-*  user story dan use case
          -> FR-* / NFR-*  perilaku dan kualitas sistem
              -> BR-* / DR-*  aturan bisnis dan data
                  -> AT-*  bukti penerimaan
```

Setiap perubahan Must sebaiknya menjawab lima pertanyaan:

1. Requirement pengguna mana yang berubah?
2. Requirement sistem dan aturan data apa yang terdampak?
3. Role serta scope Merchant/Outlet mana yang terdampak?
4. Acceptance test apa yang membuktikannya?
5. Apakah perubahan memengaruhi checkout, histori, keamanan, atau isolasi workload?

## 8. Aturan peninjauan dan perubahan dokumen

Saat menganalisis atau mengubah Iterasi 1:

1. gunakan dokumen ini sebagai konteks awal;
2. sebutkan domain yang sedang dibahas, misalnya inventory atau checkout;
3. baca bagian FRD untuk flow fitur serta bagian URS/SRS yang terkait sebelum mengusulkan perubahan;
4. jangan menganggap item `Open` sebagai keputusan final;
5. jangan mengubah requirement di luar instruksi pengguna;
6. pertahankan ID requirement agar histori dan test tetap dapat ditelusuri;
7. bila menemukan konflik, laporkan kedua sumber dan dampaknya sebelum memilih solusi.
