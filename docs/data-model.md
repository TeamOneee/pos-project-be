# Entity Relationship Diagram (ERD)

## 1. Overview

Sistem menggunakan konsep **Multi-Tenant SaaS (banyak Merchant, satu Owner = satu Merchant) – Multi Outlet – Multi Kasir – Stock Management**.

Database terdiri dari beberapa entitas utama yang digunakan untuk mengelola merchant, outlet, pengguna, produk, inventory, transaksi, serta hasil analisis AI.

Relasi antar entitas digunakan untuk memastikan setiap data memiliki konteks merchant dan outlet yang sesuai.

---

## 2. Entities

### 2.1 Merchant

Merepresentasikan bisnis atau merchant yang menggunakan sistem.

Satu Owner hanya memiliki satu Merchant pada MVP (FR-TEN-002, DR-002).

| Attribute | Description |  
|---|---|  
| `merchant_id` | Primary Key |  
| `name` | Nama merchant |  
| `low_stock_threshold` | Threshold stok rendah global, nonnegatif, berlaku untuk semua Inventory Merchant (FR-INV-008, DR-011A) |

---

### 2.2 Outlet

Merepresentasikan outlet atau lokasi operasional yang dimiliki oleh merchant.

| Attribute | Description |  
|---|---|  
| `outlet_id` | Primary Key |  
| `merchant_id` | Foreign Key → `merchant.merchant_id` |  
| `name` | Nama outlet |  
| `address` | Alamat outlet |  
| `status` | Status outlet (`ACTIVE` / `INACTIVE`; nonaktif read-only untuk operasi bisnis — FR-TEN-004) |

---

### 2.3 User

Merepresentasikan pengguna sistem, termasuk Owner, Admin, dan Kasir.

| Attribute | Description |  
|---|---|  
| `user_id` | Primary Key |  
| `merchant_id` | Foreign Key → `merchant.merchant_id` |  
| `outlet_id` | Foreign Key → `outlet.outlet_id`, nullable |  
| `name` | Nama pengguna |  
| `email` | Email pengguna |  
| `password` | Password pengguna |  
| `role` | Role pengguna — hanya `OWNER` \| `ADMIN` \| `CASHIER` (DR-011) |  
| `status` | Status pengguna — `ACTIVE` \| `INACTIVE` (FR-AUTH-013; nonaktif tidak dapat login/akses) |  
| `created_at` | Waktu pembuatan data |  
| `updated_at` | Waktu perubahan data |

`outlet_id` bersifat nullable karena tidak semua user terikat langsung ke satu outlet.

- **Owner** → tidak terikat ke outlet tertentu.  
- **Admin** → tidak terikat ke satu outlet karena dapat mengelola beberapa outlet dalam merchant.  
- **Kasir** → terikat pada satu outlet.

---

### 2.4 Category

Merepresentasikan kategori produk dalam suatu merchant.

| Attribute | Description |  
|---|---|  
| `category_id` | Primary Key |  
| `merchant_id` | Foreign Key → `merchant.merchant_id` |  
| `name` | Nama kategori |

---

### 2.5 Product

Merepresentasikan produk yang dimiliki oleh merchant.

| Attribute | Description |  
|---|---|  
| `product_id` | Primary Key |  
| `merchant_id` | Foreign Key → `merchant.merchant_id` |  
| `category_id` | Foreign Key → `category.category_id` |  
| `name` | Nama produk |  
| `sku` | Stock Keeping Unit |  
| `price` | Harga produk |  
| `status` | Status produk |  
| `created_at` | Waktu pembuatan data |  
| `updated_at` | Waktu perubahan data |

---

### 2.6 Inventory

Merepresentasikan jumlah stock suatu produk pada outlet tertentu.

| Attribute | Description |  
|---|---|  
| `inventory_id` | Primary Key |  
| `outlet_id` | Foreign Key → `outlet.outlet_id` |  
| `product_id` | Foreign Key → `product.product_id` |  
| `quantity` | Jumlah stock |  
| `updated_at` | Waktu perubahan stock |

Inventory menghubungkan produk dengan outlet sehingga stock dapat dikelola secara terpisah untuk setiap outlet.

---

### 2.7 Transaction

Merepresentasikan transaksi penjualan yang dilakukan pada suatu outlet.

Satu checkout menghasilkan paling banyak satu transaksi final `COMPLETED` (FR-CHK-011); state internal (`RECEIVED`/`VALIDATING`/`COMMITTING`/`REJECTED`/`FAILED`) tidak disimpan sebagai baris final, `PROCESSING` hanyalah status API/UI. Transaksi final tidak dapat dihapus (FR-TRX-007) dan masuk reporting hanya bila `COMPLETED` (FR-REP-001).

