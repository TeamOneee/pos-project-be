# MODULAR ARCHITECTURE GUIDELINE — Full Document (UPDATED)

---

## Daftar Isi

1. [Tujuan](#1-tujuan)
2. [Arsitektur Dasar](#2-arsitektur-dasar)
3. [Apa yang Dimaksud Module](#3-apa-yang-dimaksud-module)
4. [Aturan Utama Module](#4-aturan-utama-module)
5. [Rule 2 — Repository bersifat internal terhadap module](#5-rule-2--repository-bersifat-internal-terhadap-module)
6. [Rule 3 — Module berkomunikasi melalui public contract](#6-rule-3--module-berkomunikasi-melalui-public-contract)
7. [Rule 4 — Service tetap menjadi pusat business logic](#7-rule-4--service-tetap-menjadi-pusat-business-logic)
8. [Rule 5 — Jangan mengakses database module lain secara langsung](#8-rule-5--jangan-mengakses-database-module-lain-secara-langsung)
9. [Rule 6 — Hindari circular dependency](#9-rule-6--hindari-circular-dependency)
10. [Rule 7 — Jangan membuat module terlalu bergantung pada module lain](#10-rule-7--jangan-membuat-module-terlalu-bergantung-pada-module-lain)
11. [Boundary Setiap Module](#11-boundary-setiap-module)
12. [Product Module](#12-product-module)
13. [Inventory Module](#13-inventory-module)
14. [Transaction / Checkout Module](#14-transaction--checkout-module)
15. [Contoh Hubungan Checkout dan Inventory](#15-contoh-hubungan-checkout-dan-inventory)
16. [Apa Itu Interface / Port](#16-apa-itu-interface--port)
17. [Kenapa Interface Berguna untuk Microservice](#17-kenapa-interface-berguna-untuk-microservice)
18. [Jangan Semua Hal Dibuat Interface](#18-jangan-semua-hal-dibuat-interface)
19. [Struktur Folder yang Disarankan](#19-struktur-folder-yang-disarankan)
20. [Apa yang Boleh Ada di `shared`](#20-apa-yang-boleh-ada-di-shared)
21. [Database Boundary](#21-database-boundary)
22. [Foreign Key Tidak Berarti Module Boleh Mengakses Repository](#22-foreign-key-tidak-berarti-module-boleh-mengakses-repository)
23. [API Contract Berbeda dengan Internal Module Contract](#23-api-contract-berbeda-dengan-internal-module-contract)
24. [Synchronous Communication](#24-synchronous-communication)
25. [Asynchronous Communication](#25-asynchronous-communication)
26. [Jangan Memaksakan Async ke Semua Module](#26-jangan-memaksakan-async-ke-semua-module)
27. [Read dan Write Workload](#27-read-dan-write-workload)
28. [Dependency Matrix](#28-dependency-matrix)
29. [Contoh Dependency Checkout](#29-contoh-dependency-checkout)
30. [Rule untuk Setiap Pull Request](#30-rule-untuk-setiap-pull-request)
31. [Prinsip Migrasi ke Microservice](#31-prinsip-migrasi-ke-microservice)
32. [Prinsip Scaling](#32-prinsip-scaling)
33. [Future Scaling Architecture](#33-future-scaling-architecture)
34. [Prinsip Utama yang Harus Disepakati Tim](#34-prinsip-utama-yang-harus-disepakati-tim)
35. [Simplified Mental Model](#35-simplified-mental-model)
36. [Rule of Thumb untuk Tim](#36-rule-of-thumb-untuk-tim)

---

## 1. Tujuan

Sistem dibangun menggunakan pendekatan **modular monolith** dengan tujuan:

1. Memisahkan business logic berdasarkan domain/module.
2. Menjaga setiap module memiliki tanggung jawab yang jelas.
3. Mengurangi coupling antar-module.
4. Memungkinkan module dikembangkan dan diuji secara independen.
5. Menyiapkan jalur migrasi menuju microservice apabila suatu module nantinya terbukti membutuhkan scaling secara independen.
6. Menjaga implementasi tetap sederhana selama belum ada kebutuhan untuk memisahkan service.

> **Prinsip utama:**
>
> **Build simple first, preserve boundaries, scale when needed.**
>
> Kita tidak mengimplementasikan microservice hanya karena memungkinkan. Kita memastikan boundary-nya benar terlebih dahulu sehingga microservice dapat menjadi langkah lanjutan apabila memang dibutuhkan.

Pendekatan ini sejalan dengan prinsip **scale when needed**, di mana multiple instance, load balancer, read replica, dan Kubernetes dipertimbangkan berdasarkan workload dan hasil testing, bukan sekadar karena teknologinya tersedia.

---

## 2. Arsitektur Dasar

Struktur dasar setiap module tetap menggunakan pola yang familiar:

```
Controller
    ↓
Service
    ↓
Repository
    ↓
Database
```

Contoh:

```
CheckoutController
        ↓
CheckoutService
        ↓
CheckoutRepository
        ↓
PostgreSQL
```

**Modularitas tidak berarti kita harus meninggalkan pola Controller → Service → Repository.**

Yang berubah adalah **batas antar-module**.

---

## 3. Apa yang Dimaksud Module?

Module adalah kumpulan code yang memiliki **satu tanggung jawab/domain bisnis tertentu**.

Contoh:

```
src/
└── modules/
    ├── auth/
    ├── merchant/
    ├── outlet/
    ├── user/
    ├── product/
    ├── inventory/
    ├── cart/
    ├── transaction/
    ├── dashboard/
    ├── analytics/
    └── ai-insight/
```

Module bukan sekadar pemisahan folder.

Sebuah module harus memiliki:
- tanggung jawab yang jelas
- data yang menjadi ownership-nya
- business logic sendiri
- repository sendiri
- public interface yang jelas
- batas dependency dengan module lain

---

## 4. Aturan Utama Module

### Rule 1 — Setiap module harus memiliki ownership yang jelas

Setiap data harus memiliki satu module yang menjadi **owner**.

| Data | Owner |
|---|---|
| Merchant | Merchant Module |
| Outlet | Outlet Module |
| User/Cashier | User Module |
| Product | Product Module |
| Category | Product Module |
| Stock | Inventory Module |
| Cart | Cart Module |
| Transaction | Transaction Module |
| AI Insight | AI Insight Module |

Module lain **tidak boleh mengambil alih business logic atau repository dari module tersebut.**

---

## 5. Rule 2 — Repository bersifat internal terhadap module

Ini salah satu aturan PALING PENTING.

Misalnya:

```
Inventory Module
├── InventoryController
├── InventoryService
└── InventoryRepository
```

Maka:

```
CheckoutService
```

**tidak boleh melakukan:**

```
CheckoutService
       ↓
InventoryRepository
```

❌ Salah.

Karena Checkout masuk langsung ke implementation detail Inventory.

Yang diperbolehkan:

```
CheckoutService
       ↓
Inventory public interface
       ↓
InventoryService
       ↓
InventoryRepository
```

Dengan kata lain:

> **Module lain tidak boleh mengakses Repository module secara langsung.**

---

## 6. Rule 3 — Module berkomunikasi melalui public contract

Module harus menyediakan operasi yang memang dibutuhkan module lain.

Misalnya Inventory menyediakan:

- `checkStock()`
- `decreaseStock()`
- `increaseStock()`
- `transferStock()`
- `adjustStock()`

Checkout tidak perlu tahu:
- bagaimana stock disimpan
- bagaimana query dibuat
- database apa yang digunakan
- repository apa yang digunakan

Checkout cukup mengetahui:

> "Inventory menyediakan kemampuan untuk melakukan pengecekan dan perubahan stock."

---

## 7. Rule 4 — Service tetap menjadi pusat business logic

Jangan memindahkan business logic ke Controller.

### ❌ Jangan

```ts
@Controller()
async checkout() {
    // cek stock
    // hitung harga
    // update inventory
    // insert transaction
}
```

### ✅ Gunakan

```
Controller
    ↓
CheckoutService
    ↓
Business Logic
```

Controller hanya bertugas:
- menerima request
- melakukan validation melalui DTO/pipeline
- memanggil service
- mengembalikan response

---

## 8. Rule 5 — Jangan mengakses database module lain secara langsung

Misalnya Checkout membutuhkan data Inventory.

### ❌ Jangan:

```ts
this.prisma.inventory.findMany(...)
```

di dalam Checkout.

Atau:

```ts
this.inventoryRepository.findStock(...)
```

### ✅ Gunakan:

```ts
this.inventoryService.checkStock(...)
```

Dengan begitu ownership tetap berada di Inventory.

---

## 9. Rule 6 — Hindari circular dependency

Dependency sebaiknya memiliki arah yang jelas.

Contoh:

```
Checkout
   ↓
Inventory
```

lebih baik daripada:

```
Checkout
   ↕
Inventory
```

Kalau:

```
Checkout → Inventory
Inventory → Checkout
```

terjadi terlalu sering, kemungkinan boundary module belum tepat.

---

## 10. Rule 7 — Jangan membuat module terlalu bergantung pada module lain

Misalnya Checkout membutuhkan:
- Inventory
- Product
- Merchant
- Outlet
- User
- Transaction

dan semuanya dipanggil langsung dari CheckoutService.

Itu bisa menjadi tanda Checkout terlalu coupled.

Sebelum menambahkan dependency baru, tanyakan:

> "Apakah data/logic ini benar-benar menjadi tanggung jawab Checkout?"

Jika bukan, gunakan public contract module yang bersangkutan.

---

## 11. Boundary Setiap Module

### 11.1 Merchant Module

**Responsibility:** Mengelola merchant/business.

```
Merchant
├── create merchant
├── update merchant
├── get merchant
└── merchant configuration
```

**Owns:** `merchant`

**Tidak bertanggung jawab terhadap:** stock, transaction, product, AI analysis

---

### 11.2 Outlet Module

**Responsibility:** Mengelola outlet milik merchant.

```
Outlet
├── create outlet
├── update outlet
├── get outlet
└── outlet configuration
```

**Owns:** `outlet`

**Dependency:** Merchant (via `merchantId` dari JWT)

---

### 11.3 Category Module

**Responsibility:** Mengelola kategori produk.

```
Category
├── create category
├── update category
├── delete category (soft)
└── get categories
```

**Owns:** `category`

**Dependency:** Merchant (scope dari JWT)

**Akses:**
- **OWNER:** Full CRUD (create, read, update, delete)
- **ADMIN:** Read only
- **CASHIER:** Tidak ada akses

---

### 11.4 Product Module

**Responsibility:** Mengelola informasi produk.

```
Product
├── create product
├── update product
├── delete product (soft)
├── get product
└── category management
```

**Owns:** `product`, `category` (validasi internal)

**Product TIDAK memiliki stock.** Stock berada di Inventory Module.

**Akses:**
- **OWNER:** Full CRUD (create, read, update, delete)
- **ADMIN:** Read only
- **CASHIER:** Read only

---

### 11.5 Cart Module

**Responsibility:** Mengelola cart (keranjang belanja) per kasir pada suatu outlet.

```
Cart
├── get cart
├── add item ke cart
├── update quantity item
├── remove item dari cart
└── clear cart
```

**Owns:** `cart`, `cart_item`

**Scope:** Cart berada pada **scope Outlet** dan dioperasikan oleh **Cashier**.

**Akses:** Hanya CASHIER

**Dependency:**
- Product (harga & validasi produk aktif via `ProductPort`)
- Inventory (cek stock via `InventoryPort`)

---

### 11.6 Inventory Module

**Responsibility:** Inventory adalah **owner dari stock**.

```
Inventory
├── check stock
├── increase stock
├── decrease stock
├── transfer stock
├── bulk update stock
└── get low stock alerts
```

**Owns:** `inventory`, `stock_movement`

**Akses:**
- **ADMIN:** Full CRUD (adjustment, transfer, bulk, low stock alerts)
- **OWNER:** Read only
- **CASHIER:** Read only

**Public capability:**
```ts
interface InventoryPort {
    checkStock(outletId: string, productId: string, quantity: number): Promise<boolean>;
    getStock(outletId: string, productId: string): Promise<number>;
    decreaseStock(outletId: string, productId: string, quantity: number, tx?: Prisma.TransactionClient): Promise<void>;
    increaseStock(outletId: string, productId: string, quantity: number, tx?: Prisma.TransactionClient): Promise<void>;
    transferStock(productId: string, fromOutletId: string, toOutletId: string, quantity: number, reason: string): Promise<void>;
    adjustStock(inventoryId: string, quantity: number, reason: string): Promise<void>;
    listLowStock(merchantId: string, outletId?: string): Promise<LowStockItem[]>;
}
```

---

### 11.7 Transaction / Checkout Module

**Responsibility:** Checkout bertanggung jawab terhadap **orchestrating proses transaksi**.

```
Checkout
    ↓
validate request
    ↓
check inventory
    ↓
calculate total
    ↓
create transaction
    ↓
decrease inventory
```

**Checkout TIDAK memiliki ownership stock.**

Checkout hanya meminta Inventory:
- `inventory.checkStock(...)`
- `inventory.decreaseStock(...)`

**Akses:**
- **CASHIER:** Create transaction (checkout)
- **OWNER:** Read only
- **ADMIN:** Read only

---

### 11.8 Dashboard Module

**Responsibility:** Read-only aggregator untuk dashboard.

**Tidak punya tabel sendiri.**

**Akses:**
- **OWNER:** `/dashboard/owner` — bisnis komprehensif
- **ADMIN:** `/dashboard/admin` — inventory overview

---

### 11.9 Analytics Module

**Responsibility:** Read-heavy aggregator untuk analytics.

**Tidak punya tabel sendiri.**

**Akses:** Hanya OWNER

---

### 11.10 AI Insight Module

**Responsibility:** Menyediakan hasil analisis AI untuk Owner.

**Scope:** Merchant (1:1, tanpa histori)

**Akses:** Hanya OWNER

**Dependency:** Analytics (data agregasi via `AnalyticsPort`)

---

## 12. Product Module

### Responsibility

Mengelola informasi produk.

```
Product
├── create product
├── update product
├── delete product (soft)
├── get product
└── category management
```

### Owns

`products`, `categories`

### Product TIDAK memiliki stock.

Ini penting.

```
Product
    │
    │ informasi produk
    │
    └── name
        price
        category
        SKU
```

Sedangkan:

```
Inventory
    │
    └── stock quantity
```

Karena stock bisa berbeda berdasarkan outlet.

Contoh:

```
Product: Indomie Goreng
```

bisa mempunyai:

```
Outlet A → 50
Outlet B → 12
Outlet C → 100
```

Maka quantity lebih tepat menjadi bagian dari **Inventory**, bukan Product.

### Akses

| Endpoint | OWNER | ADMIN | CASHIER |
|---|---|---|---|
| GET /products | ✅ | ✅ | ✅ |
| POST /products | ✅ | ❌ | ❌ |
| PUT /products/{id} | ✅ | ❌ | ❌ |
| DELETE /products/{id} | ✅ | ❌ | ❌ |

---

## 13. Inventory Module

### Responsibility

Inventory adalah **owner dari stock**.

```
Inventory
├── check stock
├── increase stock
├── decrease stock
├── transfer stock
├── bulk update stock
└── get low stock alerts
```

### Owns

`inventory`, `stock_movement`

### Akses

| Endpoint | OWNER | ADMIN | CASHIER |
|---|---|---|---|
| GET /inventory | ✅ | ✅ | ✅ |
| GET /inventory/outlet/{oid}/product/{pid} | ✅ | ✅ | ✅ |
| PUT /inventory/{id} | ❌ | ✅ | ❌ |
| PUT /inventory/bulk | ❌ | ✅ | ❌ |
| POST /inventory/transfer | ❌ | ✅ | ❌ |
| GET /inventory/low-stock | ❌ | ✅ | ❌ |

### Public capability

Inventory dapat menyediakan:

```ts
interface InventoryPort {
    checkStock(
        outletId: string,
        productId: string,
        quantity: number
    ): Promise<boolean>;

    decreaseStock(
        outletId: string,
        productId: string,
        quantity: number,
        tx?: Prisma.TransactionClient
    ): Promise<void>;

    increaseStock(
        outletId: string,
        productId: string,
        quantity: number,
        tx?: Prisma.TransactionClient
    ): Promise<void>;

    transferStock(
        productId: string,
        fromOutletId: string,
        toOutletId: string,
        quantity: number,
        reason: string
    ): Promise<void>;

    adjustStock(
        inventoryId: string,
        quantity: number,
        reason: string
    ): Promise<void>;

    listLowStock(
        merchantId: string,
        outletId?: string
    ): Promise<LowStockItem[]>;
}
```

---

## 14. Transaction / Checkout Module

Untuk sistem POS, Checkout merupakan salah satu kandidat module yang berpotensi memiliki workload tinggi.

### Responsibility

Checkout bertanggung jawab terhadap **orchestrating proses transaksi**.

Contoh:

```
Checkout
    ↓
validate request
    ↓
check inventory
    ↓
calculate total
    ↓
create transaction
    ↓
decrease inventory
```

### Checkout TIDAK memiliki ownership stock.

Checkout hanya meminta Inventory:

```ts
inventory.checkStock(...)
inventory.decreaseStock(...)
```

### Akses

| Endpoint | OWNER | ADMIN | CASHIER |
|---|---|---|---|
| GET /transactions | ✅ | ✅ | ✅ (outlet sendiri) |
| POST /transactions | ❌ | ❌ | ✅ |
| GET /transactions/{id} | ✅ | ✅ | ✅ (outlet sendiri) |

---

## 15. Contoh Hubungan Checkout dan Inventory

### Struktur:

```
modules/
│
├── checkout/
│   ├── checkout.controller.ts
│   ├── checkout.service.ts
│   ├── checkout.repository.ts
│   └── ports/
│       └── inventory.port.ts
│
└── inventory/
    ├── inventory.controller.ts
    ├── inventory.service.ts
    ├── inventory.repository.ts
    └── ports/
        └── inventory.port.ts
```

Hubungannya:

```
                 CHECKOUT MODULE

CheckoutController
        ↓
CheckoutService
        ↓
InventoryPort
        │
        │
        ▼
                 INVENTORY MODULE

InventoryService
        ↓
InventoryRepository
        ↓
PostgreSQL
```

---

## 16. Apa Itu Interface / Port?

Interface adalah **kontrak kemampuan yang diberikan atau dibutuhkan sebuah module**.

Contoh:

```ts
export interface InventoryPort {
    checkStock(
        outletId: string,
        productId: string,
        quantity: number
    ): Promise<boolean>;

    decreaseStock(
        outletId: string,
        productId: string,
        quantity: number
    ): Promise<void>;
}
```

Checkout tidak peduli bagaimana Inventory mengimplementasikan fungsi tersebut.

Checkout hanya mengetahui:
- `checkStock()`
- `decreaseStock()`

---

## 17. Kenapa Interface Berguna untuk Microservice?

Sekarang:

```
Checkout
    ↓
InventoryPort
    ↓
InventoryService
```

Semua masih berada dalam satu NestJS application.

Nanti:

```
Checkout
    ↓
InventoryPort
    ↓
HTTP Adapter
    ↓
Inventory Microservice
```

Atau:

```
Checkout
    ↓
InventoryPort
    ↓
Message Adapter
    ↓
Inventory Microservice
```

Business logic Checkout tidak harus mengetahui apakah Inventory berada:
- dalam process yang sama
- atau di server lain

---

## 18. Jangan Semua Hal Dibuat Interface

Interface **tidak perlu dibuat untuk setiap class**.

Jangan sampai:
- `ProductServiceInterface`
- `ProductRepositoryInterface`
- `ProductControllerInterface`
- `ProductDTOInterface`
- `ProductEntityInterface`
- ...

dan akhirnya architecture malah menjadi rumit.

Interface/Port terutama digunakan untuk:

> **dependency yang melintasi boundary module dan berpotensi diganti implementasinya.**

Contoh yang masuk akal:
- Checkout → Inventory
- Checkout → Product
- AI → Analytics

---

## 19. Struktur Folder yang Disarankan

Untuk tahap awal, gunakan struktur yang masih familiar.

```
src/
│
├── modules/
│   │
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   ├── dto/
│   │   └── ports/
│   │
│   ├── merchant/
│   │   ├── merchant.controller.ts
│   │   ├── merchant.module.ts
│   │   ├── merchant.service.ts
│   │   ├── merchant.repository.ts
│   │   ├── dto/
│   │   └── ports/
│   │
│   ├── outlet/
│   │   ├── outlet.controller.ts
│   │   ├── outlet.module.ts
│   │   ├── outlet.service.ts
│   │   ├── outlet.repository.ts
│   │   ├── dto/
│   │   └── ports/
│   │
│   ├── user/
│   │   ├── user.controller.ts
│   │   ├── user.module.ts
│   │   ├── user.service.ts
│   │   ├── user.repository.ts
│   │   ├── dto/
│   │   └── ports/
│   │
│   ├── product/
│   │   ├── product.controller.ts
│   │   ├── product.module.ts
│   │   ├── product.service.ts
│   │   ├── product.repository.ts
│   │   ├── dto/
│   │   └── ports/
│   │
│   ├── inventory/
│   │   ├── inventory.controller.ts
│   │   ├── inventory.module.ts
│   │   ├── inventory.service.ts
│   │   ├── inventory.repository.ts
│   │   ├── dto/
│   │   └── ports/
│   │
│   ├── cart/
│   │   ├── cart.controller.ts
│   │   ├── cart.module.ts
│   │   ├── cart.service.ts
│   │   ├── cart.repository.ts
│   │   ├── dto/
│   │   └── ports/
│   │
│   ├── transaction/
│   │   ├── transaction.controller.ts
│   │   ├── transaction.module.ts
│   │   ├── transaction.service.ts
│   │   ├── transaction.repository.ts
│   │   ├── dto/
│   │   └── ports/
│   │
│   ├── dashboard/
│   │   ├── dashboard.controller.ts
│   │   ├── dashboard.module.ts
│   │   ├── dashboard.service.ts
│   │   ├── dashboard.repository.ts
│   │   └── dto/
│   │
│   ├── analytics/
│   │   ├── analytics.controller.ts
│   │   ├── analytics.module.ts
│   │   ├── analytics.service.ts
│   │   ├── analytics.repository.ts
│   │   └── ports/
│   │
│   └── ai-insight/
│       ├── ai-insight.controller.ts
│       ├── ai-insight.module.ts
│       ├── ai-insight.service.ts
│       ├── ai-insight.repository.ts
│       ├── dto/
│       └── ports/
│
└── common/
    ├── guards/
    ├── decorators/
    ├── filters/
    └── utils/
```

---

## 20. Apa yang Boleh Ada di `shared` / `common`?

`common` hanya untuk sesuatu yang benar-benar **generic**.

Contoh:

```
common/
├── guards/
├── decorators/
├── filters/
└── utils/
```

### Jangan masukkan:

```
common/
└── inventory.service.ts
```

atau:

```
common/
└── transaction.helper.ts
```

kalau sebenarnya itu business logic sebuah module.

Karena akhirnya `common` berubah menjadi:

> "tempat buang semua code."

---

## 21. Database Boundary

Walaupun sekarang kita menggunakan **satu PostgreSQL**, secara logical ownership harus tetap jelas.

```
PostgreSQL
│
├── merchants
│       → Merchant Module
│
├── outlets
│       → Outlet Module
│
├── users
│       → User Module
│
├── categories
│       → Category Module
│
├── products
│       → Product Module
│
├── inventory
│       → Inventory Module
│
├── stock_movements
│       → Inventory Module
│
├── carts
│       → Cart Module
│
├── cart_items
│       → Cart Module
│
├── transactions
│       → Transaction Module
│
├── transaction_items
│       → Transaction Module
│
└── ai_insights
        → AI Insight Module
```

Satu database **tidak berarti semua module bebas mengakses semua tabel.**

Rule:

> **Module hanya boleh melakukan operasi database terhadap data yang menjadi ownership-nya.**

---

## 22. Foreign Key Tidak Berarti Module Boleh Mengakses Repository

Misalnya:

```
inventory
product_id → products.id
```

Boleh saja database memiliki foreign key.

Tetapi:

```
InventoryService
```

tidak otomatis boleh melakukan seluruh operasi Product.

Jika membutuhkan informasi Product, gunakan public contract:

```
Inventory
    ↓
ProductPort
    ↓
ProductService
```

atau desain ulang supaya Inventory tidak perlu mengetahui detail Product.

---

## 23. API Contract Berbeda dengan Internal Module Contract

Ada dua jenis contract.

### External API Contract

Untuk frontend:

```
POST /transactions
GET /products
GET /inventory
```

### Internal Contract

Untuk komunikasi antar-module:

```
InventoryPort
ProductPort
TransactionPort
```

External API tidak harus berubah hanya karena implementation internal berubah.

Misalnya:

```
Frontend
   ↓
POST /transactions
   ↓
Checkout
```

Tetap sama meskipun nantinya:

```
Checkout Module
```

berubah menjadi:

```
Checkout Microservice
```

---

## 24. Synchronous Communication

Untuk operasi yang harus selesai sebelum request dilanjutkan, gunakan komunikasi synchronous.

Contoh Checkout:

```
Client
  ↓
Checkout
  ↓
Inventory.checkStock()
  ↓
Transaction.create()
  ↓
Inventory.decreaseStock()
  ↓
Response
```

Karena customer harus tahu:

> "Checkout berhasil atau gagal?"

---

## 25. Asynchronous Communication

Untuk proses yang tidak harus selesai dalam request utama, gunakan asynchronous processing.

Contoh AI:

```
Owner
  ↓
POST /ai-insights/analyze
  ↓
Backend
  ↓
Create Job (BullMQ)
  ↓
Worker
  ↓
AI Service
  ↓
Save Result
```

Dengan begitu proses AI tidak menghambat operasi transactional seperti kasir.

---

## 26. Jangan Memaksakan Async ke Semua Module

Tidak semua proses harus asynchronous.

### Synchronous

- Login
- Create Product
- Update Stock
- Checkout
- Create Transaction

### Asynchronous

- AI Analysis
- Report Generation
- Large Data Processing
- Notification

Gunakan asynchronous ketika prosesnya memang tidak perlu selesai dalam HTTP request utama.

---

## 27. Read dan Write Workload

Module juga perlu dibedakan berdasarkan karakter workload.

### Write-heavy

Contoh:
- Checkout
- Transaction
- Inventory (decrease stock)

Karena banyak:
- INSERT
- UPDATE

### Read-heavy

Contoh:
- Dashboard
- Analytics
- Historical Transaction
- AI preprocessing

Rancangan database kita dapat berkembang menjadi:

```
                PostgreSQL
                     │
             ┌───────┴───────┐
             ↓               ↓
          Primary          Replica
             │               │
           WRITE             READ
```

Read replica cocok untuk dashboard, analytics, historical analysis, dan preprocessing AI.

---

## 28. Dependency Matrix

| Module | Boleh menggunakan |
|---|---|
| Auth | User, Merchant |
| Merchant | (mandiri) |
| Outlet | Merchant |
| User | Merchant, Outlet |
| Category | Merchant |
| Product | Merchant, Category |
| Inventory | Product, Outlet |
| Cart | Product, Inventory, User, Outlet |
| Transaction | Product, Inventory, Outlet, User, Cart |
| Dashboard | Transaction, Product, Inventory, Outlet, User (read-only) |
| Analytics | Transaction, Product, Inventory (read-only) |
| AI Insight | Analytics |

**Catatan:** tabel ini adalah dependency awal dan harus divalidasi lagi ketika domain logic ditulis.

Yang tidak boleh:

```
Checkout
  ↓
InventoryRepository ❌
```

Yang benar:

```
Checkout
  ↓
InventoryPort
  ↓
InventoryService
```

---

## 29. Contoh Dependency Checkout

```
                        CHECKOUT
                            │
             ┌──────────────┼──────────────┐
             ↓              ↓              ↓
        ProductPort   InventoryPort    OutletPort
             │              │              │
             ↓              ↓              ↓
        Product          Inventory       Outlet
        Service           Service        Service
             │              │              │
             ↓              ↓              ↓
        Repository       Repository     Repository
```

Checkout **tidak memiliki repository module lain**.

Checkout hanya memiliki:

```
checkout.repository
```

untuk data yang memang menjadi ownership Checkout.

---

## 30. Rule untuk Setiap Pull Request

Sebelum merge code, cek:

### Boundary
- Apakah code berada di module yang tepat?
- Apakah business logic berada di Service yang tepat?
- Apakah module ini mengakses repository module lain?

### Dependency
- Apakah dependency antar-module memang diperlukan?
- Apakah dependency hanya menggunakan public contract?
- Apakah terjadi circular dependency?

### Database
- Apakah module hanya mengakses data yang menjadi ownership-nya?
- Apakah ada query langsung ke tabel module lain?

### Future Scaling
- Jika module ini nantinya dipisahkan menjadi microservice, apakah boundary-nya sudah jelas?
- Apakah business logic module lain ikut tercampur?
- Apakah komunikasi antar-module sudah melalui contract?

---

## 31. Prinsip Migrasi ke Microservice

**Jangan membuat microservice sekarang hanya untuk "persiapan".**

Yang dipersiapkan sekarang adalah **boundary**.

Contoh sekarang:

```
                MODULAR MONOLITH

┌─────────────────────────────────────────┐
│               NestJS                    │
│                                         │
│  Checkout ──→ Inventory ──→ PostgreSQL │
│      │                                  │
│      └────→ Product                     │
│                                         │
└─────────────────────────────────────────┘
```

Setelah testing:

```
Checkout CPU = tinggi
Inventory CPU = rendah
Product CPU = rendah
```

maka Checkout dapat menjadi kandidat scaling.

Kemudian:

```
                FUTURE

             Load Balancer
                   │
          ┌────────┴────────┐
          ↓                 ↓
    Checkout #1       Checkout #2
          │                 │
          └────────┬────────┘
                   ↓
            Inventory Service
```

Jika benar-benar diperlukan, Checkout dapat diekstrak menjadi:

```
Checkout Microservice
```

karena boundary sudah disiapkan dari awal.

---

## 32. Prinsip Scaling

Scaling dilakukan berdasarkan evidence.

```
Implement
    ↓
Load Test
    ↓
Identify Bottleneck
    ↓
Optimasi
    ↓
Test kembali
    ↓
Masih bottleneck?
    │
    ├── No → Stop
    │
    └── Yes
          ↓
      Scale Up
```

Jangan langsung:

```
Microservice
+
Load Balancer
+
Kubernetes
+
Autoscaling
+
Multiple Instance
```

hanya karena semuanya tersedia.

---

## 33. Future Scaling Architecture

Ketika kebutuhan memang terbukti:

```
                        Load Balancer
                              │
                    ┌─────────┴─────────┐
                    ↓                   ↓
                Backend #1          Backend #2
                    │                   │
        ┌───────────┴───────────────────┐
        │                               │
    Checkout                         Other Modules
        │
        ↓
 Inventory / Product
        │
        ↓
 PostgreSQL
       / \
      /   \
 Primary  Read Replica
```

---

## 34. Prinsip Utama yang Harus Disepakati Tim

### Principle 1 — Simple First
> Kita menggunakan arsitektur sesederhana mungkin yang mampu memenuhi requirement.

### Principle 2 — Clear Ownership
> Setiap data dan business logic memiliki satu module sebagai owner.

### Principle 3 — No Direct Repository Access
> Module tidak boleh mengakses repository module lain secara langsung.

### Principle 4 — Communicate Through Contract
> Antar-module berkomunikasi melalui public service/port/interface, bukan implementation detail.

### Principle 5 — Database Ownership
> Satu database boleh digunakan bersama, tetapi ownership data tetap dipisahkan secara logical.

### Principle 6 — Avoid Circular Dependency
> Dependency antar-module harus memiliki arah yang jelas dan sebisa mungkin tidak membentuk circular dependency.

### Principle 7 — Async Only When Needed
> Proses yang tidak perlu selesai dalam request utama dapat diproses asynchronous.

### Principle 8 — Scale Based on Evidence
> Infrastruktur scaling diterapkan berdasarkan hasil load/stress testing dan bottleneck yang ditemukan.

### Principle 9 — Prepare Boundary, Not Infrastructure
> Yang dipersiapkan dari awal adalah boundary dan contract module, bukan langsung microservice.

### Principle 10 — Scaling Without Overspending
> Setiap keputusan arsitektur harus mempertimbangkan trade-off antara performance, scalability, complexity, dan infrastructure cost.

---

## 35. Simplified Mental Model

Kalau semua pembahasan di atas terlalu banyak, **cukup ingat gambar ini**:

```
                MODULE
                   │
       ┌───────────┼───────────┐
       ↓           ↓           ↓
 Controller     Service    Repository
                   │
                   │
                   ↓
              Database
```

Ketika module lain butuh sesuatu:

```
MODULE A
   │
   ↓
Public Contract
   │
   ↓
MODULE B
   │
   ↓
Service
   │
   ↓
Repository
```

**Jangan:**

```
MODULE A
   │
   └────────────→ Repository B ❌
```

---

## 36. Rule of Thumb untuk Tim

Sebelum menulis code antar-module, tanyakan 5 hal:

1. Siapa owner data ini?
2. Siapa owner business logic ini?
3. Module mana yang membutuhkan data/logic tersebut?
4. Apakah dependency ini bisa lewat public contract?
5. Kalau module ini besok dipisah menjadi service sendiri, apakah module lain harus ikut berubah?

Kalau jawabannya:

> **"Module A butuh sesuatu dari Module B."**

maka jangan langsung:

```
A → Repository B
```

tanya dulu:

> "A sebenarnya butuh kemampuan apa dari B?"

Misalnya:

Checkout butuh:
> "Apakah stock cukup?"

Maka contract-nya:

```ts
checkStock(...)
```

Bukan:

```ts
getInventoryRepository(...)
```

**Itulah inti boundary.**

---

## Kesimpulan

Kalian **nggak perlu membuang pola yang selama ini kalian pakai**.

Dari:

```
Controller
    ↓
Service
    ↓
Repository
```

cukup naik menjadi:

```
            MODULE A

Controller
    ↓
Service
    ↓
Public Contract
    ↓
             MODULE B
                ↓
             Service
                ↓
            Repository
```

Dan prinsip besarnya:

> **Jangan desain aplikasi berdasarkan "nanti pasti jadi microservice".**

> **Desain module berdasarkan domain dan ownership yang benar.**

> Kalau nanti hasil testing membuktikan sebuah module perlu di-scale secara independen, boundary yang sudah benar tadi menjadi fondasi untuk memisahkannya menjadi microservice.

---

**End of Document**