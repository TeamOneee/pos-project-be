# Proposed Software Requirements Specification (SRS)

**Produk: Aplikasi K — POS dan Business Intelligence untuk UMKM**

| Atribut | Nilai |
|---|---|
| Dokumen | Software Requirements Specification |
| Versi | 0.8 — Iterasi 1 (structured) |
| Status | **Proposed — untuk review dan validasi** |
| URS terkait | [`02-iterasi-1-proposed-urs.md`](./02-iterasi-1-proposed-urs.md) |
| Audiens | Product owner, software engineer, QA, security reviewer, DevOps, designer, dan mentor |
| Jenis produk | Multi-tenant web-based SaaS POS + business intelligence |
| Panduan paket | [`00-iterasi-1-document-guide.md`](./00-iterasi-1-document-guide.md) |
| Konteks bisnis | [`01-iterasi-1-business-flow.md`](./01-iterasi-1-business-flow.md) |
| Functional view | [`04-iterasi-1-proposed-frd.md`](./04-iterasi-1-proposed-frd.md) |

> **Aturan bahasa:** kata **harus** berarti requirement wajib dan dapat diverifikasi. Kata **sebaiknya** berarti rekomendasi yang belum menjadi acceptance gate. Semua angka yang belum berasal langsung dari case diberi label **Proposed Baseline**.

## Cara membaca dokumen ini

| Tujuan | Bagian utama |
|---|---|
| Memahami batas sistem dan akses | Bagian 2–7 |
| Mengimplementasikan satu domain | Bagian 8, lalu business rule dan data requirement terkait |
| Mendesain data/API | Bagian 11–13 |
| Menilai kualitas dan skalabilitas | Bagian 14–15 |
| Menangani error dan menulis test | Bagian 16–18 |
| Menentukan kesiapan baseline | Bagian 19–23 |

Requirement normatif selalu memiliki ID (`FR-*`, `BR-*`, `DR-*`, `UI-*`, `API-*`, `NFR-*`). Diagram, use case, dan narasi menjelaskan hubungan antar-requirement, tetapi tidak membuat requirement baru tanpa ID.

---

## 1. Tujuan

SRS ini menerjemahkan kebutuhan pengguna pada URS menjadi perilaku sistem yang:

- spesifik;
- dapat diimplementasikan;
- dapat diuji;
- dapat ditelusuri kembali ke kebutuhan bisnis;
- cukup jelas untuk mencegah frontend, backend, QA, dan stakeholder membuat interpretasi yang berbeda.

SRS mendeskripsikan **apa yang harus dilakukan sistem**, bukan mengunci framework, vendor cloud, atau bentuk deployment final.

---

## 2. Ruang lingkup sistem

Aplikasi K menyediakan:

1. identity, authentication, dan account lifecycle;
2. merchant, outlet, role dan Outlet langsung pada User, permission, dan tenant isolation;
3. category dan product catalog pada merchant, serta inventory per outlet;
4. cart serta checkout dengan transaksi, pembayaran, dan stok yang konsisten;
5. pencatatan pembayaran manual;
6. receipt dan transaction history;
7. dashboard berbasis transaksi final yang mencakup metrik, tren penjualan/AOV, pola waktu, produk terlaris/tidak laku, perbandingan Outlet, dan freshness;
8. asynchronous reporting dan insight generation;
9. audit trail dan observability minimum;
10. isolasi performa checkout dari workload non-kritis.

### 2.1 Batas sistem pembayaran Iterasi 1

Pada baseline usulan, Aplikasi K **tidak memindahkan dana**. Sistem hanya mencatat bahwa Kasir telah menerima pembayaran dengan metode:

- `CASH`; atau
- `CASHLESS_MANUAL` seperti QRIS dari perangkat/aplikasi lain.

Konfirmasi Kasir merupakan bukti operasional untuk prototype, bukan settlement dari bank. Sistem tidak menyimpan nomor kartu, PIN, credential e-wallet, QR payload sensitif, atau data autentikasi pembayaran pelanggan.

Jika stakeholder memilih payment gateway nyata, requirement payment harus direvisi sebelum baseline karena state, callback, retry, reconciliation, security, dan availability berubah secara material.

---

## 3. Referensi dan sumber kebenaran dokumen

Urutan referensi bila terjadi konflik:

1. keputusan stakeholder yang tercatat dan disetujui;
2. [URS baseline terbaru](./02-iterasi-1-proposed-urs.md);
3. SRS baseline terbaru;
4. [Study Case Indonesia](./StudyCase-Ind.md) dan [Final Project](./FinalProject.md);
5. [Business Flow Iterasi 1](./01-iterasi-1-business-flow.md);
6. implementasi.

Implementasi yang berbeda dari requirement tidak otomatis mengubah requirement. Perubahan harus dicatat melalui change control.

---

## 4. Istilah

| Istilah | Definisi |
|---|---|
| Merchant/tenant | Satu organisasi UMKM dan batas utama kepemilikan data. |
| Owner | Pengguna dengan kewenangan tertinggi dalam satu merchant. |
| Outlet | Lokasi/unit operasional milik satu Merchant. Kasir, inventory, dan transaksi MVP dijalankan dalam konteks Outlet. |
| Admin | Pengguna yang mengelola Category, Product master, dan inventory per Outlet pada satu Merchant. |
| Kasir | Pengguna manusia yang membuat dan menyelesaikan transaksi penjualan pada satu Outlet tugasnya; bukan perangkat/register POS. |
| Checkout | Proses final yang memvalidasi keranjang, mencatat pembayaran, dan menyimpan transaksi. |
| Transaction | Catatan penjualan final atau proses penjualan dengan state yang terdefinisi. |
| Payment record | Catatan metode dan jumlah yang dikonfirmasi Kasir; bukan settlement bank dalam MVP. |
| Snapshot | Salinan nilai produk/harga pada saat transaksi agar sejarah tidak berubah mengikuti katalog. |
| Idempotency | Request checkout yang sama dapat diulang tanpa membuat transaksi final baru. |
| Strong consistency | Pengguna selalu melihat hasil final yang sama untuk keputusan kritis seperti checkout/pembayaran. |
| Eventual consistency | Data turunan seperti dashboard dapat menyusul beberapa saat setelah transaksi final. |
| Freshness | Selisih antara waktu data sumber dan waktu data turunan terakhir diperbarui. |
| Workload isolation | Pembatasan agar reporting/AI tidak menghabiskan resource yang dibutuhkan checkout. |
| p95 | 95% request selesai sama dengan atau lebih cepat dari nilai tersebut. |
| Correlation ID | Identitas untuk menelusuri satu alur dari UI, API, log, dan job. |
| RPO | Batas kehilangan data yang dapat diterima setelah insiden besar. |
| RTO | Target waktu untuk memulihkan layanan setelah insiden besar. |

---

## 5. Gambaran sistem

### 5.1 Konteks logis

```mermaid
flowchart LR
    O["Owner"] --> UI["Aplikasi Web"]
    A["Admin"] --> UI
    K["Kasir"] --> UI
    UI --> CORE["Core Application"]
    CORE --> OPDB[("Operational Source of Truth")]
    CORE --> JOB["Background Job Boundary"]
    JOB --> REPORT["Reporting Projection"]
    REPORT --> DASH["Dashboard Read Flow"]
    JOB --> AI["Insight Generation"]
    DASH --> UI
    AI --> UI

    CORE -. "checkout tidak menunggu" .-> JOB
```

Diagram ini menunjukkan batas tanggung jawab, bukan keputusan bahwa setiap kotak harus menjadi server/service terpisah. Modular monolith dengan worker terpisah masih memenuhi gambaran tersebut bila isolasi dan target kualitas terbukti.

### 5.2 Karakteristik pengguna

| Pengguna | Pengetahuan yang diasumsikan | Kebutuhan UX |
|---|---|---|
| Kasir | Dapat memakai perangkat web/tablet; tidak memahami arsitektur | Langkah pendek, tombol jelas, status tidak ambigu, error dapat ditindaklanjuti |
| Admin | Memahami Category, Product, dan stok per Outlet | Form konsisten, pilihan Outlet eksplisit, validasi, konfirmasi simpan, jejak perubahan |
| Owner | Memahami bisnis tetapi belum tentu teknis | Ringkasan, perbandingan, freshness, drill-down, penjelasan insight |
| Operator | Memahami sistem/logging | Correlation ID, structured log, metrics, runbook |

### 5.3 Constraint produk

- SaaS tahap awal, sensitif terhadap biaya;
- target pertumbuhan 500+ merchant;
- checkout harus terisolasi dari admin/reporting/AI;
- AI bersifat asynchronous;
- user management dan permission wajib;
- MVP harus dapat diuji dan didemonstrasikan;
- solusi harus dapat dioperasikan tim kecil.

---

## 6. System assumptions dan locked constraints

`Locked` berasal dari keputusan stakeholder Iterasi 1. `Proposed` adalah default kerja yang masih memerlukan validasi. Status gabungan berarti sebagian aturan sudah dikunci, sedangkan perluasannya masih berupa proposal.

| ID | Status | Asumsi/constraint | Konsekuensi bila berubah |
|---|---|---|---|
| ASM-001 | Locked | Satu Owner memiliki tepat satu Merchant; satu Merchant dapat memiliki banyak Outlet. | Ownership/multi-merchant perlu model akses baru. |
| ASM-002 | Locked | Setiap pengguna login dengan email; `role` dan `outlet_id` disimpan langsung pada User. Admin memiliki `outlet_id = null`, sedangkan Kasir memiliki tepat satu `outlet_id` pada MVP. | Multi-role/multi-outlet Kasir memerlukan tabel relasi dan UI pemilihan konteks yang lebih kompleks. |
| ASM-003 | Locked/Proposed | Category dan Product master berada pada Merchant; setiap Product wajib memiliki satu Category. Produk tanpa variant adalah proposed baseline. | Perlu SKU/variant atau perubahan model katalog. |
| ASM-004 | Locked | MVP menyimpan stok numerik pada kombinasi Product + Outlet; stok tidak boleh negatif. | Perlu modul inventory, movement, dan aturan konkurensi checkout. |
| ASM-005 | Proposed | Mata uang tunggal IDR. | Perlu currency per merchant/transaksi dan aturan pembulatan. |
| ASM-006 | Proposed | Pajak, diskon, tip, dan service charge di luar Must. | Perlu pricing engine serta perluasan snapshot dan report. |
| ASM-007 | Proposed | Refund/void transaksi final di luar Must. | Perlu state reversal, permission, audit, dan net sales. |
| ASM-008 | Proposed | Payment dicatat manual. | Gateway membutuhkan payment state machine terpisah. |
| ASM-009 | Proposed | Dashboard boleh tertinggal maksimal lima menit untuk target normal. | Perlu strategi update lebih agresif atau real-time. |
| ASM-010 | Locked | Insight hanya dimulai melalui trigger manual Owner, maksimal satu kali per hari per merchant, dan diproses asynchronous. | Trigger otomatis memerlukan perubahan flow dan kebijakan produk. |
| ASM-011 | Proposed | Aplikasi web modern dengan koneksi online. | Offline-first membutuhkan desain sinkronisasi yang berbeda dan berada di luar kasus terpilih. |

