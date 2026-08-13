# PRODUCT OVERVIEW — Full Document

## 1. Overview

Project ini merupakan sistem **Point of Sale (POS)** untuk bisnis yang memiliki satu merchant dengan beberapa outlet.

Sistem digunakan untuk membantu proses operasional penjualan, pengelolaan produk dan stok, pengelolaan karyawan, pengelolaan outlet, pencatatan transaksi, serta penyediaan insight bisnis menggunakan AI.

Arsitektur bisnis utama yang digunakan adalah:

- Multi-Tenant SaaS (banyak Merchant; satu Owner = satu Merchant)
- Multi Outlet
- Multi Kasir
- Stock Management
- Owner dan Admin berada pada scope Merchant
- Kasir berada pada scope Outlet
- AI Insight dapat dijalankan secara manual oleh Owner tanpa batasan harian

---

## 2. Struktur Bisnis

Struktur bisnis dalam sistem adalah:

```text
Merchant
│
├── Owner (scope Merchant)
│   └── Fokus: Manajemen Bisnis & Katalog
│
├── Admin (scope Merchant)
│   └── Fokus: Manajemen Stok Operasional
│
├── Outlet A
│   ├── Cashier 1
│   ├── Cashier 2
│   └── Stock
│
├── Outlet B
│   ├── Cashier 3
│   ├── Cashier 4
│   └── Stock
│
└── Outlet C
    ├── Cashier 5
    └── Stock
```

### 2.1 Merchant

Sistem merupakan **multi-tenant SaaS**: platform dapat melayani banyak Merchant, namun setiap Owner memiliki tepat satu Merchant (FR-TEN-002).

Artinya, satu Merchant memiliki beberapa Outlet, dan seluruh data (katalog, inventory, transaksi) di-scope per Merchant.

Merchant menjadi entitas utama yang menaungi:

- Owner
- Admin
- Outlet
- Product
- Category
- AI Insight

---

## 3. Role dan Scope Pengguna

Sistem memiliki tiga role utama:

- Owner
- Admin
- Cashier

Setiap role memiliki scope dan tanggung jawab utama sebagai berikut:

---

### 3.1 Owner

Owner berada pada **scope Merchant**.

Owner tidak terikat pada outlet tertentu karena tanggung jawabnya berkaitan dengan keseluruhan bisnis.

#### Fokus Utama Owner:

**A. Manajemen Bisnis & Struktur**
- **Manajemen Merchant**: Mengelola profil merchant (nama, konfigurasi global seperti `low_stock_threshold`)
- **Manajemen Outlet**: Membuat, mengubah, dan menonaktifkan outlet
- **Manajemen User/Staf**: Membuat, mengubah role, dan menonaktifkan Admin & Cashier

**B. Manajemen Katalog (Product & Category)**
- **Manajemen Category**: Membuat, mengubah, dan menonaktifkan kategori produk
- **Manajemen Product**: Membuat, mengubah harga, mengubah status, dan menonaktifkan produk
- **Katalog Produk**: Owner adalah pemilik tunggal data product & category. Admin tidak memiliki akses untuk mengubah katalog.

**C. Analisis Bisnis & Pengambilan Keputusan**
- **Dashboard Owner**: Melihat overview bisnis komprehensif (omzet, tren, performa outlet, top products, AOV, pola waktu)
- **Analytics Mendalam**: Menganalisis tren penjualan, pola waktu, AOV trend, dan performa produk (terlaris vs tidak laku)
- **AI Insight**: Memicu analisis AI secara manual, membaca hasil insight, dan mengambil keputusan bisnis berdasarkan rekomendasi

**D. Monitoring Stok (View Only)**
- Owner dapat melihat stok dan alarm stok rendah, namun **tidak melakukan adjustment stok** — itu adalah tanggung jawab Admin.

> **Ringkasan:** Owner berfokus pada **strategi bisnis, pengelolaan katalog, dan pengambilan keputusan berdasarkan data & AI**. Owner tidak terlibat dalam aktivitas stok operasional harian atau checkout.

---

### 3.2 Admin

Admin berada pada **scope Merchant**, bukan scope satu outlet tertentu.

Artinya, satu Admin dapat menangani dan mengelola beberapa outlet dalam merchant yang sama.

#### Fokus Utama Admin:

**A. Manajemen Stok Operasional**
- **Monitoring Stok**: Melihat stok per produk per outlet secara real-time
- **Adjustment Stok**: Mengubah jumlah stok suatu produk di outlet tertentu (dengan alasan/justifikasi)
- **Bulk Update Stok**: Memperbarui stok banyak produk sekaligus dalam satu outlet
- **Transfer Stok**: Memindahkan stok antar outlet