| Attribute | Description |  
|---|---|  
| `transaction_id` | Primary Key |  
| `outlet_id` | Foreign Key → `outlet.outlet_id` |  
| `user_id` | Foreign Key → `user.user_id` (Kasir) |  
| `transaction_number` | Nomor transaksi / receipt number, unik dalam merchant (FR-CHK-008) |  
| `status` | Status transaksi — `COMPLETED` untuk final sukses (FR-CHK-011) |  
| `subtotal` | Total sebelum perhitungan akhir |  
| `total` | Total transaksi (sama dengan payment amount — FR-PAY-003) |  
| `created_at` | Waktu transaksi |

---

### 2.8 Transaction Item

Merepresentasikan detail produk yang terdapat dalam suatu transaksi. Menyimpan **snapshot** harga saat penjualan (FR-CHK-009) sehingga perubahan katalog tidak mengubah sejarah (business flow §10.2).

| Attribute | Description |  
|---|---|  
| `transaction_item_id` | Primary Key |  
| `transaction_id` | Foreign Key → `transaction.transaction_id` |  
| `product_id` | Foreign Key → `product.product_id` |  
| `quantity` | Jumlah produk |  
| `unit_price` | Harga produk saat transaksi (snapshot) |  
| `subtotal` | Subtotal item |

---

### 2.9 AI Insight

Merepresentasikan hasil analisis AI untuk suatu merchant.

Hubungan dengan Merchant bersifat **1:1** dan sistem **tidak menyimpan histori**. Owner dapat memicu analisis kapan saja tanpa batas harian (FR-AI-012, ASM-010); hasil analisis terbaru meng-update insight yang sama. `updated_at` menandakan waktu analisis terakhir.

| Attribute | Description |  
|---|---|  
| `insight_id` | Primary Key |  
| `merchant_id` | Foreign Key → `merchant.merchant_id`, unique (1:1) |  
| `title` | Judul insight |  
| `content` | Isi insight |  
| `type` | Tipe insight |  
| `created_at` | Waktu insight pertama kali dibuat |  
| `updated_at` | Waktu analisis terakhir |

---

### 2.10 Cart

Merepresentasikan keranjang aktif milik seorang Kasir pada satu Outlet (FR-CART-001).

Satu user hanya memiliki satu cart per outlet (`@@unique([userId, outletId])`). Keranjang hanya untuk **CASHIER** (OD-010; cart & checkout eksklusif Kasir — lihat `api-contract.md` RBAC).

| Attribute | Description |  
|---|---|  
| `cart_id` | Primary Key |  
| `outlet_id` | Foreign Key → `outlet.outlet_id` |  
| `user_id` | Foreign Key → `user.user_id` |  
| `created_at` | Waktu cart dibuat |  
| `updated_at` | Waktu cart terakhir diubah |

---

### 2.11 Cart Item

Merepresentasikan item di dalam cart (FR-CART-002). Satu produk hanya boleh muncul sekali dalam satu cart (`@@unique([cartId, productId])`); menambah produk yang sama menambah kuantitasnya.

Harga tampilan (`unit_price`) adalah **snapshot** — checkout menghitung ulang total dari data server dan menolak bila harga berubah dengan kode `PRICE_CHANGED` (FR-CART-007, FR-CART-005).

| Attribute | Description |  
|---|---|  
| `cart_item_id` | Primary Key |  
| `cart_id` | Foreign Key → `cart.cart_id` (cascade delete) |  
| `product_id` | Foreign Key → `product.product_id` |  
| `quantity` | Jumlah produk (integer positif — BR-002) |  
| `unit_price` | Harga produk saat dimasukkan ke cart (snapshot) |

---

### 2.12 Payment

Merepresentasikan pembayaran untuk satu transaksi.

Pada MVP manual, Payment langsung berstatus `CONFIRMED` ketika checkout commit; tidak ada state `PENDING`, settlement, callback gateway, atau rekonsiliasi bank (FR-PAY-002, ASM-008). `idempotency_key` mencegah double-charge: key sama + payload sama → transaksi yang sama dikembalikan (FR-CHK-003); key sama + payload berbeda → conflict (FR-CHK-004).