---

## 7. Model akses

### 7.1 Role default

| Role | Tujuan | Batas utama |
|---|---|---|
| OWNER | Mengendalikan merchant, outlet, tim, dan informasi bisnis | Tepat satu merchant miliknya |
| ADMIN | Menjaga Category, Product master, dan inventory seluruh Outlet pada Merchant | Tidak dapat mengubah Owner, Outlet, atau field role/outlet User lain |
| CASHIER | Menjalankan penjualan pada outlet tugasnya | Tidak dapat mengubah katalog, akun, atau insight |

Flow Must Iterasi 1 mengunci: hanya `CASHIER` yang dapat melakukan checkout, pada `User.outlet_id` tugasnya. Owner dan Admin tidak memiliki permission checkout (keputusan ini menutup `OD-010`).

### 7.2 Prinsip otorisasi

1. Otorisasi harus diperiksa pada server untuk setiap operasi yang dilindungi.
2. Pemeriksaan harus mencakup `user`, status akun, `User.merchant_id`, `User.outlet_id`, role/permission, serta scope data yang diminta.
3. `merchant_id` atau `outlet_id` dari input pengguna tidak boleh dipercaya tanpa dicocokkan dengan field User dan ownership Merchant.
4. Semua query data tenant harus selalu memiliki scope Merchant. Scope Outlet wajib diterapkan untuk Kasir; bagi Admin, Outlet adalah filter eksplisit yang opsional dalam Merchant-nya.
5. UI dapat menyembunyikan fungsi yang tidak diizinkan, tetapi hal itu bukan kontrol keamanan utama.
6. Akses ditolak menggunakan respons yang tidak membocorkan keberadaan data merchant lain.

---

## 8. Functional requirements

### 8.1 Identity dan authentication

| ID | Requirement | Prioritas | Verifikasi |
|---|---|---|---|
| FR-AUTH-001 | Sistem harus memungkinkan calon Owner mendaftarkan akun menggunakan nama, email, dan password. | Must | Integration + acceptance test |
| FR-AUTH-002 | Sistem harus menolak email yang sudah terdaftar menggunakan perbandingan yang tidak sensitif kapitalisasi. | Must | Integration test |
| FR-AUTH-003 | Sistem harus memvalidasi format email dan kebijakan minimum password sebelum membuat akun. | Must | Unit + integration test |
| FR-AUTH-004 | Sistem harus menyimpan password hanya dalam bentuk password hash yang aman. | Must | Security inspection/test |
| FR-AUTH-005 | Sistem harus memungkinkan Owner, Admin, dan Kasir login memakai email dan password yang benar. | Must | Integration test |
| FR-AUTH-006 | Sistem harus menolak login akun nonaktif atau credential salah tanpa mengungkapkan bagian mana yang salah. | Must | Security test |
| FR-AUTH-007 | Sistem harus membuat session/token yang memiliki waktu kedaluwarsa dan dapat divalidasi. | Must | Integration test |
| FR-AUTH-008 | Sistem harus memungkinkan logout dan membuat session/token terkait tidak dapat dipakai kembali sesuai model session yang dipilih. | Must | Integration test |
| FR-AUTH-009 | Sistem harus mencabut kemampuan akun nonaktif untuk membuat request baru. | Must | Integration test |
| FR-AUTH-010 | Sistem harus membatasi percobaan login berulang untuk mengurangi brute-force. | Must | Security test |
| FR-AUTH-011 | Owner harus dapat membuat akun staf dengan nama, email unik, password awal, dan tepat satu role enum `ADMIN` atau `CASHIER`; Admin tidak diberi Outlet dan Kasir harus diberi tepat satu Outlet. | Must | Acceptance + integration test |
| FR-AUTH-012 | Sistem harus memvalidasi email staf secara case-insensitive dan hanya menyimpan password awal/reset sebagai password hash yang aman. | Must | Security + integration test |
| FR-AUTH-013 | Akun staf harus langsung dapat digunakan setelah dibuat apabila statusnya `ACTIVE`; akun `INACTIVE` tidak boleh login atau mengakses fungsi bisnis. | Must | Acceptance + integration test |
| FR-AUTH-014 | Hanya Owner yang boleh mengubah `User.role`, `User.outlet_id`, status akun, atau mereset password Admin/Kasir pada Merchant-nya. | Must | Acceptance + security test |

**Tidak termasuk Must Iterasi 1:** forgot password mandiri, social login, MFA, SSO, invitation link, dan onboarding aktivasi staf. Owner mereset password staf secara langsung; password yang tersimpan tidak pernah dapat dibaca kembali dalam bentuk asli.

### 8.2 Merchant onboarding, outlet, dan staff scope pada User

| ID | Requirement | Prioritas | Verifikasi |
|---|---|---|---|
| FR-TEN-001 | Registrasi Owner yang berhasil harus dapat dilanjutkan dengan pembuatan tepat satu merchant miliknya. | Must | Acceptance test |
| FR-TEN-002 | Sistem harus mencatat hubungan kepemilikan `OWNER` untuk pembuat merchant dan mencegah Owner yang sama membuat merchant kedua pada MVP. | Must | Integration test |
| FR-TEN-003 | Sistem harus menghasilkan identitas merchant unik yang tidak dapat ditebak sebagai kontrol keamanan satu-satunya. | Must | Inspection |
| FR-TEN-004 | Owner harus dapat membuat, mengubah, dan menonaktifkan Outlet pada merchant yang sama. Outlet nonaktif bersifat read-only untuk operasi bisnis: tidak dapat menerima checkout atau stock adjustment baru, tetapi histori tetap dapat dibaca sesuai akses. | Must | Acceptance test |
| FR-TEN-005 | Owner harus dapat membuat akun staf dengan mengisi langsung `User.role` dari enum yang diizinkan dan `User.outlet_id`; Admin menggunakan `outlet_id = null`, sedangkan Kasir wajib menunjuk tepat satu Outlet aktif di Merchant yang sama. | Must | Acceptance test |
| FR-TEN-006 | Sistem harus menolak Kasir dengan `outlet_id` kosong/tidak sah, Admin dengan `outlet_id` terisi, role tidak valid, atau User yang menunjuk Outlet Merchant lain. | Must | Security + integration test |
| FR-TEN-007 | Owner harus dapat menonaktifkan User staf tanpa menghapus audit dan transaksi historis staf. | Must | Integration test |
| FR-TEN-008 | Sistem harus menolak seluruh akses data ketika User, Merchant, atau Outlet yang dirujuk oleh User tidak aktif. | Must | Security test |
| FR-TEN-009 | Semua entitas bisnis tenant harus dikaitkan dengan satu `merchant_id`; entitas operasional outlet harus juga dikaitkan dengan satu `outlet_id`. | Must | Schema inspection + test |
| FR-TEN-010 | Sistem harus memastikan ID milik merchant/outlet lain menghasilkan `not found` atau `forbidden` yang aman, tanpa mengembalikan isi objek. | Must | Security test |

### 8.3 Product catalog

| ID | Requirement | Prioritas | Verifikasi |
|---|---|---|---|
| FR-CAT-001 | Owner/Admin harus dapat membuat, melihat, mengubah, dan menonaktifkan Category pada Merchant. | Must | Acceptance test |
| FR-CAT-002 | Owner/Admin harus dapat membuat Product master dengan nama, harga jual IDR, satu Category wajib, dan status aktif pada Merchant. | Must | Acceptance test |
| FR-CAT-003 | Sistem harus menolak nama kosong, harga negatif, Category kosong/nonaktif, atau Category yang tidak milik Merchant aktif. | Must | Unit + integration test |
| FR-CAT-003A | Sistem harus membuat Category/Product ID unik dan mengaitkannya dengan Merchant aktif. | Must | Integration test |
| FR-CAT-004 | Owner/Admin harus dapat melihat dan mencari Category/Product seluruh Merchant. | Must | Acceptance + performance test |
| FR-CAT-005 | Owner/Admin harus dapat mengubah nama, Category, harga, dan status aktif Product pada Merchant. | Must | Acceptance test |
| FR-CAT-006 | Kasir hanya boleh melihat produk aktif yang memiliki inventory pada Outlet tugasnya pada flow penjualan. | Must | Security + acceptance test |
| FR-CAT-007 | Menonaktifkan produk harus mencegah checkout baru atas produk tersebut tetapi tidak menghapus riwayat transaksi. | Must | Integration test |
| FR-CAT-008 | Sistem harus merekam actor, waktu, nilai sebelum, dan nilai sesudah untuk perubahan harga/status. | Must | Integration test |
| FR-CAT-009 | Sistem harus mencegah Kasir membuat atau mengubah produk melalui UI maupun API. | Must | Security test |
| FR-CAT-010 | Nama Category harus unik pada Merchant; seluruh Category dinonaktifkan, bukan dihapus fisik, sehingga relasi Product dan riwayat tetap utuh. | Must | Integration test |

### 8.4 Inventory per Outlet

