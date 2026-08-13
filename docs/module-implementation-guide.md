# MODULE IMPLEMENTATION GUIDE — Full Document (UPDATED)

---

## Daftar Isi

1. [Cara Membaca Dokumen Ini](#1-cara-membaca-dokumen-ini)
2. [Auth Module](#2-auth-module)
3. [Merchant Module](#3-merchant-module)
4. [Outlet Module](#4-outlet-module)
5. [User Module](#5-user-module)
6. [Category Module](#6-category-module)
7. [Product Module](#7-product-module)
8. [Inventory Module](#8-inventory-module)
9. [Cart Module](#9-cart-module)
10. [Transaction Module](#10-transaction-module)
11. [Dashboard Module](#11-dashboard-module)
12. [Analytics Module](#12-analytics-module)
13. [AI Insight Module](#13-ai-insight-module)
14. [Lampiran — Matriks Endpoint Cepat](#14-lampiran--matriks-endpoint-cepat)

---

## 1. Cara Membaca Dokumen Ini

Setiap bagian module berisi:

| Bagian | Arti |
|---|---|
| **Files** | File yang ada di folder module (boleh berubah saat implementasi) |
| **Owns** | Data yang menjadi ownership module (hanya module ini yang boleh akses tabel tsb) |
| **Dependency** | Module/port lain yang boleh dipakai |
| **Port (public contract)** | Interface yang disediakan module untuk dipakai module lain |
| **Endpoints** | Daftar endpoint + metode + role |
| **Logic** | Blueprint alur implementasi tiap endpoint |

**Aturan yang tidak boleh dilanggar saat implementasi:**
- Module hanya boleh query tabel yang jadi ownership-nya (lihat `Owns`)
- Tidak boleh inject repository module lain — pakai port/service-nya
- Business logic di Service, bukan di Controller
- Controller hanya: terima request → validasi DTO → panggil service → return `{ message, data }`

---

## 2. AUTH MODULE

### Files
```
src/auth/
├── auth.controller.ts
├── auth.module.ts
├── auth.service.ts
├── dto/register.dto.ts        (RegisterDto, RegisterMerchantDto, RegisterUserDto)
├── dto/login.dto.ts
├── strategy/jwt.strategy.ts
├── types/jwt-payload.ts
└── types/user-public.ts
```

### Owns
Tidak ada tabel sendiri (auth **tidak punya ownership data**). Data user & merchant diminta lewat module lain.

### Dependency
`UsersService` (via `UserPort`), `MerchantsService` (via `MerchantPort`), `UnitOfWork`, `JwtService`.

### Endpoints

#### POST /auth/register — public
Membuat **Merchant + Owner sekaligus** dalam satu transaction.

**Logic:**
1. Validasi `RegisterDto` (nested `merchant.name`, `user.{name,email,password}`)
2. `usersService.ensureEmailAvailable(email)` → jika ada, `ConflictException` (409)
3. `unitOfWork.run(async (tx) => { ... })`:
   - `merchantsService.createMerchant(dto.merchant.name, tx)` → buat merchant
   - `usersService.createUser({ name, email, password: await hashing.hash(password), merchantId, role: OWNER }, tx)` → buat owner
4. Buat JWT (`signToken`), payload `{ sub, email, role, merchantId, outletId }`
5. Return `{ merchant, user, accessToken }` — **user disanitasi** (password tidak boleh ikut)

> Jika salah satu gagal → rollback (tidak ada merchant yatim / user tanpa merchant)

#### POST /auth/login — public
**Logic:**
1. `usersService.findByEmail(email)` → jika null, `UnauthorizedException`
2. `hashing.compare(password, user.password)` → jika salah, `UnauthorizedException` (401)
3. `signToken(payload)` → return `{ accessToken, user }`

#### POST /auth/logout — `JwtAuthGuard`
JWT stateless → tidak ada state server yang dihapus. Cukup return sukses `{ message, data: null }`.

#### GET /auth/me — `JwtAuthGuard`
**Logic:**
- Ambil `@GetUser()` dari `req.user` (sudah diisi JwtStrategy)
- (Opsional) refresh dari DB via `usersService.findById` agar selalu aktual
- Return `{ message, data: user }`

### JwtStrategy (guard otomatis)
- Inject `UsersService`, bukan `PrismaService`
- `validate(payload)` → `usersService.findById(payload.sub)` → cek user ada & `status === ACTIVE` → return `UserPayload`
- Token payload: `sub` = userId (bukan `id`)

---

## 3. MERCHANT MODULE

### Files
```
src/merchants/
├── merchants.controller.ts
├── merchants.module.ts
├── merchants.service.ts
├── merchants.repository.ts
├── dto/create-merchant.dto.ts
└── ports/merchant.port.ts
```

### Owns
`merchant`

### Dependency
Tidak ada dependency antar-module (mandiri).

### Port — `MerchantPort`
`createMerchant(name, tx?)`, `findById(merchantId, tx?)`, `update(merchantId, { name?, lowStockThreshold? }, tx?)`

### Endpoints

#### GET /merchants — OWNER
**Logic:**
- `merchantId` diambil dari `@GetUser('merchantId')`
- `merchantsService.findById(merchantId)` → jika null `NotFoundException`
- Return merchant

#### PUT /merchants — OWNER
**Logic:**
1. Body `{ name, low_stock_threshold? }` (validate; `low_stock_threshold` ≥ 0)
2. `merchantsService.update(merchantId, { name?, lowStockThreshold? })`
3. Return merchant terbaru

> Sesuai URS §8 permission matrix: hanya **OWNER** yang mengelola profil merchant. `createMerchant` TIDAK punya endpoint sendiri — hanya dipanggil internal oleh `AuthService.register` (lewat `MerchantPort`).

---

## 4. OUTLET MODULE

### Files
```
src/outlets/
├── outlets.controller.ts
├── outlets.module.ts
├── outlets.service.ts
├── outlets.repository.ts
└── ports/outlet.port.ts
```

### Owns
`outlet`

### Dependency
Merchant (hanya untuk memastikan outlet milik merchant yang sedang login — via `merchantId` dari JWT)

### Port — `OutletPort`
`findById`, `ensureExists`, `listByMerchant`, `createOutlet`, `updateOutlet`, `deactivate`

### Endpoints

#### GET /outlets — OWNER
**Logic:**
- Filter opsional `?status=ACTIVE|INACTIVE`
- `outletsService.listByMerchant(merchantId, status)` — scope merchant dari JWT
- Return array outlet

#### POST /outlets — OWNER
**Logic:**
1. Body `{ name, address, status? }` (default ACTIVE)
2. `createOutlet(merchantId, { name, address, status })`
3. Return outlet baru (201)

#### GET /outlets/{outletId} — OWNER
**Logic:**
- `findById(outletId)` → pastikan `merchantId` sama dengan user → jika tidak / tidak ada, `NotFoundException`

#### PUT /outlets/{outletId} — OWNER
**Logic:**
- Validasi kepemilikan merchant, lalu `updateOutlet(outletId, { name?, address?, status? })`

#### DELETE /outlets/{outletId} — OWNER
**Logic:**
- **Soft delete**: `deactivate(outletId)` → set `status = INACTIVE` (bukan hapus baris)
- Return `{ message, data: null }`

> Sesuai URS §8: CRUD outlet hanya untuk **OWNER**. Outlet nonaktif read-only untuk operasi bisnis.

---

## 5. USER MODULE

### Files
```
src/users/
├── users.controller.ts
├── users.module.ts
├── users.service.ts
├── users.repository.ts
├── dto/create-user.dto.ts
└── ports/user.port.ts
```

### Owns
`user` (termasuk password hash)

### Dependency
Merchant (via `merchantId` dari JWT), Outlet (hanya validasi `outlet_id` saat buat CASHIER).

### Port — `UserPort`
`findByEmail`, `findById`, `createUser(dto, tx?)`, `ensureEmailAvailable`

### Endpoints

#### GET /users — OWNER
**Logic:**
- Filter opsional: `?role=`, `?outlet_id=`, `?status=`
- Selalu scope ke `merchantId` dari JWT
- **Jangan pernah return `password`**

#### POST /users — OWNER
**Logic:**
1. Body `{ name, email, password, role, outlet_id?, status? }`
2. `ensureEmailAvailable(email)` → 409 jika dipakai
3. Validasi aturan role:
   - `CASHIER` → `outlet_id` **wajib** menunjuk Outlet aktif di merchant yang sama (jika tidak → 400 "outlet_id is required for CASHIER role")
   - `ADMIN` → `outlet_id` **harus null** (Admin scope Merchant)
   - `OWNER` → tidak boleh dibuat lewat endpoint ini (owner hanya lewat register)
   - Email staf divalidasi case-insensitive
4. `createUser({ ..., password: await hashing.hash(password), merchantId, role, outletId, status: ACTIVE })`
5. Return user (sanitasi, tanpa password)

#### GET /users/{userId} — OWNER
**Logic:**
- `findById(userId)` + pastikan dalam merchant yang sama → return user tanpa password

#### PUT /users/{userId} — OWNER
**Logic:**
- Update `{ name?, email?, role?, outlet_id?, status? }`
- Jika role diubah ke CASHIER → `outlet_id` wajib menunjuk Outlet aktif; jika ke ADMIN → `outlet_id` harus null
- Jika email diubah → cek `ensureEmailAvailable` (kecuali milik user itu sendiri)
- Reset password → `hashing.hash` password baru
- Return user (tanpa password)

#### DELETE /users/{userId} — OWNER
**Logic:**
- **Soft delete**: set `status = INACTIVE` (bukan hapus baris). Riwayat transaksi & audit staf tetap utuh
- Prevent: jangan sampai owner terakhir dinonaktifkan (opsional)

---

## 6. CATEGORY MODULE

### Files
```
src/categories/
├── categories.controller.ts
├── categories.module.ts
├── categories.service.ts
├── categories.repository.ts
└── ports/category.port.ts
```

### Owns
`category`

### Dependency
Merchant (scope dari JWT).

### Port — `CategoryPort`
`findById`, `ensureMerchantOwnership`, `createCategory`, `listByMerchant`, `updateCategory`, `deactivate`

### Endpoints

#### GET /categories — OWNER, ADMIN
**Logic:**
- `listByMerchant(merchantId)` → return array kategori
- **Owner dan Admin** dapat melihat daftar kategori

#### POST /categories — OWNER, ADMIN
**Logic:**
1. Body `{ name }` → cek unik dalam merchant
2. `createCategory(merchantId, name)` → 201
3. **Owner dan Admin** dapat membuat kategori

#### PUT /categories/{categoryId} — OWNER, ADMIN
**Logic:**
- `ensureMerchantOwnership(categoryId, merchantId)` → pastikan milik merchant
- Update nama (cek unik)
- **Owner dan Admin** dapat mengubah kategori

#### DELETE /categories/{categoryId} — OWNER, ADMIN
**Logic:**
- **Soft delete**: `ensureMerchantOwnership(...)` lalu set `status = INACTIVE` — **bukan hapus fisik**
- Category nonaktif tidak boleh dipilih untuk Product baru
- **Owner dan Admin** dapat menonaktifkan kategori

---

## 7. PRODUCT MODULE

### Files
```
src/products/
├── products.controller.ts
├── products.module.ts
├── products.service.ts
├── products.repository.ts
└── ports/product.port.ts
```

### Owns
`product`, `category` (validasi internal)

### Dependency
Merchant (scope dari JWT).

> **Product TIDAK memiliki stock.** Stock berada di Inventory Module.

### Port — `ProductPort`
`findById`, `findByIds`, `ensureActive`, `listByMerchant`, `createProduct`, `updateProduct`, `deactivate`

### Endpoints

#### GET /products — semua role
**Logic:**
- Query params: `?category_id=`, `?status=`, `?search=` (name/SKU), `?page=`, `?limit=`
- Scope merchant dari JWT
- Response **pagination**: `{ items, total, page, limit, total_pages }`
- Item menyertakan relasi `category` (nama)

#### POST /products — OWNER, ADMIN
**Logic:**
1. Body `{ name, sku, price, category_id, status? }`
2. Validasi `category_id` milik merchant **dan aktif** (tolak Category kosong/nonaktif/asing)
3. `createProduct({ ..., merchantId })` → 201
4. Catat audit harga/status (nilai sebelum = null)
5. **Owner dan Admin** dapat membuat produk

#### GET /products/{productId} — semua role
**Logic:**
- `findById` + pastikan milik merchant → return product + category

#### PUT /products/{productId} — OWNER, ADMIN
**Logic:**
- Update `{ name?, sku?, price?, category_id?, status? }`
- Validasi category tetap milik merchant & aktif
- Catat audit: actor, waktu, nilai harga/status sebelum & sesudah
- Perubahan harga hanya berlaku untuk checkout yang belum selesai, tidak mengubah transaksi historis
- **Owner dan Admin** dapat mengubah produk

#### DELETE /products/{productId} — OWNER, ADMIN
**Logic:**
- **Soft delete**: set `status = INACTIVE` — tidak menghapus riwayat transaksi
- **Owner dan Admin** dapat menonaktifkan produk

---

## 8. INVENTORY MODULE

### Files
```
src/inventory/
├── inventory.controller.ts
├── inventory.module.ts
├── inventory.service.ts
├── inventory.repository.ts
└── ports/inventory.port.ts
```

### Owns
`inventory`

### Dependency
Product (info nama/SKU untuk tampilan via `ProductPort`), Outlet (scope).

### Port — `InventoryPort`
`getStock`, `checkStock`, `decreaseStock`, `increaseStock`, `transferStock`, `adjustStock`, `listLowStock`

### Endpoints

#### GET /inventory — semua role
**Logic:**
- Query: `?outlet_id=` (required), `?product_id=`, `?page=`, `?limit=`
- Return stock per product di outlet + relasi product (pagination)
- **Semua role dapat melihat** (Owner, Admin, Cashier)

#### GET /inventory/outlet/{outletId}/product/{productId} — semua role
**Logic:**
- `getStock` / cari row inventory untuk kombinasi outlet+product
- Jika tidak ada, return `{ quantity: 0 }` atau 404 sesuai kebijakan
- **Semua role dapat melihat**

#### PUT /inventory/{inventoryId} — ADMIN
**Logic:**
1. Body **`{ quantity, reason }`** — `reason` wajib untuk adjustment manual
2. Validasi hasil akhir ≥ 0 (stok tidak boleh negatif)
3. Update `quantity` di inventory
4. Return `{ inventory_id, quantity }`

> **Hanya ADMIN yang dapat melakukan adjustment stok.** Owner tidak memiliki akses.

#### PUT /inventory/bulk — ADMIN
**Logic:**
- Body: `{ outlet_id, items: [{ inventory_id, quantity, reason }] }` untuk satu `outlet_id`
- Semua operasi (update) dalam **satu transaction** (UnitOfWork) agar konsisten

> **Hanya ADMIN yang dapat melakukan bulk update stok.**

#### POST /inventory/transfer — ADMIN
**Logic:**
1. Body `{ product_id, from_outlet_id, to_outlet_id, quantity, reason? }`
2. Cek stock cukup di `from_outlet_id` → jika tidak `BadRequestException`
3. **Dalam satu transaction**: `decreaseStock(from, ...)` + `increaseStock(to, ...)` (pakai `transferStock` port)
4. Pastikan `from !== to`

> **Hanya ADMIN yang dapat melakukan transfer stok antar outlet.**

#### GET /inventory/low-stock — ADMIN
**Logic:**
- Ambil inventory dengan stock `<=` **`Merchant.low_stock_threshold`** (satu threshold global nonnegatif per Merchant)
- Return daftar `{ product, outlet, quantity, threshold }` untuk disorot di dashboard
- **Hanya ADMIN yang dapat melihat low stock alerts**

---

## 9. CART MODULE

### Files
```
src/cart/
├── cart.controller.ts
├── cart.module.ts
├── cart.service.ts
├── cart.repository.ts
└── ports/cart.port.ts
```

### Owns
`cart`, `cart_item`

### Dependency
Product (harga & validasi produk aktif via `ProductPort`), Inventory (cek stock via `InventoryPort`).

### Port — `CartPort`
`getCart`, `addItem`, `updateItemQuantity`, `removeItem`, `clearCart`, `getCartForCheckout`, `clearAfterCheckout`

### Karakteristik
- **Per kasir per outlet** (unique `user_id + outlet_id`)
- **Dibuat lazily** saat item pertama ditambahkan (GET tidak membuat cart)
- Stock **hanya dicek** saat add/update quantity (belum di-decrement); decrement terjadi saat checkout

### Endpoints — semua CASHIER

#### GET /cart
**Logic:**
- `cartService.getCart(userId, outletId)` (dari `@GetUser()`)
- Jika belum ada cart → `NotFoundException` (404)
- Return cart + items (hitung `subtotal` & `total_items` derived)

#### POST /cart/items
**Logic:**
1. Body `{ product_id, quantity }`
2. `productPort.ensureActive(productId)` → jika tidak ada/tidak aktif → 400
3. `inventoryPort.getStock(outletId, productId)`
4. Cari/upsert cart. Jika item sudah ada → **tambah quantity**
5. Cek `quantity baru <= stock` → jika tidak `BadRequestException("Insufficient stock ...")`
6. Simpan `unit_price` **snapshot** dari product saat itu (agar transaksi valid walau harga berubah)
7. Return cart terbaru

#### PUT /cart/items/{cartItemId}
**Logic:**
- Body `{ quantity }`
- `quantity = 0` → hapus item
- `quantity > 0` → cek stock (seperti di atas) lalu update
- Pastikan `cartItemId` milik user+outlet yang login (ownership check) → jika bukan `NotFoundException`

#### DELETE /cart/items/{cartItemId}
**Logic:**
- Ownership check → hapus item → return cart

#### DELETE /cart/clear
**Logic:**
- Hapus semua item cart user+outlet → return cart kosong

---

## 10. TRANSACTION MODULE

### Files
```
src/transactions/
├── transactions.controller.ts
├── transactions.module.ts
├── transactions.service.ts
├── transactions.repository.ts
└── ports/transaction.port.ts
```

### Owns
`transaction`, `transaction_item`

### Dependency
Product (harga snapshot via `ProductPort`), Inventory (stock via `InventoryPort`), Cart (via `CartPort`), Outlet (scope), User (cashier).

### Port — `TransactionPort`
`createTransaction`, `getById`, `listByOutlet`, `listByCashier`

### Endpoints

#### GET /transactions — semua role (CASHIER hanya outlet sendiri)
**Logic:**
- Filter: `?outlet_id=`, `?start_date=`, `?end_date=`, `?cashier_id=`, `?page=`, `?limit=`
- CASHIER → `outlet_id` dipaksa = outlet-nya (dari JWT)
- Response pagination + relasi `outlet` & `cashier`

#### POST /transactions (CHECKOUT) — CASHIER
Body: `{ cart_id? }` **atau** `{ items: [{ product_id, quantity }] }`

**Logic (wajib satu transaction — `UnitOfWork`):**
1. **Cek transaksi sebelumnya**: cari record transaksi dengan `transaction_number` yang sama atau kunci identik pada merchant → jika sudah ada dengan detail sama → **return transaksi yang sama** (200, bukan error) tanpa proses ulang; jika detail berbeda → tolak sebagai **conflict**
2. Tentukan item:
   - Jika `cart_id` → `cartPort.getCartForCheckout(userId, outletId)` → ambil items
   - Jika `items` → pakai langsung
3. Validasi ulang saat checkout: untuk tiap item — product aktif, stock cukup di outlet, harga & inventory konsisten dengan cart. Jika tidak → `BadRequestException` + info `{ product_id, product_name, requested, available }`
4. Hitung `subtotal` per item & total
5. Generate `transaction_number` unik (misal `TRX-YYYYMMDD-NNN`)
6. `createTransaction` + `transaction_items` (simpan `unit_price` snapshot & `subtotal`)
7. `inventoryPort.decreaseStock(outletId, productId, qty, tx)` untuk tiap item
8. Jika dari cart → `cartPort.clearAfterCheckout(userId, outletId)`
9. Commit → return transaction + items + **receipt**

> **Hanya CASHIER yang dapat checkout.** Owner/Admin tidak memiliki akses ke endpoint ini.

#### GET /transactions/{transactionId} — semua role (CASHIER hanya milik outlet-nya)
**Logic:**
- `getById` → return transaction + items (+ relasi product)

#### POST /transactions/{transactionId}/cancel — FUTURE / OUT OF SCOPE (MVP)
**Logic (tidak diimplementasikan di Iterasi 1):**
- Refund/void transaksi final **di luar Must**. Jika kelak ditambahkan, sistem harus membuat reversal/audit record, bukan mengubah transaksi final.
- **Tidak ada endpoint publik di MVP**

---

## 11. DASHBOARD MODULE

### Files
```
src/dashboard/
├── dashboard.controller.ts
├── dashboard.module.ts
├── dashboard.service.ts
├── dashboard.repository.ts
```

### Owns
Tidak punya tabel sendiri. **Read-only aggregator** (baca dari Transaction, Product, Inventory, Outlet, User).

### Endpoints

#### GET /dashboard/owner — OWNER
Query: `?period=TODAY|THIS_WEEK|THIS_MONTH|THIS_QUARTER|THIS_YEAR`, `?outlet_id=` (opsional).

**Logic — kembalikan satu payload besar (SINGLE ENDPOINT):**
- `summary`: total revenue, total transactions, AOV, produk terjual, jumlah outlet/pegawai/produk, growth
- `sales_trend`: deret revenue & transaksi per hari/periode
- `outlet_performance`: per-outlet revenue, transaksi, AOV, kontribusi %, growth
- `top_products` (by revenue & by quantity) + `underperforming_products`
- `time_pattern`: distribusi per jam, jam puncak, hari tersibuk/sepi
- `stock_alerts`: low stock & out of stock
- `aov_trend`, `recent_transactions`, `merchant_overview`, `period_comparison`

> **Owner fokus utama:** analytics mendalam, tren, dan segalanya dalam satu payload.

#### GET /dashboard/admin — ADMIN
**Logic:**
- **Inventory Overview Dashboard** — fokus pada stok operasional
- `summary`: total outlet, total produk, total stok keseluruhan, jumlah produk low stock, jumlah produk out of stock
- `low_stock_alerts`: daftar produk dengan stok di bawah threshold per outlet
- `out_of_stock_alerts`: daftar produk dengan stok = 0 per outlet
- `outlet_quick_stats`: per-outlet total produk, total stok, jumlah low stock, jumlah out of stock

> **Admin fokus utama:** inventory & stok. Tidak ada AI, AOV, top products, atau analytics mendalam di dashboard Admin.

---

## 12. ANALYTICS MODULE

### Files
```
src/analytics/
├── analytics.controller.ts
├── analytics.module.ts
├── analytics.service.ts
├── analytics.repository.ts
└── ports/analytics.port.ts
```

### Owns
Tidak ada tabel sendiri. **Read-heavy aggregator** — agregasi dari Transaction/TransactionItem.

### Port — `AnalyticsPort`
`salesTrend(input)`, `timePattern(outletId?, period?)`, `aovTrend(outletId?, period?)`, `productPerformance(outletId?, period?, sortBy?, limit?)`

### Endpoints

#### GET /analytics/sales-trend — OWNER
Query: `outlet_id?`, `start_date` (req), `end_date` (req), `interval=DAILY|WEEKLY|MONTHLY`.

**Logic:**
- Group transaksi `COMPLETED` per interval dalam rentang tanggal
- Return `{ trend: [{ date, total_sales, transaction_count }], summary: { total_revenue, average_daily_revenue, total_transactions, average_daily_transactions } }`

> **Hanya OWNER** yang dapat mengakses analytics mendalam.

#### GET /analytics/time-pattern — OWNER
Query: `outlet_id?`, `period=TODAY|THIS_WEEK|THIS_MONTH`.

**Logic:**
- Kelompokkan transaksi per jam → `{ patterns: [{ hour, revenue, transaction_count }], peak_hours, average_transactions_per_hour }`

> **Hanya OWNER** yang dapat mengakses analytics mendalam.

#### GET /analytics/aov-trend — OWNER
Query: `outlet_id?`, `period=THIS_WEEK|THIS_MONTH|THIS_QUARTER|THIS_YEAR`.

**Logic:**
- AOV per minggu/bulan → `{ trend: [{ period, aov, transaction_count }], overall_aov, aov_change_percentage }`

> **Hanya OWNER** yang dapat mengakses analytics mendalam.

#### GET /analytics/product-performance — OWNER
Query: `outlet_id?`, `period?`, `sort_by=REVENUE|QUANTITY`, `limit?`.

**Logic:**
- Agregasi `transaction_item` → `{ top_sellers: [...], underperformers: [...] }`

> **Hanya OWNER** yang dapat mengakses analytics mendalam.

---

## 13. AI INSIGHT MODULE

### Files
```
src/ai-insights/
├── ai-insights.controller.ts
├── ai-insights.module.ts
├── ai-insights.service.ts
├── ai-insights.repository.ts
└── ports/ai-insight.port.ts
```

### Owns
`ai_insight` (1:1 dengan merchant, **tanpa histori**)

### Dependency
Analytics (data agregasi via `AnalyticsPort`), BullMQ/Redis (async), AI provider.

### Port — `AiInsightPort`
`enqueueAnalysis`, `getCurrent`

### Endpoints

#### POST /ai-insights/analyze — OWNER
**Logic:**
1. **Tidak ada limit harian** — Owner bebas memicu analisis kapan pun
2. Jika job analisis masih berjalan untuk merchant → return 409/202 dengan status `PROCESSING` (idempotent, jangan tumpuk job)
3. **Enqueue job (async)** — jangan menahan request
4. Return 202 `{ job_id, status: "PROCESSING", message }`

**Worker (async) melakukan:**
- Ambil data via `AnalyticsPort` (sales trend, time pattern, product performance, low stock)
- Kirim ke AI provider → dapat `title`, `content`, `type`
- **Upsert** `AiInsight` untuk merchant tsb (1:1 — update baris yang sama)
- Update `ai_insight.status` menjadi `READY` atau `FAILED`
- Tandai job completed/failed

> **Hanya OWNER** yang dapat memicu analisis AI.

#### GET /ai-insights — OWNER
**Logic:**
- `getCurrent(merchantId)` → return insight terakhir + `status` (`READY` | `PROCESSING` | `STALE` | `FAILED`) atau 404 jika belum pernah
- **Hanya OWNER** yang boleh melihat insight

> **Tidak ada** list, detail by id, maupun dismiss — karena 1:1 tanpa histori. Insight hanya **saran** — tidak dapat mengubah data.

---

## 14. Lampiran — Matriks Endpoint Cepat

| Module | Method & Path | Role |
|---|---|---|
| Auth | POST /auth/register | public |
| Auth | POST /auth/login | public |
| Auth | POST /auth/logout | auth |
| Auth | GET /auth/me | auth |
| Merchant | GET,PUT /merchants | OWNER |
| Outlet | GET,POST /outlets | OWNER |
| Outlet | GET,PUT,DELETE /outlets/{id} | OWNER |
| User | GET,POST /users | OWNER |
| User | GET,PUT,DELETE /users/{id} | OWNER |
| Category | GET /categories | OWNER, ADMIN |
| Category | POST /categories | OWNER, ADMIN |
| Category | PUT /categories/{id} | OWNER, ADMIN |
| Category | DELETE /categories/{id} | OWNER, ADMIN |
| Product | GET /products | semua |
| Product | POST /products | OWNER, ADMIN |
| Product | GET /products/{id} | semua |
| Product | PUT /products/{id} | OWNER, ADMIN |
| Product | DELETE /products/{id} | OWNER, ADMIN |
| Inventory | GET /inventory | semua |
| Inventory | GET /inventory/outlet/{oid}/product/{pid} | semua |
| Inventory | PUT /inventory/{id} | ADMIN |
| Inventory | PUT /inventory/bulk | ADMIN |
| Inventory | POST /inventory/transfer | ADMIN |
| Inventory | GET /inventory/low-stock | ADMIN |
| Cart | GET /cart | CASHIER |
| Cart | POST /cart/items | CASHIER |
| Cart | PUT,DELETE /cart/items/{id} | CASHIER |
| Cart | DELETE /cart/clear | CASHIER |
| Transaction | GET /transactions | semua (CASHIER: outlet sendiri) |
| Transaction | POST /transactions | CASHIER |
| Transaction | GET /transactions/{id} | semua |
| Transaction | POST /transactions/{id}/cancel | FUTURE |
| Dashboard | GET /dashboard/owner | OWNER |
| Dashboard | GET /dashboard/admin | ADMIN |
| Analytics | GET /analytics/sales-trend | OWNER |
| Analytics | GET /analytics/time-pattern | OWNER |
| Analytics | GET /analytics/aov-trend | OWNER |
| Analytics | GET /analytics/product-performance | OWNER |
| AI Insight | POST /ai-insights/analyze | OWNER |
| AI Insight | GET /ai-insights | OWNER |

---

## 6. Role-Based Access Control (RBAC) — UPDATED

| Endpoint | Method | OWNER | ADMIN | CASHIER |
|---|---|---|---|---|
| `/auth/login` | POST | ✅ | ✅ | ✅ |
| `/auth/me` | GET | ✅ | ✅ | ✅ |
| `/merchants` | GET/PUT | ✅ | ❌ | ❌ |
| `/outlets` | GET/POST/PUT/DELETE | ✅ | ❌ | ❌ |
| `/users` | GET/POST/PUT/DELETE | ✅ | ❌ | ❌ |
| `/categories` | GET | ✅ | ✅ | ❌ |
| `/categories` | POST/PUT/DELETE | ✅ | ✅ | ❌ |
| `/products` | GET | ✅ | ✅ | ✅ |
| `/products` | POST/PUT/DELETE | ✅ | ✅ | ❌ |
| `/inventory` | GET | ✅ | ✅ | ✅ |
| `/inventory/outlet/{oid}/product/{pid}` | GET | ✅ | ✅ | ✅ |
| `/inventory/{id}` | PUT | ❌ | ✅ | ❌ |
| `/inventory/bulk` | PUT | ❌ | ✅ | ❌ |
| `/inventory/transfer` | POST | ❌ | ✅ | ❌ |
| `/inventory/low-stock` | GET | ❌ | ✅ | ❌ |
| `/cart` | GET | ❌ | ❌ | ✅ |
| `/cart/items` | POST | ❌ | ❌ | ✅ |
| `/cart/items/{id}` | PUT/DELETE | ❌ | ❌ | ✅ |
| `/cart/clear` | DELETE | ❌ | ❌ | ✅ |
| `/transactions` | GET | ✅ | ✅ | ✅ (own outlet only) |
| `/transactions` | POST | ❌ | ❌ | ✅ |
| `/transactions/{id}` | GET | ✅ | ✅ | ✅ (own outlet only) |
| `/dashboard/owner` | GET | ✅ | ❌ | ❌ |
| `/dashboard/admin` | GET | ❌ | ✅ | ❌ |
| `/analytics/*` | GET | ✅ | ❌ | ❌ |
| `/ai-insights/analyze` | POST | ✅ | ❌ | ❌ |
| `/ai-insights` | GET | ✅ | ❌ | ❌ |

---

**End of Document**