**B. Dashboard Inventory**
- **Inventory Overview**: Dashboard khusus yang menampilkan ringkasan stok, produk mendekati habis, dan produk sudah habis
- **Low Stock Alerts**: Melihat daftar produk dengan stok di bawah threshold untuk tindakan segera

**C. Monitoring (View Only)**
- Admin dapat melihat daftar produk dan kategori, namun **tidak dapat mengubah atau membuat** product/category
- Admin dapat melihat transaksi untuk keperluan penelusuran, namun **tidak melakukan checkout**

> **Ringkasan:** Admin berfokus pada **ketersediaan stok untuk operasi checkout harian**. Admin adalah "penjaga gudang" yang memastikan outlet siap berjualan. Admin tidak memiliki akses untuk mengubah katalog produk atau melakukan analisis bisnis mendalam.

---

### 3.3 Cashier

Cashier berada pada **scope Outlet**.

Satu Cashier hanya terhubung dengan **satu outlet**.

Namun, satu outlet dapat memiliki banyak Cashier.

Relasi:

Outlet 1 ───── N Cashier

Contoh:

Outlet A
├── Cashier 1
├── Cashier 2
└── Cashier 3

Outlet B
├── Cashier 4
└── Cashier 5

#### Fokus Utama Cashier:

**A. Transaksional**
- **Cart Management**: Menambahkan produk ke keranjang, mengubah kuantitas, menghapus item
- **Checkout**: Melakukan checkout pembayaran (cash / cashless manual)
- **Melihat Produk**: Mencari dan memfilter produk aktif yang tersedia di outlet tugasnya

**B. Riwayat Transaksi**
- Melihat daftar transaksi yang dilakukan di outlet-nya sendiri
- Melihat detail transaksi yang dilakukan sendiri

> **Ringkasan:** Cashier berfokus pada **proses transaksi dari awal hingga selesai**. Cashier tidak memiliki akses ke dashboard, analytics, AI insights, atau manajemen stok. Sistem diprioritaskan agar checkout cepat dan tidak terganggu oleh proses lain.

---

## 4. Product dan Category

Product berada pada **scope Merchant**.

Satu merchant dapat memiliki banyak product.

Product memiliki category yang digunakan untuk melakukan pengelompokan produk.

Relasi:

Merchant 1 ───── N Product

Category 1 ───── N Product

Category dibuat sebagai entitas terpisah agar satu category dapat digunakan oleh banyak product.

### 4.1 Ownership Product & Category

**Product dan Category adalah milik Owner.**

- Hanya **Owner** yang dapat membuat, mengubah, atau menonaktifkan product dan category.
- **Admin** hanya dapat melihat product dan category (read-only) untuk keperluan manajemen stok.
- **Cashier** hanya dapat melihat product aktif untuk keperluan transaksi.

---

## 5. Stock Management

Sistem **menggunakan stock management**.

Stock tidak disimpan langsung sebagai atribut global pada Product karena satu product dapat memiliki jumlah stock yang berbeda pada setiap outlet.

Contoh:

Product: Coca Cola

Outlet A → 20
Outlet B → 10
Outlet C → 5

Karena itu, stock dikelola berdasarkan kombinasi:

Outlet + Product

Secara konsep:

Outlet
   │
   └── Inventory ── Product

Inventory menyimpan informasi stock product pada outlet tertentu.

Stock akan berkaitan dengan proses transaksi dan checkout.

### 5.1 Ownership Inventory

**Inventory adalah milik Admin.**

- Hanya **Admin** (dan Owner jika diperlukan) yang dapat melakukan adjustment stok, bulk update, dan transfer stok.
- **Admin** bertanggung jawab menjaga ketersediaan stok di semua outlet.
- **Cashier** hanya dapat melihat stok saat menambahkan item ke keranjang (untuk validasi), namun tidak dapat mengubah stok secara langsung.

---

## 6. Transaction

Setiap proses checkout oleh Cashier akan menghasilkan Transaction.

Transaction harus dapat mengetahui:

- Outlet tempat transaksi terjadi
- Cashier yang melakukan transaksi
- Transaction number
- Subtotal
- Total
- Status
- Waktu transaksi

Relasi utama:

Outlet 1 ───── N Transaction

Cashier 1 ───── N Transaction

Satu transaksi dapat memiliki banyak product.

Karena itu digunakan entitas `Transaction Item`.

Transaction
│
├── Product A
├── Product B
└── Product C