| ID | Requirement | Prioritas | Verifikasi |
|---|---|---|---|
| FR-INV-001 | Sistem harus menyimpan satu saldo stok nonnegatif untuk setiap kombinasi Product + Outlet. | Must | Schema + integration test |
| FR-INV-002 | Owner/Admin harus dapat melihat stok seluruh Outlet dalam Merchant, tetapi setiap perubahan harus menyebut satu Outlet aktif secara eksplisit. Outlet nonaktif hanya dapat dibaca sebagai histori. | Must | Acceptance + security test |
| FR-INV-003 | Owner/Admin harus dapat melakukan stock adjustment manual pada Outlet aktif dengan alasan; sistem harus mencatat nilai sebelum/sesudah, delta, Outlet, Product, actor, waktu, dan referensi bila ada. | Must | Integration test |
| FR-INV-004 | Sistem harus menolak stock adjustment manual yang menghasilkan saldo stok negatif. | Must | Unit + integration test |
| FR-INV-006 | Checkout final harus memvalidasi serta mengurangi stok Product pada Outlet Kasir secara aman terhadap checkout bersamaan. | Must | Concurrency test |
| FR-INV-007 | Jika satu item tidak memiliki stok cukup, seluruh checkout harus gagal tanpa mengurangi stok item lain. | Must | Integration test |
| FR-INV-008 | Sistem harus menandai stok rendah menggunakan satu threshold global nonnegatif yang ditetapkan pada Merchant dan berlaku untuk seluruh Inventory Merchant pada MVP. | Must | Acceptance test |
| FR-INV-009 | Kasir tidak boleh mengubah saldo stok atau melakukan stock adjustment manual. | Must | Security test |

### 8.5 Cart dan pricing

Keranjang dapat disimpan hanya di client untuk MVP, tetapi checkout server tetap harus memvalidasi semua data. Client tidak menjadi sumber kebenaran harga, status produk, stok, atau scope outlet.

| ID | Requirement | Prioritas | Verifikasi |
|---|---|---|---|
| FR-CART-001 | Kasir harus dapat membuat keranjang kosong untuk outlet tugasnya. | Must | Acceptance test |
| FR-CART-002 | Kasir harus dapat menambah produk aktif dan mengubah kuantitas positif. | Must | Acceptance test |
| FR-CART-003 | Kasir harus dapat menghapus item atau membatalkan keranjang sebelum checkout final. | Must | Acceptance test |
| FR-CART-004 | UI harus menampilkan item, kuantitas, harga tampilan, subtotal, dan total. | Must | UI test |
| FR-CART-005 | Sistem checkout harus menghitung ulang total dari data server dan tidak mempercayai total dari client. | Must | Security + integration test |
| FR-CART-006 | Sistem harus menolak harga client yang dimanipulasi. | Must | Security test |
| FR-CART-007 | Jika harga server berbeda dari harga yang disetujui pada keranjang, checkout harus ditolak dengan kode `PRICE_CHANGED` dan total terbaru. | Must | Integration test |
| FR-CART-008 | Jika produk dinonaktifkan, checkout harus ditolak dengan kode `PRODUCT_INACTIVE`. | Must | Integration test |
| FR-CART-009 | Jika stok Outlet tidak cukup, checkout harus ditolak dengan kode `INSUFFICIENT_STOCK` dan item yang perlu diperbaiki. | Must | Integration test |
| FR-CART-010 | Setelah error bisnis, keranjang harus tetap dapat diperbaiki tanpa membuat transaksi parsial. | Must | Acceptance test |

### 8.6 Checkout dan transaction integrity

| ID | Requirement | Prioritas | Verifikasi |
|---|---|---|---|
| FR-CHK-001 | Setiap submit checkout harus membawa `idempotency_key` unik yang dibuat client untuk satu niat pembayaran. | Must | Integration test |
| FR-CHK-002 | Sistem harus mengikat `idempotency_key` pada merchant, outlet, Kasir, dan fingerprint payload checkout. | Must | Integration/security test |
| FR-CHK-003 | Pengulangan key dengan payload sama harus mengembalikan hasil transaksi yang sama tanpa membuat transaksi baru. | Must | Integration test |
| FR-CHK-004 | Pengulangan key dengan payload berbeda harus ditolak sebagai conflict. | Must | Security/integration test |
| FR-CHK-005 | Sistem harus memvalidasi User aktif, `User.merchant_id`, `User.outlet_id`, role, produk aktif, harga, stok Outlet, metode pembayaran, dan total sebelum finalisasi. | Must | Integration test |
| FR-CHK-006 | Pembuatan transaction, line snapshot, payment record, stock movement, dan pengurangan stok harus commit sebagai satu unit atomik. | Must | Integration + fault injection test |
| FR-CHK-007 | Bila salah satu operasi finalisasi gagal, tidak satu pun hasil parsial boleh terlihat sebagai transaksi final. | Must | Fault injection test |
| FR-CHK-008 | Transaksi final harus memperoleh `transaction_id` dan `receipt_number` unik setidaknya dalam merchant. | Must | Integration test |
| FR-CHK-009 | Transaction line harus menyimpan product ID, nama snapshot, harga unit snapshot, kuantitas, dan subtotal. | Must | Schema + integration test |
| FR-CHK-010 | Transaction harus menyimpan Kasir, merchant, outlet, waktu, total, metode/status pembayaran, dan status transaksi. | Must | Schema test |
| FR-CHK-011 | Sistem harus mengembalikan status tegas `COMPLETED` untuk checkout final yang berhasil. | Must | Acceptance test |
| FR-CHK-012 | Sistem harus menyediakan lookup status menggunakan `idempotency_key` atau `transaction_id` sesuai hak akses. | Must | Acceptance test |
| FR-CHK-013 | Timeout di client tidak boleh otomatis diartikan sebagai transaksi gagal; UI harus menawarkan pemeriksaan status request yang sama. | Must | UI + failure test |
| FR-CHK-014 | Sistem harus menerbitkan pekerjaan/event internal setelah commit untuk memperbarui reporting tanpa menahan response checkout. | Must | Integration + timing test |
| FR-CHK-015 | Kegagalan meneruskan pekerjaan reporting harus dapat dideteksi dan dipulihkan tanpa membatalkan transaksi final. | Must | Fault injection/recovery test |
| FR-CHK-016 | Idempotency result harus dipertahankan minimal 24 jam pada MVP. | Must | Integration test |
| FR-CHK-017 | Sistem harus menghasilkan correlation ID untuk setiap request checkout. | Must | Observability test |

### 8.7 Payment record dan receipt

| ID | Requirement | Prioritas | Verifikasi |
|---|---|---|---|
| FR-PAY-001 | Sistem harus menerima metode `CASH` dan `CASHLESS_MANUAL` pada MVP. | Must | Acceptance test |
| FR-PAY-002 | Payment record harus menyimpan metode, amount, waktu konfirmasi, actor, dan status `CONFIRMED`. Pada MVP manual, Payment langsung `CONFIRMED` ketika checkout commit; tidak ada state `PENDING`, settlement, callback gateway, atau rekonsiliasi bank. | Must | Schema + integration test |
| FR-PAY-003 | Payment amount harus sama dengan total transaksi untuk single-payment MVP. | Must | Unit + integration test |
| FR-PAY-004 | Sistem harus menolak metode pembayaran yang tidak aktif/tidak dikenal. | Must | Integration test |
| FR-PAY-005 | Sistem tidak boleh menerima atau menyimpan data kartu, PIN, OTP, atau credential pembayaran. | Must | Security inspection/test |
| FR-PAY-006 | Checkout berhasil harus menghasilkan receipt yang menampilkan merchant, outlet, receipt number, waktu, Kasir, item snapshot, total, dan metode pembayaran. | Must | Acceptance test |
| FR-PAY-007 | Receipt harus dapat dilihat ulang oleh role yang berhak tanpa menghitung ulang dari katalog saat ini. | Must | Integration test |
| FR-PAY-008 | Receipt sebaiknya dapat dicetak melalui browser atau diunduh dalam format sederhana. | Should | Acceptance test |

### 8.8 Transaction history

| ID | Requirement | Prioritas | Verifikasi |
|---|---|---|---|
| FR-TRX-001 | Owner/Admin harus dapat melihat daftar transaksi Merchant dengan pagination; Kasir hanya sesuai batas Outlet/riwayatnya. | Must | Acceptance test |
| FR-TRX-002 | Daftar harus dapat difilter minimal berdasarkan rentang tanggal dan status. | Must | Acceptance test |
| FR-TRX-003 | Owner/Admin harus dapat membuka detail dan receipt transaksi. | Must | Acceptance test |
| FR-TRX-004 | Kasir harus dapat melihat riwayat transaksi dalam Outlet tugasnya sesuai scope yang akan dikunci; pilihan transaksi sendiri atau seluruh transaksi Outlet tidak mengubah kewajiban bahwa fitur riwayat tersedia. | Must | Acceptance/security test |
| FR-TRX-005 | Pengguna harus dapat mencari transaksi berdasarkan receipt number yang tepat. | Must | Acceptance test |
| FR-TRX-006 | Sistem harus menolak akses detail transaksi merchant lain atau outlet di luar scope pengguna. | Must | Security test |
| FR-TRX-007 | Transaksi final tidak dapat dihapus melalui fungsi MVP. | Must | Security/integration test |
| FR-TRX-008 | Jika koreksi/void kelak ditambahkan, sistem harus membuat reversal/audit record dan tidak menghapus sejarah asli. | Future | Design review |

### 8.9 Reporting dan dashboard

#### Definisi metrik MVP

Karena refund di luar scope, metrik awal dihitung dari transaksi `COMPLETED`:

- `gross_sales = sum(transaction.total)`;
- `transaction_count = count(completed transaction)`;
- `average_transaction_value = gross_sales / transaction_count`, atau `0` bila tidak ada transaksi;
- `units_sold = sum(line.quantity)`;
- `top_products` diurutkan berdasarkan units sold, lalu gross item sales sebagai tie-breaker;
- `least_selling_products` mengurutkan Product aktif berdasarkan units sold terendah pada periode terpilih dan menyertakan Product dengan nol penjualan;
- `outlet_comparison` membandingkan gross sales dan transaction count antaroutlet pada periode yang sama;
- `sales_trend` menampilkan gross sales dan transaction count per bucket waktu secara kronologis pada periode terpilih;
- `aov_trend` menampilkan average transaction value per bucket waktu yang sama dengan sales trend;
- `sales_time_pattern` mengelompokkan gross sales dan transaction count berdasarkan jam transaksi dalam zona waktu Merchant untuk menunjukkan jam ramai dan sepi.

