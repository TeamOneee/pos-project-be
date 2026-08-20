# MODUL 1 — PRODUCT-OVERVIEW.md (UPDATED)

---

# PRODUCT OVERVIEW — Full Document

## 1. Overview

Project ini merupakan sistem **Point of Sale (POS)** untuk bisnis yang memiliki satu merchant dengan beberapa outlet.

Sistem digunakan untuk membantu proses operasional penjualan, pengelolaan produk dan stok, pengelolaan karyawan, pengelolaan outlet, pencatatan transaksi, serta penyediaan insight bisnis menggunakan AI.

Arsitektur bisnis utama yang digunakan adalah:

- Multi-Tenant SaaS (banyak Merchant; satu Owner = satu Merchant)
- Multi Outlet
- Multi Kasir
- Stock Management
- Owner, Admin, dan Kasir memiliki scope dan tanggung jawab masing-masing
- AI Insight dapat dijalankan secara manual oleh Owner tanpa batasan harian

---

## 2. Struktur Bisnis

Struktur bisnis dalam sistem adalah:

```text
Merchant
│
├── Owner (scope Merchant)
│   └── Fokus: Manajemen Bisnis & Staf
│
├── Admin (scope Merchant)
│   └── Fokus: Manajemen Katalog & Stok Operasional
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

Sistem merupakan **multi-tenant SaaS**: platform dapat melayani banyak Merchant, namun setiap Owner memiliki tepat satu Merchant.

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

**B. Analisis Bisnis & Pengambilan Keputusan**
- **Dashboard Owner**: Melihat overview bisnis komprehensif (omzet, tren, performa outlet, top products, AOV, pola waktu)
- **Analytics Mendalam**: Menganalisis tren penjualan, pola waktu, AOV trend, dan performa produk (terlaris vs tidak laku)
- **AI Insight**: Memicu analisis AI secara manual, membaca hasil insight, dan mengambil keputusan bisnis berdasarkan rekomendasi

**C. Monitoring (View Only)**
- Owner dapat melihat katalog produk, kategori, dan stok, namun **tidak melakukan perubahan operasional** — itu adalah tanggung jawab Admin.

> **Ringkasan:** Owner berfokus pada **strategi bisnis, pengelolaan staf & outlet, dan pengambilan keputusan berdasarkan data & AI**. Owner tidak terlibat dalam aktivitas operasional harian (katalog, stok, checkout).

---

### 3.2 Admin

Admin berada pada **scope Merchant**, bukan scope satu outlet tertentu.

Artinya, satu Admin dapat menangani dan mengelola beberapa outlet dalam merchant yang sama.

#### Fokus Utama Admin:

**A. Manajemen Katalog (Category & Product)**
- **Manajemen Category**: Membuat, mengubah, dan menonaktifkan kategori produk
- **Manajemen Product**: Membuat, mengubah harga, mengubah status, dan menonaktifkan produk
- **Katalog Produk**: Admin adalah pemilik utama data product & category untuk operasional sehari-hari

**B. Manajemen Stok Operasional**
- **Monitoring Stok**: Melihat stok per produk per outlet secara real-time
- **Adjustment Stok**: Mengubah jumlah stok suatu produk di outlet tertentu (wajib dengan alasan)
- **Bulk Update Stok**: Memperbarui stok banyak produk sekaligus dalam satu outlet
- **Transfer Stok**: Memindahkan stok antar outlet

**C. Dashboard Inventory**
- **Inventory Overview**: Dashboard khusus yang menampilkan ringkasan stok, produk mendekati habis, dan produk sudah habis
- **Low Stock Alerts**: Melihat daftar produk dengan stok di bawah threshold untuk tindakan segera

**D. Monitoring (View Only)**
- Admin dapat melihat transaksi untuk keperluan penelusuran, namun **tidak melakukan checkout**

> **Ringkasan:** Admin berfokus pada **pengelolaan katalog produk dan ketersediaan stok untuk operasi checkout harian**. Admin adalah "pengelola toko" yang memastikan produk tersedia dan stok mencukupi. Admin tidak memiliki akses ke dashboard bisnis Owner, analytics mendalam, atau AI Insight.

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

> **Ringkasan:** Cashier berfokus pada **proses transaksi dari awal hingga selesai**. Cashier tidak memiliki akses ke dashboard, analytics, AI insights, atau manajemen stok/katalog. Sistem diprioritaskan agar checkout cepat dan tidak terganggu oleh proses lain.

---

## 4. Product dan Category

Product berada pada **scope Merchant**.

Satu merchant dapat memiliki banyak product.

Product memiliki category yang digunakan untuk melakukan pengelompokan produk.

Relasi:

Merchant 1 ───── N Product

Category 1 ───── N Product

Category dibuat sebagai entitas terpisah agar satu category dapat digunakan oleh banyak product.

### 4.1 Aturan Category & Product

- **Setiap Product wajib memiliki satu Category aktif** saat dipilih
- Category dapat **dinonaktifkan (soft delete)**, bukan dihapus fisik
- Category nonaktif **tidak dapat dipilih** untuk Product baru
- Product dapat **dinonaktifkan (soft delete)**, tidak menghapus riwayat transaksi

### 4.2 Ownership Category & Product

**Category dan Product dikelola oleh Owner dan Admin.**

- **Owner** dan **Admin** dapat membuat, mengubah, atau menonaktifkan product dan category.
- **Cashier** hanya dapat melihat product aktif untuk keperluan transaksi (read-only).

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

### 5.1 Aturan Inventory

- **Stok numerik** disimpan per kombinasi `(outlet_id, product_id)`
- **Stok tidak boleh negatif** (FR-INV-002 / BR-011A)
- **Adjustment manual** untuk menambah atau mengurangi stok **wajib memiliki alasan**
- Setiap perubahan stok tercatat dalam **audit trail** (siapa, kapan, sebelum, sesudah, alasan)

### 5.2 Ownership Inventory

**Inventory dikelola oleh Admin.**

- **Admin** dapat melakukan adjustment stok, bulk update, dan transfer stok.
- **Owner** hanya dapat melihat stok (read-only).
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
- Unit price (snapshot)
- Subtotal

Harga pada saat transaksi perlu disimpan agar histori transaksi tetap valid apabila harga product berubah di kemudian hari.

### 6.1 Aturan Transaksi

- **Riwayat transaksi wajib dipertahankan** (tidak boleh dihapus)
- **Harga dan nama item saat penjualan disimpan sebagai snapshot**
- Transaksi final **COMPLETED** tidak dapat diubah
- Satu checkout menghasilkan **paling banyak satu transaksi final**

### 6.2 Uang (Currency)

- Semua nilai uang menggunakan exact **`DECIMAL(15,2)`** / **`NUMERIC(15,2)`** di database
- API mengirim dan menerima nilai uang sebagai **decimal string** (misal `"15000.00"`), bukan floating point
- Hal ini menghindari masalah pembulatan dan presisi

### 6.3 Payment Gateway

**Payment gateway tidak menjadi bagian MVP.**

Sistem hanya mencatat pembayaran manual:
- `CASH` — pembayaran tunai
- `CASHLESS_MANUAL` — pembayaran non-tunai (QRIS, transfer, kartu) dicatat manual oleh kasir

Keputusan detail payment record masih menjadi gate sebelum baseline.

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
- Menjaga efisiensi penggunaan resource

---

## 9. Dashboard

### 9.1 Dashboard Owner

**Must mencakup:**
- **Omzet** (total revenue)
- **Jumlah transaksi** (total transactions)
- **AOV** (Average Order Value)
- **Tren penjualan** (sales trend)
- **Tren AOV** (AOV trend)
- **Pola waktu** (time pattern / peak hours)
- **Produk terlaris** (top products by revenue & quantity)
- **Produk tidak laku** (underperforming products)
- **Perbandingan Outlet** (outlet performance)
- **Perbandingan periode** (period comparison)
- **Waktu pembaruan data** (last updated timestamp)

### 9.2 Dashboard Admin

**Fokus pada Inventory:**
- Total outlet, total produk, total stok
- Jumlah produk low stock
- Jumlah produk out of stock
- Daftar produk mendekati habis per outlet
- Daftar produk sudah habis per outlet

---

## 10. Ringkasan Role & Tanggung Jawab

| Role | Scope | Fokus Utama | Boleh Mengubah | Hanya Membaca |
|---|---|---|---|---|
| **Owner** | Merchant | Strategi bisnis, staf, outlet, AI | Merchant, Outlet, User | Category, Product, Inventory, Transaction, AI Insight |
| **Admin** | Merchant | Katalog produk & stok operasional | Category, Product, Inventory | Transaction |
| **Cashier** | 1 Outlet | Transaksional | Cart, Transaction (checkout) | Product (aktif), Inventory (stok), Transaction (outlet sendiri) |

---

## 11. Batasan Sistem

Batasan berikut menjadi scope yang disepakati untuk project.

### Business Structure
- Sistem merupakan **multi-tenant SaaS** — dapat melayani banyak merchant; setiap Owner memiliki tepat satu merchant
- Satu merchant dapat memiliki banyak outlet
- Satu outlet dapat memiliki banyak cashier
- Satu cashier hanya terhubung dengan satu outlet
- Owner berada pada scope merchant dan mengelola Merchant/Outlet/staf
- Admin berada pada scope merchant dan dapat mengelola beberapa outlet
- Cashier berada pada scope outlet

### Product & Category
- Product berada pada scope merchant
- Category dibuat sebagai entitas terpisah
- Setiap Product wajib memiliki satu Category aktif
- Category dapat dinonaktifkan (soft delete), bukan dihapus fisik
- **Owner** dan **Admin** dapat membuat, mengubah, atau menonaktifkan product & category
- Cashier hanya dapat melihat product & category (read-only)

### Inventory
- Sistem menggunakan stock management
- Stock dikelola berdasarkan outlet dan product
- Stok tidak boleh negatif
- Adjustment manual wajib memiliki alasan dan audit trail
- **Admin** adalah pemilik utama data inventory (adjustment, transfer, monitoring)
- Owner dapat melihat inventory namun tidak melakukan adjustment

### Transaction
- Transaction selalu terkait dengan outlet
- Transaction mencatat cashier yang melakukan transaksi
- Transaction dapat memiliki banyak transaction item
- Hanya Cashier yang dapat melakukan checkout
- Riwayat transaksi wajib dipertahankan
- Harga dan nama item disimpan sebagai snapshot
- Transaction tidak menggunakan payment gateway (manual cash/cashless)

### Uang (Currency)
- Semua nilai uang menggunakan `DECIMAL(15,2)` / `NUMERIC(15,2)`
- API mengirim nilai uang sebagai decimal string

### AI
- AI hanya dapat dipicu secara manual oleh Owner
- AI tidak menggunakan cron job sebagai trigger utama
- Tidak ada batas harian analisis AI
- AI digunakan untuk menghasilkan insight dan rekomendasi berdasarkan data bisnis
- AI tidak melakukan perubahan data bisnis secara langsung

### Dashboard
- **Owner Dashboard**: Komprehensif (omzet, transaksi, AOV, tren, pola waktu, produk, outlet, periode, waktu pembaruan)
- **Admin Dashboard**: Fokus inventory (stok, low stock alerts, out of stock alerts)

---

## 12. Scope yang Tidak Ditangani

Project ini secara eksplisit tidak memprioritaskan:

- **Payment Gateway Integrasi**: Sistem hanya mencatat manual, tidak terintegrasi gateway eksternal
- **Laporan Ad-Hoc**: Query analitis bebas, dashboard hanya menyediakan overview preset
- **Refund / Void Transaksi**: Di luar scope MVP (future)
- **AI untuk Admin/Cashier**: AI hanya untuk Owner

---

## 13. Prinsip Arsitektur

Arsitektur sistem akan dikembangkan dengan mempertimbangkan:

- Scalability
- Performance
- Data consistency
- Cost efficiency
- Separation of workload
- Maintainability

Sistem perlu mampu menangani kondisi traffic normal maupun peningkatan traffic secara tiba-tiba tanpa melakukan over-provisioning resource secara tidak perlu.

Untuk workload yang berbeda, sistem dapat mempertimbangkan pemisahan:

**Write Heavy** → Primary Database
**Read Heavy** → Read Replica

Read-heavy workload dapat digunakan untuk kebutuhan seperti:
- Dashboard Owner
- Analytics
- AI data processing

Write-heavy workload seperti:
- Checkout
- Transaction
- Stock update

tetap diprioritaskan agar responsif dan konsisten.

---

## 14. Ringkasan Keputusan

| Aspek | Keputusan |
|---|---|
| Merchant | Multi-Tenant (satu Owner = satu Merchant) |
| Outlet | Multi Outlet |
| Cashier | Multi Cashier |
| Cashier Scope | 1 Cashier → 1 Outlet (fokus transaksional) |
| Admin Scope | Merchant (fokus katalog & stok operasional) |
| Owner Scope | Merchant (fokus strategi, staf, outlet, AI) |
| Stock | Ada, dikelola oleh Admin |
| Category | Entitas terpisah, dikelola oleh Owner & Admin |
| Product | Dikelola oleh Owner & Admin (Cashier read-only) |
| AI Trigger | Manual oleh Owner (tanpa batas harian) |
| AI Scope | Merchant (hanya Owner yang mengelola) |
| Transaction | Hanya Cashier yang dapat checkout |
| Payment Gateway | Tidak termasuk MVP |
| Uang | DECIMAL/NUMERIC, API sebagai decimal string |
| Owner Dashboard | Komprehensif (omzet, transaksi, AOV, tren, pola waktu, produk, outlet, periode, waktu pembaruan) |
| Admin Dashboard | Fokus inventory (stok + alerts) |
| Scalability | Menjadi consideration utama (scale when needed) |
| Cost Efficiency | Menjadi consideration utama |

---

**End of Document**