`Transaction Item` menyimpan informasi seperti:

- Product
- Quantity
- Unit price
- Subtotal

Harga pada saat transaksi perlu disimpan agar histori transaksi tetap valid apabila harga product berubah di kemudian hari.

### 6.1 Ownership Transaction

**Transaction adalah milik Cashier dan Transaction Module.**

- Hanya **Cashier** yang dapat membuat transaksi (checkout).
- **Owner** dan **Admin** dapat melihat transaksi untuk keperluan monitoring dan analisis.
- **Cashier** hanya dapat melihat transaksi di outlet-nya sendiri.

---

## 7. AI Insight

Sistem menyediakan fitur **AI Insight** untuk membantu Owner memahami kondisi bisnis.

AI digunakan untuk melakukan analisis berdasarkan data bisnis yang tersedia.

Beberapa insight/rekomendasi yang dapat dihasilkan antara lain:

- Prediksi stock akan habis
- Rekomendasi restock
- Rekomendasi pemindahan stock antar outlet
- Analisis produk terlaris
- Analisis produk yang kurang laku
- Analisis performa outlet
- Tren penjualan
- Pola waktu penjualan
- AOV trend

AI Insight berada pada **scope Merchant**, karena analisis dapat menggunakan data bisnis dari beberapa outlet.

Hubungan antara Merchant dan AI Insight bersifat **1:1**.

Sistem **tidak menyimpan histori analisis**. AI murni digunakan untuk memberikan **penjelasan / reasoning bisnis pada hari tersebut**. Setiap analisis baru akan **meng-update insight yang sama** pada merchant.

Karena tidak ada histori, fitur seperti daftar insight lama atau dismiss tidak diperlukan.

### 7.1 Ownership AI Insight

**AI Insight adalah milik Owner.**

- Hanya **Owner** yang dapat memicu analisis AI (manual trigger).
- Hanya **Owner** yang dapat melihat hasil insight.
- **Admin** dan **Cashier** tidak memiliki akses ke AI Insight.

---

## 8. AI Trigger dan Usage Limitation

Analisis AI **tidak dijalankan secara otomatis menggunakan cron job**.

AI dipicu secara **manual oleh Owner** melalui fitur `Analyze with AI`.

Flow:

Owner
  │
  │ Click "Analyze with AI"
  ↓
System
  │
  │ Check if analysis already running (idempotent)
  ↓
AI Analysis (asynchronous)
  │
  ↓
Insight / Recommendation

Hasil analisis akan **meng-update insight merchant** (bukan membuat data baru). `updated_at` pada insight menandakan waktu analisis terakhir.

### Batasan AI

**Tidak ada limit harian** — Owner dapat memicu analisis kapan saja (FR-AI-012, ASM-010, UR-AI-010).

Mencegah request berulang dilakukan lewat **idempotency**: jika job analisis masih berjalan untuk merchant, request baru ditolak/409 hingga selesai.

Tujuan dari pembatasan ini:

- Menghindari spam request ke AI
- Mengurangi penggunaan token
- Menghindari analisis berulang yang terlalu sering
- Menjaga efisiensi penggunaan resource

---

## 9. Ringkasan Role & Tanggung Jawab

| Role | Scope | Fokus Utama | Boleh Mengubah | Hanya Membaca |
| :--- | :--- | :--- | :--- | :--- |
| **Owner** | Merchant | Strategi bisnis, katalog, analisis, AI | Merchant, Outlet, User, Category, Product | Inventory, Transaction, AI Insight |
| **Admin** | Merchant | Stok operasional | Inventory (adjustment, transfer, bulk) | Product, Category, Transaction |
| **Cashier** | 1 Outlet | Transaksional | Cart, Transaction (checkout) | Product (aktif), Inventory (stok), Transaction (outlet sendiri) |

---

## 10. Batasan Sistem

Batasan berikut menjadi scope yang disepakati untuk project.

### Business Structure
- Sistem merupakan **multi-tenant SaaS** — dapat melayani banyak merchant; setiap Owner memiliki tepat satu merchant pada MVP (FR-TEN-002)
- Satu merchant dapat memiliki banyak outlet
- Satu outlet dapat memiliki banyak cashier
- Satu cashier hanya terhubung dengan satu outlet
- Owner berada pada scope merchant dan mengelola Merchant/Outlet/staf
- Admin berada pada scope merchant dan dapat mengelola beberapa outlet
- Cashier berada pada scope outlet