| ID | Requirement | Prioritas | Verifikasi |
|---|---|---|---|
| FR-REP-001 | Sistem harus membentuk reporting projection dari transaksi yang sudah `COMPLETED`. | Must | Integration test |
| FR-REP-002 | Proses reporting tidak boleh dijalankan sebagai pekerjaan berat di dalam request checkout. | Must | Architecture inspection + performance test |
| FR-REP-003 | Owner harus dapat memilih rentang tanggal dan melihat metrik MVP seluruh Merchant atau per Outlet; Admin dapat melihat dashboard operasional Merchant, termasuk stok rendah, sesuai permission. | Must | Acceptance test |
| FR-REP-003A | Dashboard Owner harus menampilkan tren penjualan dan tren AOV secara kronologis untuk periode yang dipilih menggunakan bucket waktu yang konsisten dan terlihat oleh pengguna. | Must | Acceptance + calculation test |
| FR-REP-003B | Dashboard Owner harus menampilkan produk terlaris serta produk paling sedikit atau tidak terjual pada scope Merchant atau Outlet yang dipilih. | Must | Acceptance + calculation test |
| FR-REP-003C | Dashboard Owner harus menampilkan pola waktu penjualan berdasarkan jam transaksi dalam zona waktu Merchant agar jam ramai dan sepi dapat dikenali. | Must | Acceptance + timezone calculation test |
| FR-REP-004 | Dashboard harus menampilkan `data_updated_at` dan zona waktu tampilan. | Must | UI test |
| FR-REP-005 | Dashboard harus menampilkan empty state yang benar bila periode tidak memiliki transaksi. | Must | UI test |
| FR-REP-006 | Dashboard harus menampilkan status stale/degraded bila freshness melewati threshold. | Must | Failure test |
| FR-REP-007 | Kegagalan reporting harus dicatat, dapat dicoba ulang, dan tidak mengubah transaksi sumber. | Must | Fault injection test |
| FR-REP-008 | Pemrosesan ulang transaction event yang sama tidak boleh menggandakan nilai agregat. | Must | Idempotency test |
| FR-REP-009 | Seluruh query/report harus dibatasi oleh merchant, periode, dan scope outlet sesuai role. | Must | Security test |
| FR-REP-010 | Owner sebaiknya dapat drill-down dari metrik ke daftar transaksi relevan. | Should | Acceptance test |

### 8.10 BI insight generation

> **Notifikasi:** Fitur "AI Insight" diimplementasikan sebagai **Business Intelligence (BI)** — beberapa tipe insight analitik berbasis metrik yang dapat diverifikasi, dengan AI sebagai mesin pengerja/penjelas (opsional memakai provider eksternal). Bukan satu tipe insight tunggal.

| ID | Requirement | Prioritas | Verifikasi |
|---|---|---|---|
| FR-AI-001 | Sistem harus menjalankan insight generation sebagai background job, bukan bagian dari response checkout. | Must | Architecture + timing test |
| FR-AI-002 | Input insight harus berisi merchant, outlet bila relevan, rentang periode, versi data, dan metrik sumber yang relevan. | Must | Integration test |
| FR-AI-003 | Sistem harus memvalidasi tenant pada input dan output insight. | Must | Security test |
| FR-AI-004 | Insight yang dipublikasikan harus menyimpan judul, penjelasan, periode data, waktu dibuat, tipe, dan status. | Must | Schema + UI test |
| FR-AI-005 | Setiap insight harus menyertakan evidence summary berbasis metrik, bukan hanya teks generatif. | Must | Acceptance test |
| FR-AI-006 | Job gagal harus masuk status `FAILED`/`RETRY_SCHEDULED` dan mengikuti retry terbatas. | Must | Fault injection test |
| FR-AI-007 | Job untuk merchant, tipe insight, dan periode/versi data yang sama harus idempotent. | Must | Integration test |
| FR-AI-008 | Owner harus dapat melihat `READY`, `PROCESSING`, `STALE`, atau `FAILED` tanpa memengaruhi dashboard dasar. | Must | UI test |
| FR-AI-009 | Sistem tidak boleh memberikan kemampuan pada insight untuk langsung memanggil perubahan harga, stok, role, outlet, atau checkout. | Must | Security/design inspection |
| FR-AI-010 | MVP harus mendukung **beberapa tipe insight BI** yang deterministik dan dapat diverifikasi dari data demo: tren penjualan, perbandingan outlet, produk terlaris/tidak laku, pola waktu penjualan, dan tren AOV. | Must | Acceptance test |
| FR-AI-011 | Bila provider/model eksternal digunakan, kegagalannya harus dibatasi timeout dan tidak menyebabkan retry tanpa batas. | Must | Failure test |
| FR-AI-012 | Hanya Owner yang boleh memicu analisis secara manual, melihat, atau mengelola insight BI dalam Merchant-nya; Admin dan Kasir harus ditolak oleh API. Analisis dibatasi maksimal satu kali per hari per merchant. | Must | Security + acceptance test |

### 8.11 Audit trail

| ID | Requirement | Prioritas | Verifikasi |
|---|---|---|---|
| FR-AUD-001 | Sistem harus mencatat audit event untuk login sensitif, perubahan outlet/role/status akun, Category/produk/harga, penambahan/pengurangan stok, dan checkout final. | Must | Integration test |
| FR-AUD-002 | Audit event harus menyimpan waktu, actor, merchant, outlet bila relevan, action, target type/ID, correlation ID, dan hasil. | Must | Schema test |
| FR-AUD-003 | Nilai sebelum/sesudah harus disimpan untuk perubahan yang relevan tanpa menyimpan password/secret. | Must | Security inspection |
| FR-AUD-004 | Audit record tidak boleh dapat diubah atau dihapus melalui UI pengguna MVP. | Must | Security test |
| FR-AUD-005 | Owner harus dapat melihat audit pengguna dan perubahan penting sesuai kebijakan akses. | Should | Acceptance test |
| FR-AUD-006 | Log aplikasi dan audit log harus dibedakan; kegagalan logging non-kritis tidak boleh memalsukan status checkout. | Must | Design/failure test |

### 8.12 Operational controls

| ID | Requirement | Prioritas | Verifikasi |
|---|---|---|---|
| FR-OPS-001 | Sistem harus menyediakan health indicator untuk aplikasi, database, dan background worker. | Must | Operational test |
| FR-OPS-002 | Sistem harus mengukur latency, throughput, dan error checkout. | Must | Observability test |
| FR-OPS-003 | Sistem harus mengukur umur/panjang backlog reporting dan insight job. | Must | Observability test |
| FR-OPS-004 | Operator harus dapat menelusuri log checkout menggunakan correlation ID, transaction ID, atau idempotency key yang disamarkan secara aman. | Must | Operational test |
| FR-OPS-005 | Retry job harus memiliki jumlah maksimum dan backoff; job yang terus gagal harus masuk dead-letter/failed state yang terlihat operator. | Must | Failure test |
| FR-OPS-006 | Sistem harus menyediakan cara aman menjalankan ulang reporting/insight untuk merchant/periode tertentu tanpa menggandakan hasil. | Must | Recovery test |

---

## 9. Detailed use cases

### UC-01 — Registrasi Owner dan merchant

| Elemen | Detail |
|---|---|
| Aktor | Calon Owner |
| Prasyarat | Email belum terdaftar |
| Pemicu | Pengguna memilih registrasi |
| Alur utama | Isi identitas → validasi → akun Owner dibuat → Merchant dibuat dan terhubung ke Owner → pengguna masuk/diarahkan login |
| Alternatif | Email dipakai, password lemah, input tidak valid, merchant gagal dibuat |
| Postcondition sukses | Account Owner aktif dan merchant aktif dengan kepemilikan konsisten |
| Postcondition gagal | Tidak ada merchant tanpa Owner atau akun setengah terhubung |
| Requirement | FR-AUTH-001–004, FR-TEN-001–003 |

### UC-02 — Owner membuat staf

| Elemen | Detail |
|---|---|
| Aktor | Owner |
| Prasyarat | Owner login pada merchant aktif |
| Pemicu | Owner memilih tambah pengguna |
| Alur utama | Isi nama/email/password awal → isi langsung `User.role`; isi `User.outlet_id` hanya untuk Kasir → sistem validasi → password di-hash → User aktif dibuat → audit dicatat → staf dapat login dengan email |
| Alternatif | Email sudah ada, password tidak valid, role/Outlet tidak sah, Owner tidak aktif, atau Outlet Kasir tidak aktif |
| Postcondition sukses | Admin aktif pada Merchant; Kasir aktif dan hanya mengakses Outlet terkait |
| Postcondition gagal | Tidak ada User dengan kombinasi role/Outlet yang tidak sah |
| Requirement | FR-AUTH-011–014, FR-TEN-004–010, FR-AUD-001–003 |

### UC-03 — Admin membuat produk

| Elemen | Detail |
|---|---|
| Aktor | Admin/Owner |
| Prasyarat | Akun aktif pada Merchant dan memiliki permission katalog |
| Pemicu | Memilih tambah produk |
| Alur utama | Isi Category/nama/harga/status → validasi Merchant dan hak akses → Category/Product master dibuat atau diubah → stok awal per Outlet dibuat melalui adjustment terpisah → audit dicatat |
| Alternatif | Harga negatif, nama kosong, Category tidak sah, atau akses Merchant tidak sah |
| Postcondition sukses | Produk aktif dapat dicari Kasir |
| Postcondition gagal | Tidak ada produk parsial |
| Requirement | FR-CAT-001–010, FR-INV-001–003 |

### UC-04 — Checkout berhasil

| Elemen | Detail |
|---|---|
| Aktor | Kasir |
| Prasyarat | Login serta `User.merchant_id`/`User.outlet_id` aktif, keranjang tidak kosong, metode pembayaran dipilih |
| Pemicu | Kasir mengonfirmasi pembayaran |
| Alur utama | Client membuat idempotency key → server otorisasi outlet → validasi produk aktif/harga/stok → hitung total → transaction + lines + payment + stock movement commit → pekerjaan reporting dicatat → response receipt dikirim |
| Alternatif | Produk inactive, harga berubah, stok kurang, field Merchant/Outlet User tidak sah, key conflict, database error, response timeout |
| Postcondition sukses | Tepat satu transaksi `COMPLETED`, payment record, dan stock movement konsisten |
| Postcondition gagal | Tidak ada hasil parsial; key dapat dipakai untuk lookup/retry sesuai kondisi |
| Requirement | FR-CART-005–010, FR-CHK-001–017, FR-PAY-001–007 |

### UC-05 — Memeriksa checkout dengan hasil belum diketahui

| Elemen | Detail |
|---|---|
| Aktor | Kasir |
| Prasyarat | Client memiliki idempotency key dari submit sebelumnya |
| Pemicu | Response checkout timeout/terputus |
| Alur utama | UI menandai perlu cek → request lookup key → jika completed tampilkan receipt yang sama |
| Alternatif | Masih processing: polling terbatas; tidak ditemukan/failed: izinkan retry aman dengan key sesuai aturan |
| Postcondition | Kasir memperoleh hasil yang tegas tanpa transaksi ganda |
| Requirement | FR-CHK-003–004, FR-CHK-012–016 |

