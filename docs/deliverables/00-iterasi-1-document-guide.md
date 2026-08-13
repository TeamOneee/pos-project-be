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
| Role | Satu User memiliki tepat satu role enum: `OWNER`, `ADMIN`, atau `CASHIER`. |
| Scope staf | Admin berada pada Merchant dengan `User.outlet_id = null`; Kasir berada pada tepat satu Outlet aktif. |
| Tanggung jawab | Owner mengelola Merchant, Outlet, dan lifecycle staf. Admin mengelola Category, Product master, harga, dan inventory seluruh Outlet. Kasir menjalankan penjualan pada Outlet tugasnya. |
| Checkout | Hanya Kasir yang dapat melakukan checkout, pada Outlet tugasnya. Owner dan Admin tidak memiliki permission checkout. |
| Category | Setiap Product wajib memiliki satu Category aktif saat dipilih. Category dinonaktifkan, bukan dihapus fisik. |
| Inventory | Stok numerik disimpan per kombinasi Product + Outlet dan tidak boleh negatif. Adjustment manual untuk menambah atau mengurangi stok wajib memiliki alasan dan audit. |
| Transaksi | Riwayat transaksi wajib dipertahankan. Harga dan nama item saat penjualan disimpan sebagai snapshot. |
| Uang | Nilai uang menggunakan exact `DECIMAL/NUMERIC`; kontrak API mengirim nilai uang sebagai decimal string. |
| Dashboard Owner | Must mencakup omzet, jumlah transaksi, AOV, tren penjualan/AOV, pola waktu, produk terlaris/tidak laku, perbandingan Outlet, periode, dan waktu pembaruan. |
| AI/BI | **Fitur "AI Insight" diimplementasikan sebagai Business Intelligence (BI)**: kumpulan insight analitik berbasis data (beberapa tipe), dengan AI sebagai mesin pengerja/penjelas, bukan satu tipe insight tunggal. Hanya Owner yang dapat memicu dan melihat BI insight. Trigger manual maksimal satu kali per hari per merchant; pemrosesan tetap asynchronous dan terlindung dari checkout. MVP menyediakan **beberapa tipe insight BI** (tren penjualan, perbandingan Outlet, produk terlaris/tidak laku, pola waktu, tren AOV), bukan hanya satu tipe. |
| Payment gateway | Tidak menjadi bagian MVP. Sistem mencatat pembayaran manual; keputusan detail payment record masih menjadi gate sebelum baseline. |

## 5. Keputusan yang masih terbuka

| ID | Keputusan yang dibutuhkan | Default usulan saat ini |
|---|---|---|
| OD-001 | Batas final payment record manual | `CASH` dan `CASHLESS_MANUAL`; tidak memindahkan dana |
| OD-002 | Harga Product global atau dapat dioverride per Outlet | Harga global pada MVP |
| OD-003 | Riwayat Kasir hanya transaksi sendiri atau seluruh Outlet | Belum diputuskan |
| OD-004 | Diskon, pajak, dan service charge | Di luar Must MVP |
| OD-005 | Refund/void transaksi final | Di luar Must MVP |
| OD-006 | Freshness dashboard | Maksimal lima menit untuk 95% pembaruan |
| OD-007 | BI insight minimum untuk demo | **Locked**: beberapa tipe — tren penjualan, perbandingan Outlet, produk terlaris/tidak laku, pola waktu, dan tren AOV |
| OD-008 | Kewajiban memakai provider/model AI eksternal | Tidak wajib |
| OD-009 | Target concurrency resmi | Menggunakan proposed baseline SRS sampai divalidasi |

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
| Reporting projection | Data turunan untuk dashboard; bukan sumber kebenaran checkout |
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