### Product & Category
- Product berada pada scope merchant
- Category dibuat sebagai entitas terpisah
- **Hanya Owner** yang dapat membuat, mengubah, atau menonaktifkan product & category
- Admin dan Cashier hanya dapat melihat product & category (read-only)

### Inventory
- Sistem menggunakan stock management
- Stock dikelola berdasarkan outlet dan product
- Stock berkaitan dengan proses checkout
- **Admin adalah pemilik utama** data inventory (adjustment, transfer, monitoring)
- Owner dapat melihat inventory namun tidak melakukan adjustment (kecuali darurat)

### Transaction
- Transaction selalu terkait dengan outlet
- Transaction mencatat cashier yang melakukan transaksi
- Transaction dapat memiliki banyak transaction item
- **Hanya Cashier** yang dapat melakukan checkout
- Transaction tidak menggunakan payment gateway (manual cash/cashless)

### AI
- AI hanya dapat dipicu secara manual oleh Owner
- AI tidak menggunakan cron job sebagai trigger utama
- Tidak ada batas harian analisis AI (FR-AI-012)
- AI digunakan untuk menghasilkan insight dan rekomendasi berdasarkan data bisnis
- AI tidak melakukan perubahan data bisnis secara langsung tanpa melalui sistem

### Dashboard
- **Owner Dashboard**: Komprehensif (omzet, tren, performa outlet, top products, AOV, pola waktu, AI)
- **Admin Dashboard**: Fokus inventory (stok, low stock alerts, overview outlet)
- **Cashier**: Tidak memiliki akses dashboard

---

## 11. Scope yang Tidak Ditangani

Project ini secara eksplisit tidak memprioritaskan (bisa ada tapi bukan fokus utama):

- **Admin Deep-Dive Analytics**: Admin fokus stok operasional, analisis bisnis menitikberatkan pada Owner
- **Admin Product Management**: Admin tidak dapat mengubah product/category
- **AI untuk Admin/Cashier**: AI hanya untuk Owner
- **Payment Gateway Integrasi**: Sistem hanya mencatat manual, tidak terintegrasi gateway eksternal
- **Laporan Ad-Hoc**: Query analitis bebas, dashboard hanya menyediakan overview preset

---

## 12. Prinsip Arsitektur

Arsitektur sistem akan dikembangkan dengan mempertimbangkan:

- Scalability
- Performance
- Data consistency
- Cost efficiency
- Separation of workload
- Maintainability

Sistem perlu mampu menangani kondisi traffic normal maupun peningkatan traffic secara tiba-tiba tanpa melakukan over-provisioning resource secara tidak perlu.

Untuk workload yang berbeda, sistem dapat mempertimbangkan pemisahan:

Write Heavy
    ↓
Primary Database

Read Heavy
    ↓
Read Replica

Read-heavy workload dapat digunakan untuk kebutuhan seperti:

- Dashboard Owner
- Analytics
- AI data processing

Sedangkan write-heavy workload seperti:

- Checkout
- Transaction
- Stock update

tetap diprioritaskan agar responsif dan konsisten.

---

## 13. Prinsip Pengembangan

Dokumen ini digunakan sebagai **single source of truth** untuk memahami konteks dan batasan project.

Sebelum mengubah struktur database, business flow, role, atau architecture, perubahan sebaiknya didiskusikan dan disepakati bersama tim.

Jika terdapat perubahan requirement, dokumen ini perlu diperbarui agar seluruh anggota memiliki pemahaman yang sama.

---

## 14. Ringkasan Keputusan

| Aspek | Keputusan |
| :--- | :--- |
| Merchant | Multi-Tenant (satu Owner = satu Merchant) |
| Outlet | Multi Outlet |
| Cashier | Multi Cashier |
| Cashier Scope | 1 Cashier → 1 Outlet (fokus transaksional) |
| Admin Scope | Merchant (fokus stok operasional) |
| Owner Scope | Merchant (fokus strategi, katalog, analisis, AI) |
| Stock | Ada, dikelola oleh Admin |
| Category | Entitas terpisah, dikelola oleh Owner |
| Product | Dikelola oleh Owner (Admin read-only) |
| AI Trigger | Manual oleh Owner (tanpa batas harian) |
| AI Scope | Merchant (hanya Owner yang mengelola) |
| Transaction | Hanya Cashier yang dapat checkout |
| Owner Dashboard | Komprehensif (bisnis + analytics + AI) |
| Admin Dashboard | Fokus inventory (stok + alerts) |
| Scalability | Menjadi consideration utama (scale when needed) |
| Cost Efficiency | Menjadi consideration utama |

---

**End of Document**