### UC-06 — Dashboard Owner

| Elemen | Detail |
|---|---|
| Aktor | Owner |
| Prasyarat | Login dan projection tersedia atau memiliki status |
| Pemicu | Membuka dashboard/rentang waktu |
| Alur utama | Otorisasi tenant → baca projection → tampilkan metrik, tren penjualan/AOV, pola waktu, produk terlaris/tidak laku, performa outlet, dan freshness → Owner memicu AI secara manual bila diperlukan → job diproses asynchronous → tampilkan insight status/hasil |
| Alternatif | Tidak ada transaksi, projection stale, reporting gagal, AI gagal |
| Postcondition | Tidak mengubah transaction source of truth |
| Requirement | FR-REP-001–010, FR-AI-004–012 |

---

## 10. State model

### 10.1 Checkout/transaction state

```mermaid
stateDiagram-v2
    [*] --> RECEIVED: submit + idempotency key
    RECEIVED --> VALIDATING
    VALIDATING --> REJECTED: business validation gagal
    VALIDATING --> COMMITTING: semua valid
    COMMITTING --> COMPLETED: atomic commit berhasil
    COMMITTING --> FAILED: commit gagal/rollback
    RECEIVED --> COMPLETED: key pernah sukses, return hasil sama
    RECEIVED --> REJECTED: key sama, payload berbeda
    REJECTED --> [*]
    FAILED --> [*]
    COMPLETED --> [*]
```

`PROCESSING` dapat menjadi status API/UI ketika state internal `RECEIVED`, `VALIDATING`, atau `COMMITTING`. Hanya `COMPLETED` yang masuk reporting penjualan.

### 10.2 Insight state

```mermaid
stateDiagram-v2
    [*] --> PENDING: Owner memicu analisis manual
    PENDING --> PROCESSING
    PROCESSING --> READY: output tervalidasi
    PROCESSING --> RETRY_SCHEDULED: transient failure
    RETRY_SCHEDULED --> PROCESSING
    PROCESSING --> FAILED: retry habis/permanent failure
    READY --> STALE: sumber data melewati freshness
    STALE --> PENDING: Owner memicu analisis ulang
    FAILED --> PENDING: Owner memicu analisis ulang
```

`RETRY_SCHEDULED` adalah retry teknis dari job yang sama, bukan trigger analisis baru. Analisis baru hanya dimulai oleh Owner dan dibatasi maksimal satu kali per hari per merchant.

### 10.3 Staff account state

```mermaid
stateDiagram-v2
    [*] --> ACTIVE: Owner membuat akun aktif
    [*] --> INACTIVE: Owner membuat akun nonaktif
    ACTIVE --> INACTIVE: Owner menonaktifkan
    INACTIVE --> ACTIVE: Owner mengaktifkan kembali
```

Hanya User `ACTIVE` pada Merchant aktif yang dapat login; Kasir juga harus memiliki `User.outlet_id` yang menunjuk Outlet aktif. Reset password dilakukan Owner dan tidak mengubah status akun. Sistem hanya menyimpan password hash dan tidak dapat menampilkan kembali password yang tersimpan dalam bentuk asli.

---

## 11. Business rules

| ID | Rule |
|---|---|
| BR-001 | Semua money amount disimpan sebagai exact fixed-point `DECIMAL/NUMERIC`, dengan precision dan scale yang ditetapkan schema; tidak menggunakan binary floating point. |
| BR-002 | Kuantitas MVP adalah integer positif pada cart. |
| BR-003 | Total transaksi adalah jumlah `unit_price_snapshot × quantity` untuk semua line pada scope tanpa diskon/pajak. |
| BR-004 | Payment amount harus sama dengan transaction total pada single-payment MVP. |
| BR-005 | Hanya transaksi `COMPLETED` yang mengurangi stok secara final dan masuk laporan penjualan. |
| BR-006 | Product name dan unit price snapshot tidak berubah setelah transaksi `COMPLETED`. |
| BR-007 | Perubahan katalog tidak menulis ulang transaction line historis. |
| BR-008 | Satu `(merchant_id, outlet_id, idempotency_key)` hanya terkait dengan satu fingerprint request. |
| BR-009 | Idempotency key yang sama dan payload sama menghasilkan response transaksi yang sama. |
| BR-010 | Checkout multi-item bersifat all-or-nothing. |
| BR-011 | Owner adalah satu-satunya pihak yang dapat membuat, mengubah, mengaktifkan/menonaktifkan, mereset password, atau mengubah field role/Outlet User; setiap User memiliki satu role enum `OWNER`, `ADMIN`, atau `CASHIER`, Admin memiliki `outlet_id = null`, dan Kasir memiliki tepat satu `outlet_id` aktif pada MVP. |
| BR-011A | Stok tidak boleh negatif. Checkout atau stock adjustment manual yang kalah bersaing atas stok terakhir harus ditolak. |
| BR-012 | Server menentukan harga dan total final. |
| BR-013 | Perubahan harga antara cart dan checkout memerlukan review Kasir; sistem tidak diam-diam mengenakan harga baru. |
| BR-014 | Setiap data bisnis harus mempunyai `merchant_id` yang valid; inventory, transaksi, dan `User` Kasir harus memiliki `outlet_id` yang valid bila relevan. |
| BR-015 | User, ownership Merchant, atau Outlet nonaktif tidak dapat melakukan aksi baru tetapi sejarah actor tetap dipertahankan. |
| BR-016 | Insight tidak boleh menjadi sumber kebenaran transaksi, status produk, atau harga. |
| BR-017 | Reporting/insight retry harus idempotent. |
| BR-018 | Tanggal laporan menggunakan zona waktu merchant untuk batas hari; timestamp sumber disimpan secara konsisten. |
| BR-019 | Setiap Product wajib terkait dengan satu Category. Category harus aktif saat dipilih untuk Product baru/perubahan; Category dinonaktifkan dan tidak dihapus fisik sehingga relasi yang sudah ada tetap dipertahankan. |
| BR-020 | Hanya Owner yang dapat memicu AI secara manual dan mengakses hasilnya; analisis dibatasi maksimal satu kali per hari per merchant. |

---

## 12. Data requirements

### 12.1 Conceptual entities

| Entity | Tujuan | Data minimum |
|---|---|---|
| User | Identitas login dan scope staf | ID, merchant ID, outlet ID nullable, name, normalized email, password hash, role enum, status, timestamps |
| Merchant | Batas tenant dan konfigurasi inventory global | ID, owner user ID, name, timezone, currency, low-stock threshold global, status, timestamps |
| Outlet | Unit operasional Merchant | ID, merchant ID, name, address opsional, status, timestamps |
| Category | Pengelompokan Product Merchant | ID, merchant ID, name, active flag, timestamps |
| Product | Katalog master Merchant | ID, merchant ID, category ID, name, current price, active flag |
| Inventory | Saldo stok per Outlet | ID, merchant ID, outlet ID, product ID, quantity, updated at |
| StockMovement | Jejak perubahan stok | inventory/product/outlet, type (`ADJUSTMENT` atau `SALE`), delta, before/after, reason bila adjustment, reference, actor, timestamp |
| Transaction | Header penjualan | ID, merchant ID, outlet ID, receipt no., cashier, status, total, timestamps, idempotency reference |
| TransactionLine | Snapshot item terjual | transaction, product reference, name snapshot, unit price snapshot, quantity, subtotal |
| Payment | Catatan pembayaran manual | transaction, method, amount, status `CONFIRMED`, confirmed by/at |
| IdempotencyRecord | Perlindungan duplicate request | merchant, outlet, actor, key hash, payload fingerprint, state, response reference, expiry |
| ReportingProjection | Data ringkas dashboard | merchant, outlet bila relevan, period/granularity, metrics, source watermark, updated at |
| Insight | Output analitik | merchant, outlet bila relevan, type, period, evidence, content, state, data version, generated at |
| JobRecord | Status background work | type, tenant, dedupe key, state, attempts, next retry, error category |
| AuditEvent | Jejak aksi penting | tenant, actor, action, target, before/after safe data, correlation ID, timestamp |

### 12.2 Data constraints

| ID | Requirement |
|---|---|
| DR-001 | Email ternormalisasi setiap Owner, Admin, dan Kasir harus unik sesuai model akun global. |
| DR-002 | Owner hanya dapat memiliki satu Merchant; setiap User terkait satu Merchant, Admin harus memiliki `outlet_id = null`, dan Kasir harus memiliki tepat satu `outlet_id` aktif pada MVP. |
| DR-003 | Receipt number harus unik setidaknya di dalam merchant. |
| DR-004 | Foreign key/referential integrity harus mencegah line/payment tanpa transaction yang valid. |
| DR-005 | Constraint/check atau domain validation harus mencegah amount, kuantitas/stok negatif, status, dan scope outlet tidak valid. |
| DR-006 | Index harus mendukung login email, pencarian User berdasarkan Merchant/role/Outlet, Category/Product search per Merchant, inventory lookup per Outlet/Product, idempotency lookup, transaction by tenant/outlet/date/receipt, dan reporting by tenant/outlet/period. |
| DR-007 | Data tenant tidak boleh dicampur dalam unique/index/query yang menghilangkan scope merchant. |
| DR-008 | Transaction dan audit historis tidak boleh cascade-delete karena product/user dinonaktifkan. |
| DR-009 | Migration schema harus versioned, dapat dijalankan ulang secara aman sesuai tool, dan diuji pada data representatif. |
| DR-010 | Seed/demo data tidak boleh menggunakan data pelanggan nyata atau secret. |
| DR-011 | `User.role` hanya menerima `OWNER`, `ADMIN`, atau `CASHIER`; `Product.category_id` tidak boleh null dan wajib menunjuk Category dalam Merchant yang sama. Category harus aktif ketika ditetapkan ke Product. |
| DR-011A | `Merchant.low_stock_threshold` harus bernilai nonnegatif. Pada MVP, Inventory tidak memiliki threshold per Product maupun per Outlet. |

### 12.3 Retention Proposed Baseline

| Data | Retention awal | Catatan |
|---|---|---|
| Transaction, line, payment, stock movement | Selama umur merchant/proyek | Tidak dihapus dari UI MVP |
| Audit event | Minimal 1 tahun untuk target produk; selama demo untuk prototype | Perlu validasi kebijakan bisnis |
| Application log | 30 hari | Tidak menyimpan password/payment credential |
| Idempotency record | Minimal 24 jam | Transaction reference tetap historis |
| Job error detail | 30 hari atau hingga selesai direkonsiliasi | Redact data sensitif |
| Insight | Per tipe insight: 1 hasil terbaru per merchant, di-update setiap analisis (maks. 1x/hari), tanpa histori per tipe | Locked |