| Attribute | Description |  
|---|---|  
| `payment_id` | Primary Key |  
| `transaction_id` | Foreign Key → `transaction.transaction_id` (1:1) |  
| `payment_method` | Metode — `CASH` \| `CASHLESS_MANUAL` (FR-PAY-001) |  
| `amount` | Jumlah = total transaksi (FR-PAY-003) |  
| `status` | Status — `CONFIRMED` (FR-PAY-002) |  
| `idempotency_key` | Kunci idempotensi checkout, unik per niat bayar (FR-CHK-001) |  
| `paid_at` | Waktu konfirmasi pembayaran |  
| `actor` | Kasir yang melakukan checkout |

---

### 2.13 StockMovement

Merepresentasikan jejak setiap perubahan stok (FR-INV-003, FR-CHK-006). Tidak pernah dihapus (SRS §12 — data audit).

| Attribute | Description |  
|---|---|  
| `stock_movement_id` | Primary Key |  
| `inventory_id` | Foreign Key → `inventory.inventory_id` |  
| `type` | `ADJUSTMENT` \| `SALE` (FR-INV-003; transfer antar-outlet bila ada juga dicatat) |  
| `delta` | Perubahan jumlah (positif/negatif) |  
| `before` | Jumlah sebelum perubahan |  
| `after` | Jumlah sesudah perubahan |  
| `reason` | Alasan — wajib untuk `ADJUSTMENT` manual (FR-INV-003) |  
| `reference` | Referensi (mis. `transaction_id` untuk SALE) |  
| `actor` | Pengguna yang melakukan perubahan |  
| `timestamp` | Waktu perubahan |

---

# 3. Relationships

## 3.1 Merchant → Outlet

**Relationship:** One-to-Many (1:N)

Satu merchant dapat memiliki banyak outlet.