---

## 13. External interface requirements

### 13.1 User interface

| ID | Requirement |
|---|---|
| UI-001 | UI harus responsif untuk laptop/tablet modern dengan lebar minimum yang disepakati pada desain. |
| UI-002 | Kasir harus dapat mencapai pemilihan produk, cart, dan checkout tanpa masuk ke menu Admin/Owner. |
| UI-003 | Tombol final checkout harus mencegah double-submit visual, tetapi server idempotency tetap wajib. |
| UI-004 | Status loading, success, validation error, system error, empty, stale, dan unauthorized harus memiliki tampilan berbeda. |
| UI-005 | Error harus memberi tindakan berikutnya dan tidak menampilkan stack trace. |
| UI-006 | Receipt number/correlation reference yang aman harus mudah disalin untuk bantuan. |
| UI-007 | Dashboard dan insight harus menampilkan periode serta waktu pembaruan. |
| UI-008 | Perubahan harga sebelum finalisasi harus meminta Kasir mereview total baru. |
| UI-009 | Aksi destructive atau berisiko seperti menonaktifkan akun/produk harus meminta konfirmasi. |
| UI-010 | Seluruh flow utama harus dapat digunakan dengan keyboard secara wajar dan memiliki label kontrol yang dapat dibaca teknologi bantu. |

### 13.2 API behavior

SRS tidak mengunci REST/GraphQL, tetapi kontrak harus memenuhi:

| ID | Requirement |
|---|---|
| API-001 | Semua request terautentikasi harus memperoleh konteks user dan merchant dari credential/session yang tervalidasi. |
| API-002 | API harus menggunakan format error konsisten: code stabil, message aman, correlation ID, dan field detail bila relevan. |
| API-003 | Validation error, unauthorized, forbidden/not found aman, conflict, rate limit, dan server error harus dapat dibedakan oleh client. |
| API-004 | List endpoint harus memiliki pagination dan batas maksimum page size. |
| API-005 | Date/time dikirim dalam format standar dengan timezone/offset yang jelas. |
| API-006 | Money amount dikirim sebagai string decimal berformat eksplisit dan dipetakan ke exact `DECIMAL/NUMERIC`, bukan JSON binary float. |
| API-007 | Breaking change pada kontrak harus melalui versioning atau migration plan. |
| API-008 | Checkout timeout harus dikonfigurasi dan didokumentasikan; client harus menggunakan status lookup sebelum membuat niat pembayaran baru. |

### 13.3 External AI provider (optional)

| ID | Requirement |
|---|---|
| EXT-AI-001 | Integrasi provider harus berada di luar transaction/checkout commit path. |
| EXT-AI-002 | Payload harus meminimalkan data dan tidak mengirim password, token, atau identitas yang tidak diperlukan. |
| EXT-AI-003 | Timeout, retry terbatas, dan circuit/degradation behavior harus didefinisikan. |
| EXT-AI-004 | Output provider harus divalidasi sebelum dipublikasikan. |
| EXT-AI-005 | Produk harus memiliki fallback insight/status bila provider tidak tersedia. |

---

## 14. Non-functional requirements

### Cara membaca target kualitas

| Label | Makna |
|---|---|
| Acceptance MVP | Harus dibuktikan pada environment demo/test Iterasi 1. |
| Proposed Baseline | Target awal yang menjadi bahan validasi; belum menjadi janji produksi sebelum disetujui. |
| Target Production | Arah kualitas layanan nyata; prototype gratis tidak dianggap gagal hanya karena belum membuktikan SLA produksi. |

Setiap laporan pengujian harus menyebut environment dan label target yang sedang dibuktikan. Dengan demikian angka prototype tidak disalahartikan sebagai SLA produksi, dan target produksi tidak hilang dari konteks desain.

### 14.1 Performance — Proposed Baseline

Kondisi pengukuran harus menyebutkan environment, ukuran data, concurrency, durasi, dan apakah network eksternal dihitung.

| ID | Requirement | Target | Verifikasi |
|---|---|---|---|
| NFR-PERF-001 | Checkout submit valid | p95 ≤ 500 ms dan p99 ≤ 1.000 ms, diukur di server, tanpa gateway eksternal | Load test |
| NFR-PERF-002 | Checkout validation rejection | p95 ≤ 400 ms | Load test |
| NFR-PERF-003 | Product search/list Kasir | p95 ≤ 300 ms untuk dataset baseline | Load test |
| NFR-PERF-004 | Transaction status lookup | p95 ≤ 300 ms | Load test |
| NFR-PERF-005 | Dashboard read dari projection | p95 ≤ 2 detik | Load test |
| NFR-PERF-006 | Operasi CRUD Admin biasa | p95 ≤ 700 ms | Load test |
| NFR-PERF-007 | UI harus menampilkan feedback `processing` ≤ 100 ms setelah aksi checkout | UI performance test |
| NFR-PERF-008 | Reporting/AI tidak boleh menambah query berat sinkron pada request checkout | 0 heavy synchronous analytics query | Trace/inspection |

### 14.2 Capacity dan scalability — Proposed Baseline

Dataset baseline:

- 500 merchant;
- maksimum 2.500 user aktif terdaftar;
- 100.000 produk total;
- 1.000.000 transaksi historis;
- rata-rata 3 line per transaksi;
- 50 submit checkout concurrent;
- 20 checkout/second sustained selama 15 menit;
- burst 50 checkout/second selama 60 detik.

| ID | Requirement | Target | Verifikasi |
|---|---|---|---|
| NFR-SCALE-001 | Sistem harus memenuhi NFR checkout pada dataset dan beban baseline. | Seluruh NFR-PERF checkout lulus | Load test |
| NFR-SCALE-002 | Dengan reporting + AI job aktif pada beban representatif, p95 checkout tidak boleh memburuk >20% dan tetap harus ≤500 ms. | Kedua batas terpenuhi | Mixed workload test |
| NFR-SCALE-003 | Sistem harus menerapkan backpressure/concurrency limit pada worker agar backlog tidak mengambil seluruh koneksi/resource checkout. | Checkout tetap lulus | Fault/load test |
| NFR-SCALE-004 | Sistem harus dapat menaikkan kapasitas application/worker secara independen secara logis, tanpa mengubah kontrak checkout. | Dibuktikan desain/deployment | Architecture review |
| NFR-SCALE-005 | Pagination/batch harus mencegah pembacaan seluruh transaksi merchant dalam satu request UI. | Tidak ada unbounded list | Inspection/test |

Angka concurrency wajib divalidasi stakeholder. Nilainya bertujuan membuat klaim “500+ merchant” dapat diuji, bukan menebak trafik produksi secara mutlak.

### 14.3 Availability dan reliability

| ID | Requirement | Target | Verifikasi |
|---|---|---|---|
| NFR-REL-001 | Target availability jalur POS untuk produk produksi | 99,9% per bulan, tidak termasuk maintenance terjadwal yang disetujui | Monitoring report |
| NFR-REL-002 | Kegagalan reporting/AI tidak boleh membuat endpoint checkout unavailable. | 100% pada fault test yang dirancang | Fault injection |
| NFR-REL-003 | Checkout atomik tidak boleh meninggalkan transaction/payment/stock parsial. | 0 inkonsistensi | Integration/fault test |
| NFR-REL-004 | Background job menggunakan retry terbatas dan deduplication. | Tidak ada infinite retry/duplicate aggregate | Test |
| NFR-REL-005 | Dashboard normal memiliki freshness ≤5 menit untuk ≥95% transaksi. | Proposed | Monitoring/test |
| NFR-REL-006 | Setiap analisis manual yang diterima harus memiliki status yang dapat dipantau sampai `READY` atau `FAILED`. | 100% request yang diterima | Job test |
| NFR-REL-007 | Acknowledged completed transaction harus tetap tersimpan saat process aplikasi restart. | 100% | Recovery test |
| NFR-REL-008 | Dependency lambat harus memiliki timeout dan tidak menahan resource tanpa batas. | Semua call eksternal memiliki timeout | Inspection/failure test |

Catatan: availability 99,9% adalah target produk, bukan jaminan prototype gratis. Demo MVP harus melaporkan hasil uptime/test aktual secara jujur.

### 14.4 Recovery dan continuity — Proposed Baseline

| ID | Requirement | Target |
|---|---|---|
| NFR-REC-001 | Tidak ada data checkout parsial pada application failure | Atomic rollback |
| NFR-REC-002 | RPO bencana database untuk target produksi | ≤15 menit; ideal mendekati nol sesuai biaya |
| NFR-REC-003 | RTO jalur POS target produksi | ≤60 menit |
| NFR-REC-004 | Backup harus diuji melalui restore, bukan hanya dibuat | Minimal sekali sebelum final demo/release candidate |
| NFR-REC-005 | Reporting projection dan insight harus dapat dibangun ulang dari source of truth | Ya |
| NFR-REC-006 | Prosedur recovery minimum harus terdokumentasi | Database unavailable, failed migration, worker backlog, failed deployment |

### 14.5 Security

| ID | Requirement | Target/verifikasi |
|---|---|---|
| NFR-SEC-001 | Password hashing memakai algoritma adaptif yang diakui seperti Argon2id atau bcrypt dengan cost yang ditinjau. | Inspection + test |
| NFR-SEC-002 | Seluruh trafik production menggunakan TLS. | Deployment test |
| NFR-SEC-003 | Session cookie, bila dipakai, harus `Secure`, `HttpOnly`, dan `SameSite` yang sesuai; token tidak disimpan sembarangan di log. | Security inspection |
| NFR-SEC-004 | Authorization negatif diuji untuk seluruh role dan endpoint sensitif. | Automated security matrix |
| NFR-SEC-005 | Tenant isolation diuji dengan ID valid milik merchant lain. | 0 cross-tenant access |
| NFR-SEC-006 | Input divalidasi dan output di-encode untuk mencegah injection/XSS sesuai interface. | Security test |
| NFR-SEC-007 | Database query harus parameterized atau melalui abstraction aman. | Code review/test |
| NFR-SEC-008 | Login dan endpoint sensitif memiliki rate limit yang terdokumentasi. | Security test |
| NFR-SEC-009 | Secret hanya berasal dari environment/secret manager dan tidak di-commit. | Repository scan |
| NFR-SEC-010 | Log tidak memuat password, session token, credential pembayaran, atau stack trace ke user. | Log test |
| NFR-SEC-011 | Dependency vulnerability scanning dijalankan pada CI atau sebelum release. | CI evidence |
| NFR-SEC-012 | Akses yang tidak sah dicatat secukupnya tanpa membocorkan data target. | Log test |

### 14.6 Privacy dan data isolation

| ID | Requirement |
|---|---|
| NFR-PRIV-001 | Sistem mengumpulkan hanya data pengguna dan bisnis yang dibutuhkan MVP. |
| NFR-PRIV-002 | Data merchant tidak digunakan untuk insight merchant lain. |
| NFR-PRIV-003 | Screenshot, seed, dan environment test menggunakan data sintetis. |
| NFR-PRIV-004 | Bila provider AI eksternal dipakai, data yang dikirim harus diminimalkan dan kebijakan provider ditinjau sebelum produksi. |
| NFR-PRIV-005 | Data deletion/retention production harus diputuskan sebelum merchant nyata digunakan. |

### 14.7 Usability dan accessibility

| ID | Requirement | Target |
|---|---|---|
| NFR-UX-001 | Kasir dapat menyelesaikan happy-path checkout tanpa dokumentasi teknis. | ≥90% pada usability test kecil yang direncanakan |
| NFR-UX-002 | Checkout happy path setelah login memerlukan langkah inti sesedikit mungkin. | Target desain: pilih item → review → metode → confirm |
| NFR-UX-003 | Semua error bisnis utama menyebutkan masalah dan tindakan berikutnya. | 100% error catalog/outlet/price/payment yang terdefinisi |
| NFR-UX-004 | Warna bukan satu-satunya penanda status. | UI inspection |
| NFR-UX-005 | Flow utama mendekati WCAG 2.1 AA untuk kontras, label, focus, dan keyboard. | Accessibility audit |
| NFR-UX-006 | Bahasa pengguna utama adalah Bahasa Indonesia yang konsisten dan tidak menampilkan jargon internal. | Content review |

### 14.8 Maintainability

| ID | Requirement |
|---|---|
| NFR-MNT-001 | Aturan checkout, pricing, catalog availability, authorization, validasi `User.outlet_id`, reporting, dan AI harus memiliki batas modul yang jelas. |
| NFR-MNT-002 | Logic bisnis kritis tidak boleh diduplikasi secara independen di frontend dan backend; backend menjadi validator final. |
| NFR-MNT-003 | Codebase harus memakai formatter, linter, naming convention, dan error format konsisten. |
| NFR-MNT-004 | Migration, seed, dan setup lokal harus terdokumentasi dan dapat direproduksi. |
| NFR-MNT-005 | Keputusan arsitektur besar harus memiliki rationale dan trade-off singkat. |
| NFR-MNT-006 | Satu engineer baru harus dapat menjalankan aplikasi lokal dari README tanpa knowledge tersembunyi. |
| NFR-MNT-007 | Reporting/AI dapat dimatikan tanpa mengubah checkout contract. |
| NFR-MNT-008 | Test kritis harus deterministic dan tidak bergantung pada provider AI nyata. |

### 14.9 Observability

| ID | Requirement |
|---|---|
| NFR-OBS-001 | Log terstruktur minimal berisi timestamp, level, service/module, correlation ID, safe merchant reference, actor reference, action, result, dan error category. |
| NFR-OBS-002 | Dashboard operasional minimum menampilkan checkout request rate, success/error rate, p95/p99 latency, database error/pool pressure, dan job backlog age. |
| NFR-OBS-003 | Alert minimum mencakup lonjakan checkout error, p95 melewati target, database unavailable, dan job backlog melewati freshness threshold. |
| NFR-OBS-004 | Informasi sensitif harus direduksi/redacted pada log dan metric label. |
| NFR-OBS-005 | Correlation ID harus dikembalikan secara aman pada error agar support dapat menelusuri masalah. |

### 14.10 Compatibility dan localization

| ID | Requirement |
|---|---|
| NFR-COMP-001 | Web mendukung dua versi terbaru browser Chromium dan Firefox; Safari terbaru sebaiknya diuji. |
| NFR-COMP-002 | UI minimum mendukung viewport tablet dan desktop yang ditetapkan desain. |
| NFR-LOC-001 | Currency ditampilkan sebagai IDR dengan format lokal Indonesia. |
| NFR-LOC-002 | Waktu ditampilkan dalam zona waktu merchant; default Iterasi 1 `Asia/Jakarta`. |
| NFR-LOC-003 | Timestamp antarsistem menggunakan representasi tidak ambigu seperti UTC/ISO 8601. |

---

## 15. Workload isolation requirements

| Workload | Pola | Consistency/freshness | Failure tolerance | Proteksi yang harus dibuktikan |
|---|---|---|---|---|
| Checkout | Read + write kecil, burst pada jam puncak | Strong; langsung | Sangat rendah | Atomic transaction, bounded query, priority resource, idempotency |
| Product browsing | Read tinggi, update lebih jarang | Harga divalidasi ulang saat commit | Sedang | Index/cache opsional, bounded result |
| Admin | Read/write sesekali, dapat burst | Strong untuk perubahan sendiri | Sedang | Permission, audit, rate/batch limit |
| Dashboard | Read agregat dan rentang waktu | Eventual, target ≤5 menit | Dapat stale | Projection/read model, bounded query |
| AI | Batch/CPU/network intensive | On-demand melalui trigger manual Owner | Tinggi | Worker concurrency limit, retry, dan timeout |

### Degradation order

Jika resource berada di bawah tekanan, sistem harus menurunkan layanan dalam urutan:

1. tunda insight generation;
2. kurangi concurrency reporting refresh;
3. layani dashboard dari data terakhir dan tandai stale;
4. batasi operasi admin berat/batch;
5. pertahankan product lookup dan checkout selama dependency inti masih sehat;
6. jika transaksi tidak dapat dijamin benar, tolak checkout dengan jelas daripada menerima secara tidak pasti.

---

## 16. Error model

| Code konseptual | Kondisi | Pesan pengguna/tindakan |
|---|---|---|
| `VALIDATION_ERROR` | Input tidak valid | Tandai field dan cara memperbaiki |
| `UNAUTHENTICATED` | Session tidak valid/kedaluwarsa | Login kembali |
| `FORBIDDEN` | Role/tenant tidak berhak | Akses ditolak; hubungi Owner bila perlu |
| `PRODUCT_INACTIVE` | Produk tidak lagi dijual | Hapus/ganti item |
| `PRICE_CHANGED` | Harga server berubah | Tampilkan total baru dan minta review |
| `INSUFFICIENT_STOCK` | Stok Outlet tidak cukup saat commit | Kurangi kuantitas/hapus item atau lakukan adjustment melalui Admin |
| `IDEMPOTENCY_CONFLICT` | Key sama dengan payload berbeda | Jangan submit sebagai transaksi yang sama; periksa status |
| `CHECKOUT_PROCESSING` | Hasil belum final | Tunggu dan cek status key yang sama |
| `CHECKOUT_NOT_CONFIRMED` | Hasil tidak diketahui client | Periksa status sebelum mencoba niat baru |
| `RATE_LIMITED` | Terlalu banyak request | Tunggu sesuai petunjuk retry |
| `DEPENDENCY_UNAVAILABLE` | Dependency inti tidak sehat | Checkout ditolak jelas; jangan menganggap pembayaran tercatat |
| `REPORT_STALE` | Projection terlambat | Tampilkan data terakhir + waktu update |
| `INSIGHT_UNAVAILABLE` | AI/job gagal | Dashboard tetap tampil; insight dicoba lagi |
| `INTERNAL_ERROR` | Error tak terduga | Tampilkan correlation ID, tanpa detail internal |

---

## 17. Testing and verification requirements

### 17.1 Test levels

| Level | Fokus wajib |
|---|---|
| Unit | Perhitungan total, validasi status produk/stok/outlet, role/permission rule, metric formula, retry decision |
| Integration | Authentication, tenant/outlet scope, product/inventory, atomic checkout, idempotency, projection, audit |
| Concurrency | Duplicate submit, checkout stok terakhir, dan penambahan/pengurangan stok bersamaan dengan checkout | 
| Security | Role negative cases, cross-tenant IDs, injection, rate limit, secret/log leakage |
| Performance | Checkout, product search, mixed workload reporting/AI |
| Failure injection | Database rollback, worker mati, AI timeout, duplicate event, response timeout |
| E2E | Owner onboarding → Admin setup → Kasir checkout → dashboard → insight |
| Accessibility/usability | Keyboard, labels, contrast, status/error comprehension |
| Recovery | Restart, retry job, rebuild projection, backup restore |

### 17.2 Minimum acceptance scenarios

| ID | Given | When | Then |
|---|---|---|---|
| AT-001 | Owner baru dengan email valid | Registrasi dan membuat merchant | Account Owner, merchant, dan kepemilikan terbentuk konsisten |
| AT-002 | Kasir Merchant A | Meminta produk/transaksi Merchant B | Tidak ada data B dikembalikan dan kejadian tercatat aman |
| AT-003 | Produk aktif dengan stok 5 pada Outlet Kasir | Kasir membeli 2 | Satu transaction completed, payment tercatat, stok menjadi 3 |
| AT-004 | Produk stok 1 pada Outlet A dan dua Kasir Outlet A | Checkout bersamaan masing-masing qty 1 | Tepat satu berhasil; satu ditolak; stok 0, bukan -1 |
| AT-005 | Idempotency key dan payload yang sama | Submit dua kali | Satu transaction ID, satu payment record, dan satu pengurangan stok |
| AT-006 | Idempotency key sama, cart berbeda | Submit kedua | Conflict; transaksi kedua tidak dibuat |
| AT-007 | Harga berubah setelah item masuk cart | Checkout | `PRICE_CHANGED`, tidak ada transaksi parsial, total baru ditampilkan |
| AT-008 | Produk dinonaktifkan atau stok tidak cukup setelah masuk cart | Checkout | Ditolak; tidak ada transaksi, payment, atau perubahan stok dibuat |
| AT-009 | Database error setelah sebagian operasi dicoba | Checkout | Rollback penuh; tidak ada completed transaction/payment/stock movement parsial |
| AT-010 | Server commit berhasil tetapi response client terputus | Kasir lookup key yang sama | Receipt transaksi yang sudah sama ditampilkan; tidak ada duplikasi |
| AT-011 | Reporting worker berhenti | Kasir checkout | Checkout tetap berhasil; dashboard menunjukkan freshness/stale |
| AT-012 | AI provider timeout | Owner membuka dashboard | Dashboard dasar tersedia; insight berstatus retry/failed |
| AT-013 | Product price diubah | Membuka receipt transaksi lama | Harga snapshot lama tetap tampil |
| AT-014 | Account Kasir dinonaktifkan | Menggunakan session lama untuk checkout | Request ditolak |
| AT-015 | 500 merchant dataset dan mixed workload aktif | Load test dijalankan | Target NFR-PERF dan NFR-SCALE terpenuhi |
| AT-016 | Owner membuat Admin aktif dengan email dan password awal | Staf login menggunakan email | Admin dapat mengakses data operasional Merchant tanpa mengelola Outlet, staf, atau AI; sistem tidak dapat menampilkan kembali password yang tersimpan |
| AT-017 | Transaksi `COMPLETED` tersedia pada beberapa waktu, produk, dan Outlet dalam periode terpilih | Owner membuka dashboard | Omzet, jumlah transaksi, AOV, tren penjualan/AOV, pola waktu, produk terlaris/tidak laku, dan perbandingan outlet sesuai dengan transaksi sumber serta scope yang dipilih |