```text  
merchant.merchant_id  
        ↓  
outlet.merchant_id

**Foreign Key:**

`outlet.merchant_id → merchant.merchant_id`

---

## **3.2 Merchant → User**

**Relationship:** One-to-Many (1:N)

Satu merchant dapat memiliki banyak user.

merchant.merchant_id  
        ↓  
user.merchant_id

**Foreign Key:**

`user.merchant_id → merchant.merchant_id`

---

## **3.3 Outlet → User**

**Relationship:** One-to-Many (1:N)

Satu outlet dapat memiliki banyak user yang terikat pada outlet tersebut.

outlet.outlet_id  
        ↓  
user.outlet_id

**Foreign Key:**

`user.outlet_id → outlet.outlet_id`

`user.outlet_id` bersifat nullable karena Owner dan Admin berada pada level merchant.

---

## **3.4 Merchant → Category**

**Relationship:** One-to-Many (1:N)

Satu merchant dapat memiliki banyak kategori.

merchant.merchant_id  
        ↓  
category.merchant_id

**Foreign Key:**

`category.merchant_id → merchant.merchant_id`

---

## **3.5 Merchant → Product**

**Relationship:** One-to-Many (1:N)

Satu merchant dapat memiliki banyak produk.

merchant.merchant_id  
        ↓  
product.merchant_id

**Foreign Key:**

`product.merchant_id → merchant.merchant_id`

---

## **3.6 Category → Product**

**Relationship:** One-to-Many (1:N)

Satu kategori dapat memiliki banyak produk.

category.category_id  
        ↓  
product.category_id

**Foreign Key:**

`product.category_id → category.category_id`

---

## **3.7 Outlet → Inventory**

**Relationship:** One-to-Many (1:N)

Satu outlet dapat memiliki banyak data inventory.

outlet.outlet_id  
        ↓  
inventory.outlet_id

**Foreign Key:**

`inventory.outlet_id → outlet.outlet_id`

---

## **3.8 Product → Inventory**

**Relationship:** One-to-Many (1:N)

Satu produk dapat memiliki data inventory pada beberapa outlet.

product.product_id  
        ↓  
inventory.product_id

**Foreign Key:**

`inventory.product_id → product.product_id`

---

## **3.9 Outlet → Transaction**

**Relationship:** One-to-Many (1:N)

Satu outlet dapat memiliki banyak transaksi.

outlet.outlet_id  
        ↓  
transaction.outlet_id

**Foreign Key:**

`transaction.outlet_id → outlet.outlet_id`

---

## **3.10 User → Transaction**

**Relationship:** One-to-Many (1:N)

Satu user dapat melakukan banyak transaksi.

user.user_id  
        ↓  
transaction.user_id

**Foreign Key:**

`transaction.user_id → user.user_id`

---

## **3.11 Transaction → Transaction Item**

**Relationship:** One-to-Many (1:N)

Satu transaksi dapat memiliki banyak item produk.

transaction.transaction_id  
        ↓  
transaction_item.transaction_id

**Foreign Key:**

`transaction_item.transaction_id → transaction.transaction_id`

---

## **3.12 Product → Transaction Item**

**Relationship:** One-to-Many (1:N)

Satu produk dapat muncul pada banyak transaction item.

product.product_id  
        ↓  
transaction_item.product_id

**Foreign Key:**

`transaction_item.product_id → product.product_id`

---

## **3.13 Merchant → AI Insight**

**Relationship:** One-to-One (1:1)

Satu merchant hanya memiliki satu hasil analisis AI. Sistem tidak menyimpan histori; analisis terbaru meng-update insight yang sama (tanpa batas harian — FR-AI-012).

merchant.merchant_id  
        ↓  
ai_insight.merchant_id (unique)

**Foreign Key:**

`ai_insight.merchant_id → merchant.merchant_id`

---

## **3.14 Outlet → Cart**

**Relationship:** One-to-Many (1:N)

Satu outlet dapat memiliki banyak cart (satu per Kasir).

`outlet.outlet_id`  
        ↓  
cart.outlet_id

**Foreign Key:**

`cart.outlet_id → outlet.outlet_id`

---

## **3.15 User → Cart**

**Relationship:** One-to-Many (1:N, unik per kombinasi user+outlet)

Satu user (Kasir) hanya memiliki satu cart per outlet (`@@unique([userId, outletId])`).

`user.user_id`  
        ↓  
cart.user_id

**Foreign Key:**

`cart.user_id → user.user_id`

---

## **3.16 Cart → Cart Item**

**Relationship:** One-to-Many (1:N, cascade delete)

Satu cart dapat memiliki banyak item. Satu produk hanya muncul sekali per cart (`@@unique([cartId, productId])`).

`cart.cart_id`  
        ↓  
cart_item.cart_id

**Foreign Key:**

`cart_item.cart_id → cart.cart_id`

---

## **3.17 Product → Cart Item**

**Relationship:** One-to-Many (1:N)

Satu produk dapat muncul di banyak cart item.

`product.product_id`  
        ↓  
cart_item.product_id

**Foreign Key:**

`cart_item.product_id → product.product_id`

---

## **3.18 Transaction → Payment**

**Relationship:** One-to-One (1:1)

Satu transaksi memiliki satu payment record (MVP single-payment — FR-PAY-003).

`transaction.transaction_id`  
        ↓  
payment.transaction_id (unique)

**Foreign Key:**

`payment.transaction_id → transaction.transaction_id`

---

## **3.19 Inventory → StockMovement**

**Relationship:** One-to-Many (1:N)

Satu inventory memiliki banyak jejak perubahan stok (FR-INV-003, FR-CHK-006).

`inventory.inventory_id`  
        ↓  
stock_movement.inventory_id

**Foreign Key:**

`stock_movement.inventory_id → inventory.inventory_id`

---

# **4. Relationship Summary**

| Parent Entity | Child Entity | Foreign Key | Relationship |
| ----- | ----- | ----- | ----- |
| Merchant | Outlet | `outlet.merchant_id` | 1:N |
| Merchant | User | `user.merchant_id` | 1:N |
| Outlet | User | `user.outlet_id` | 1:N |
| Merchant | Category | `category.merchant_id` | 1:N |
| Merchant | Product | `product.merchant_id` | 1:N |
| Category | Product | `product.category_id` | 1:N |
| Outlet | Inventory | `inventory.outlet_id` | 1:N |
| Product | Inventory | `inventory.product_id` | 1:N |
| Outlet | Transaction | `transaction.outlet_id` | 1:N |
| User | Transaction | `transaction.user_id` | 1:N |
| Transaction | Transaction Item | `transaction_item.transaction_id` | 1:N |
| Product | Transaction Item | `transaction_item.product_id` | 1:N |
| Merchant | AI Insight | `ai_insight.merchant_id` | 1:1 |
| Outlet | Cart | `cart.outlet_id` | 1:N |
| User | Cart | `cart.user_id` | 1:N (unik per user+outlet) |
| Cart | Cart Item | `cart_item.cart_id` | 1:N (cascade) |
| Product | Cart Item | `cart_item.product_id` | 1:N |
| Transaction | Payment | `payment.transaction_id` | 1:1 |
| Inventory | StockMovement | `stock_movement.inventory_id` | 1:N |