### 17.3 Test evidence

Setiap acceptance gate harus menghasilkan bukti berupa:

- test name dan requirement ID;
- environment/commit yang diuji;
- data dan beban input;
- hasil aktual versus target;
- log/metric/screenshot yang relevan;
- status pass/fail;
- defect atau waiver bila gagal.

---

## 18. Requirements traceability matrix

Matriks ringkas ini menghubungkan kebutuhan pengguna dengan kelompok requirement sistem dan acceptance test. Prefix yang sama menunjukkan domain yang sama, sedangkan baris exact mapping di bawah dipakai untuk keputusan berisiko tinggi atau requirement dengan suffix khusus. Traceability detail per requirement dapat diperluas pada tool/test management saat implementasi.

| URS | SRS terkait | Bukti utama |
|---|---|---|
| UR-BIZ-001–003 | FR-CART, FR-CHK, FR-INV, FR-TEN; NFR-PERF, NFR-SCALE | AT-003–012, AT-015 |
| UR-BIZ-004 | NFR-SCALE, NFR-MNT, NFR-OBS | AT-015 + architecture review |
| UR-BIZ-005,008 | FR-REP, FR-AI; NFR-REL-002 | AT-011–012 |
| UR-BIZ-006 | FR-TEN; NFR-SEC-004–005 | AT-002 |
| UR-BIZ-007 | FR-CHK-009, FR-PAY-007, BR-006–007 | AT-013 |
| UR-OWN-001–003B | FR-AUTH, FR-TEN | AT-001 + owner/staff lifecycle tests |
| UR-OWN-004–007, termasuk UR-OWN-005A | FR-REP, FR-TRX | Dashboard E2E + AT-017 |
| UR-OWN-008–010 | FR-AI-001–012 | AT-012 + insight acceptance |
| UR-ADM-001–006 | FR-CAT, FR-INV, FR-TEN | UC-03 + AT-003–009,013 |
| UR-ADM-007–009 | FR-AUD, FR-TEN; NFR-SCALE-002 | Audit/permission + AT-015 |
| UR-CAS-001–006 | FR-AUTH, FR-CART, FR-PAY | Checkout E2E |
| UR-CAS-007–013 | FR-CHK, error model | AT-003–012 |
| UR-CAS-014 | FR-TRX-001,004,006 | Transaction-history acceptance + security test; scope final masih `OD-003` |
| UR-REP-001–008, termasuk UR-REP-003A | FR-REP, metric definitions | AT-011, AT-017 + reporting tests |
| UR-AI-001–010 | FR-AI-001–012; EXT-AI | AT-012 + AI tests |
| UR-SEC-001–009 | FR-AUTH, FR-TEN, FR-AUD; NFR-SEC/PRIV | AT-002,014 + security suite |
| UR-OPS-001–008 | FR-OPS; NFR-OBS/REL/REC/SCALE | AT-009–012,015 + restore test |

### 18.1 Exact mapping untuk keputusan dan risiko utama

| Kebutuhan pengguna/keputusan | Requirement sistem dan aturan | Bukti minimum |
|---|---|---|
| Lifecycle staf Owner-only (`UR-OWN-003–003B`) | `FR-AUTH-011–014`, `FR-TEN-005–008`, `BR-011`, `DR-001–002,011` | `AT-016` + security test role/Outlet |
| Category wajib dan soft-deactivation (`UR-ADM-001–002,006`) | `FR-CAT-001–010`, `BR-019`, `DR-008,011` | Category/Product integration test + historical transaction test |
| Checkout tepat satu kali (`UR-CAS-007–010`) | `FR-CHK-001–017`, `BR-008–010`, `IdempotencyRecord` | `AT-005–010` |
| Stok per Outlet dan konkurensi (`UR-ADM-003,008`, `UR-CAS-003,010`) | `FR-INV-001–009`, `BR-011A,014`, Inventory + StockMovement | `AT-003–004,008–009` |
| Riwayat transaksi wajib (`UR-CAS-014`) | `FR-TRX-001–007`, `DR-003–008` | Transaction-history acceptance/security test; batas Kasir mengikuti `OD-003` |
| Dashboard lengkap (`UR-OWN-004–006`, `UR-OWN-005A`, `UR-REP-001–008`, `UR-REP-003A`) | `FR-REP-001–010`, definisi metrik, `ReportingProjection` | `AT-011,017` + calculation test |
| AI manual Owner-only maks. 1x/hari (`UR-AI-001–010`) | `FR-AI-001–012`, `BR-016–017,020`, Insight + JobRecord | `AT-012` + authorization/idempotency/limit test |
| Isolasi 500+ Merchant (`UR-BIZ-003–006`, `UR-OPS-004–006`) | `FR-TEN-009–010`, `NFR-SEC-004–005`, `NFR-SCALE-001–005` | `AT-002,015` |

---

## 19. Out-of-scope system behavior

Sistem Iterasi 1 tidak diwajibkan untuk:

- menghubungkan payment gateway atau memverifikasi settlement bank;
- menerima split payment, cicilan, refund, partial refund, atau chargeback;
- menyimpan customer profile;
- menghitung pajak/diskon/promo kompleks;
- mengelola bahan baku, purchase order, supplier, atau inventory gudang terpisah;
- mengelola variant atau bundle produk;
- beroperasi offline dan melakukan conflict synchronization;
- mengirim receipt melalui SMS/email;
- menyediakan native Android/iOS;
- menyediakan BI ad-hoc query builder;
- membiarkan AI melakukan tindakan otomatis;
- menjamin SLA produksi berbayar pada deployment demo gratis.

Out-of-scope tidak boleh “diam-diam” diimplementasikan dengan mengorbankan requirement Must.

---

## 20. Decision gates sebelum baseline

| Gate | Status | Keputusan | Pemilik keputusan | Dampak |
|---|---|---|---|---|
| DG-001 | Open; default proposed tersedia | Payment record manual vs gateway | Product/Business | Mengunci FR-PAY dan checkout state |
| DG-002 | Open; default harga global | Harga Product master global vs override per Outlet | Product + Engineering | Mengunci relasi Product/Inventory dan pengalaman Admin |
| DG-003 | Locked | Seluruh akun login dengan email; role enum dan Outlet disimpan langsung pada User; lifecycle staf dikelola langsung dan hanya oleh Owner | Product + Security | Authorization matrix/test mengikuti keputusan ini |
| DG-004 | Open; default di luar Must | Discount/tax/refund scope | Product | Mengunci pricing, state, report formula |
| DG-005 | Partial: metrik Locked, freshness Open | Dashboard metrics/freshness | Product/Owner persona | Mengunci projection dan NFR-REL-005 |
| DG-006 | Partial: akses/trigger Locked, tipe insight Locked (multi-tipe BI), provider Open | Tipe BI MVP dan penggunaan provider | Product + Engineering | Mengunci data, cost, privacy, failure mode |
| DG-007 | Open; proposed baseline tersedia | Capacity/load target | Engineering + Business | Mengunci NFR-SCALE dan deployment test |
| DG-008 | Open; target dipisahkan | Availability/RPO/RTO untuk prototype vs target production | Engineering + Business | Mengunci biaya dan operational plan |
| DG-009 | Locked | Checkout hanya oleh Kasir pada Outlet tugasnya; Owner dan Admin tidak melakukan checkout (menutup `OD-010`) | Product + Security | Permission, UI, audit, dan validasi checkout mengikuti keputusan ini |

---

## 21. Definition of Done per requirement

Satu requirement dianggap selesai hanya bila:

1. acceptance criteria dipahami;
2. kode dan migration yang dibutuhkan selesai;
3. authorization dan tenant scope diuji;
4. happy path dan error path utama diuji;
5. log/metric relevan tersedia;
6. dokumentasi/API contract diperbarui;
7. tidak ada defect severity tinggi yang terbuka;
8. bukti test dapat ditautkan ke requirement ID;
9. hasil dapat didemonstrasikan bila user-facing;
10. perubahan terhadap URS/SRS tercatat bila implementasi menemukan asumsi salah.

---

## 22. Change control

Setiap perubahan requirement harus mencatat:

- requirement ID yang berubah;
- alasan dan sumber keputusan;
- perubahan teks sebelum/sesudah;
- dampak pada UX, data, API, security, performance, test, deployment, dan jadwal;
- kebutuhan migration/backward compatibility;
- siapa yang menyetujui;
- versi dokumen dan tanggal efektif.

Requirement yang sulit dibalik—tenant model, transaction contract, price snapshot, idempotency, dan payment boundary—harus direview sebelum implementasi besar.

---

## 23. Proposed sign-off

SRS dapat menjadi baseline setelah seluruh requirement Must konsisten dengan URS, decision gates kritis diputuskan, dan QA menyatakan requirement dapat diverifikasi.

| Peran | Nama | Keputusan | Tanggal | Catatan |
|---|---|---|---|---|
| Product/Business Owner |  | Approve / Revise |  |  |
| Engineering Lead |  | Approve / Revise |  |  |
| QA Lead |  | Approve / Revise |  |  |
| Security Reviewer |  | Approve / Revise |  |  |
| UX Representative |  | Approve / Revise |  |  |
