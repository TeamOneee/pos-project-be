# MODULE IMPLEMENTATION GUIDE

Dokumen ini menjadi **blueprint untuk tim implementasi**: untuk setiap module, dijelaskan file apa saja yang ada di dalamnya, endpoint apa saja yang harus disediakan, dan **logika yang harus dijalankan** di tiap endpoint.

Gunakan bersama:
- `docs/modular-architecture.md` — aturan boundary (siapa owner data, komunikasi via port).
- `docs/common-utilities.md` — cara pakai utilitas `src/common/`.
- `docs/api-contract.md` & `openapi.json` — detail request/response persis.
- `docs/data-model.md` — model data.

---

## Daftar Isi

1. [Cara Membaca Dokumen Ini](#1-cara-membaca-dokumen-ini)
2. [Auth](#2-auth-module)
3. [Merchant](#3-merchant-module)
4. [Outlet](#4-outlet-module)
5. [User](#5-user-module)
6. [Category](#6-category-module)
7. [Product](#7-product-module)
8. [Inventory](#8-inventory-module)
9. [Cart](#9-cart-module)
10. [Transaction](#10-transaction-module)
11. [Dashboard](#11-dashboard-module)
12. [Analytics](#12-analytics-module)
13. [AI Insight](#13-ai-insight-module)

---

## 1. Cara Membaca Dokumen Ini

> Panduan alur sistem **secara keseluruhan** (gambar besar, end-to-end, dan alur per-module dalam diagram): lihat [`system-flow.md`](./system-flow.md).

Setiap bagian module berisi:

| Bagian | Arti |
|---|---|
| **Files** | File yang ada di folder module (boleh berubah saat implementasi) |
| **Owns** | Data yang menjadi ownership module (hanya module ini yang boleh akses tabel tsb) |
| **Dependency** | Module/port lain yang boleh dipakai |
| **Port (public contract)** | Interface yang disediakan module untuk dipakai module lain |
| **Endpoints** | Daftar endpoint + metode + role |
| **Logic** | Blueprint alur implementasi tiap endpoint |

Aturan yang tidak boleh dilanggar saat implementasi:
- **Module hanya boleh query tabel yang jadi ownership-nya** (lihat `Owns`).
- **Tidak boleh inject repository module lain** — pakai port/service-nya.
- **Business logic di Service, bukan di Controller.**
- Controller hanya: terima request → validasi DTO → panggil service → return `{ message, data }`.

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

Logic:
1. Validasi `RegisterDto` (nested `merchant.name`, `user.{name,email,password}`).
2. `usersService.ensureEmailAvailable(email)` → jika ada, `ConflictException` (409).
3. `unitOfWork.run(async (tx) => { ... })`:
   - `merchantsService.createMerchant(dto.merchant.name, tx)` → buat merchant.
   - `usersService.createUser({ name, email, password: await hashing.hash(password), merchantId, role: OWNER }, tx)` → buat owner.
4. Buat JWT (`signToken`), payload `{ sub, email, role, merchantId, outletId }`.
5. Return `{ merchant, user, accessToken }` — **user disanitasi** (password tidak boleh ikut).

> Jika salah satu gagal → rollback (tidak ada merchant yatim / user tanpa merchant).

#### POST /auth/login — public
Logic:
1. `usersService.findByEmail(email)` → jika null, `UnauthorizedException`.
2. `hashing.compare(password, user.password)` → jika salah, `UnauthorizedException` (401).
3. `signToken(payload)` → return `{ accessToken, user }`.

#### POST /auth/logout — `JwtAuthGuard`
JWT stateless → tidak ada state server yang dihapus. Cukup return sukses `{ message, data: null }`. (Opsional: blacklist token bila dibutuhkan.)

#### GET /auth/me — `JwtAuthGuard`
Logic:
- Ambil `@GetUser()` dari `req.user` (sudah diisi JwtStrategy).
- (Opsional) refresh dari DB via `usersService.findById` agar selalu aktual.
- Return `{ message, data: user }`.

### JwtStrategy (guard otomatis)
- Inject `UsersService`, bukan `PrismaService`.
- `validate(payload)` → `usersService.findById(payload.sub)` → cek user ada & `status === ACTIVE` → return `UserPayload`.
- Token payload: `sub` = userId (bukan `id`).

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
Logic:
- `merchantId` diambil dari `@GetUser('merchantId')`.
- `merchantsService.findById(merchantId)` → jika null `NotFoundException`.
- Return merchant.

#### PUT /merchants — OWNER
Logic:
1. Body `{ name, low_stock_threshold? }` (validate; `low_stock_threshold` ≥ 0).
2. `merchantsService.update(merchantId, { name?, lowStockThreshold? })`.
3. Return merchant terbaru.

> Sesuai URS §8 permission matrix: hanya **OWNER** yang mengelola profil merchant (Admin tidak). `createMerchant` TIDAK punya endpoint sendiri — hanya dipanggil internal oleh `AuthService.register` (lewat `MerchantPort`).

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
Merchant (hanya untuk memastikan outlet milik merchant yang sedang login — via `merchantId` dari JWT, tidak perlu panggil MerchantPort kecuali validasi eksistensi).

### Port — `OutletPort`
`findById`, `ensureExists`, `listByMerchant`, `createOutlet`, `updateOutlet`, `deactivate`

### Endpoints

#### GET /outlets — OWNER
Logic:
- Filter opsional `?status=ACTIVE|INACTIVE`.
- `outletsService.listByMerchant(merchantId, status)` — scope merchant dari JWT.
- Return array outlet.

#### POST /outlets — OWNER
Logic:
1. Body `{ name, address, status? }` (default ACTIVE).
2. `createOutlet(merchantId, { name, address, status })`.
3. Return outlet baru (201).

#### GET /outlets/{outletId} — OWNER
Logic:
- `findById(outletId)` → pastikan `merchantId` sama dengan user → jika tidak / tidak ada, `NotFoundException`.

#### PUT /outlets/{outletId} — OWNER
Logic:
- Validasi kepemilikan merchant, lalu `updateOutlet(outletId, { name?, address?, status? })`.

#### DELETE /outlets/{outletId} — OWNER
Logic:
- **Soft delete**: `deactivate(outletId)` → set `status = INACTIVE` (bukan hapus baris).
- Return `{ message, data: null }`.

> Sesuai URS §8: CRUD outlet hanya untuk **OWNER** (Admin tidak). Outlet nonaktif read-only untuk operasi bisnis (tidak dapat checkout / stock adjustment baru), tetapi histori tetap dapat dibaca (FR-TEN-004).

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
Logic:
- Filter opsional: `?role=`, `?outlet_id=`, `?status=`.
- Selalu scope ke `merchantId` dari JWT.
- **Jangan pernah return `password`.**

#### POST /users — OWNER
Logic:
1. Body `{ name, email, password, role, outlet_id?, status? }`.
2. `ensureEmailAvailable(email)` → 409 jika dipakai.
3. Validasi aturan role (FR-AUTH-011, FR-TEN-005):
   - `CASHIER` → `outlet_id` **wajib** menunjuk Outlet aktif di merchant yang sama (jika tidak → 400 "outlet_id is required for CASHIER role").
   - `ADMIN` → `outlet_id` **harus null** (Admin scope Merchant, FR-TEN-006).
   - `OWNER` → tidak boleh dibuat lewat endpoint ini (owner hanya lewat register).
   - Email staf divalidasi case-insensitive (FR-AUTH-012).
4. `createUser({ ..., password: await hashing.hash(password), merchantId, role, outletId, status: ACTIVE })`.
5. Return user (sanitasi, tanpa password).

#### GET /users/{userId} — OWNER
Logic:
- `findById(userId)` + pastikan dalam merchant yang sama → return user tanpa password.

#### PUT /users/{userId} — OWNER
Logic:
- Update `{ name?, email?, role?, outlet_id?, status? }` (FR-AUTH-014: hanya OWNER yang boleh mengubah role/outlet/status/reset password staf).
- Jika role diubah ke CASHIER → `outlet_id` wajib menunjuk Outlet aktif; jika ke ADMIN → `outlet_id` harus null.
- Jika email diubah → cek `ensureEmailAvailable` (kecuali milik user itu sendiri).
- Reset password → `hashing.hash` password baru.
- Return user (tanpa password).

#### DELETE /users/{userId} — OWNER
Logic:
- **Soft delete**: set `status = INACTIVE` (bukan hapus baris). Riwayat transaksi & audit staf tetap utuh (FR-TEN-007).
- Prevent: jangan sampai owner terakhir dinonaktifkan (opsional, rule bisnis).

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
`findById`, `ensureMerchantOwnership`, `createCategory`, `listByMerchant`

### Endpoints

#### GET /categories — OWNER, ADMIN
Logic:
- `listByMerchant(merchantId)` → return array kategori.

#### POST /categories — OWNER, ADMIN
Logic:
- Body `{ name }` → cek unik dalam merchant (FR-CAT-010) → `createCategory(merchantId, name)` → 201.

#### PUT /categories/{categoryId} — OWNER, ADMIN
Logic:
- `ensureMerchantOwnership(categoryId, merchantId)` → pastikan milik merchant → update nama (cek unik).

#### DELETE /categories/{categoryId} — OWNER, ADMIN
Logic:
- **Soft delete**: `ensureMerchantOwnership(...)` lalu set `status = INACTIVE` — **bukan hapus fisik** (FR-CAT-010).
- Category nonaktif tidak boleh dipilih untuk Product baru/perubahan, tetapi relasi Product & riwayat yang sudah ada tetap utuh (URB-016 / BR-019).

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
`product`, `category` (sesuai guideline, category juga milik product — validasi internal)

### Dependency
Merchant (scope dari JWT).

> **Product TIDAK memiliki stock.** Stock berada di Inventory Module.

### Port — `ProductPort`
`findById`, `findByIds`, `ensureActive`, `listByMerchant`

### Endpoints

#### GET /products — semua role
Logic:
- Query params: `?category_id=`, `?status=`, `?search=` (name/SKU), `?page=`, `?limit=`.
- Scope merchant dari JWT.
- Response **pagination**: `{ items, total, page, limit, total_pages }`.
- Item menyertakan relasi `category` (nama).

#### POST /products — OWNER, ADMIN
Logic:
1. Body `{ name, sku, price, category_id, status? }`.
2. Validasi `category_id` milik merchant **dan aktif** (FR-CAT-003: tolak Category kosong/nonaktif/asing).
3. `createProduct({ ..., merchantId })` → 201.
4. Catat audit harga/status (nilai sebelum = null) — FR-CAT-008.

#### GET /products/{productId} — semua role
Logic:
- `findById` + pastikan milik merchant → return product + category.

#### PUT /products/{productId} — OWNER, ADMIN
Logic:
- Update `{ name?, sku?, price?, category_id?, status? }`.
- Validasi category tetap milik merchant & aktif.
- Catat audit: actor, waktu, nilai harga/status sebelum & sesudah (FR-CAT-008).
- Perubahan harga hanya berlaku untuk checkout yang belum selesai, tidak mengubah transaksi historis (UR-ADM-005).

#### DELETE /products/{productId} — OWNER, ADMIN
Logic:
- **Soft delete**: set `status = INACTIVE` — tidak menghapus riwayat transaksi (FR-CAT-007).

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
`inventory` (stock), `stock_movements` (bila nanti audit)

### Dependency
Product (info nama/SKU untuk tampilan), Outlet (scope).

### Port — `InventoryPort`
`getStock`, `checkStock`, `decreaseStock`, `increaseStock`, `transferStock`, `adjustStock`

### Endpoints

#### GET /inventory — semua role
Logic:
- Query: `?outlet_id=` (required), `?product_id=`, `?page=`, `?limit=`.
- Return stock per product di outlet + relasi product (pagination).

#### GET /inventory/outlet/{outletId}/product/{productId} — semua role
Logic:
- `getStock` / cari row inventory untuk kombinasi outlet+product → jika tidak ada, return `{ quantity: 0 }` atau 404 sesuai kebijakan.

#### PUT /inventory/{inventoryId} — OWNER, ADMIN
Logic:
1. Body **`{ quantity, reason }`** — `reason` **wajib** untuk setiap adjustment manual (FR-INV-003).
2. Baca `before` = quantity saat ini; hitung `delta = target - before`.
3. Validasi hasil akhir ≥ 0 (FR-INV-002 / BR-011A: stok tidak boleh negatif).
4. Dalam **satu transaction** (UnitOfWork):
   - `updateQuantity(inventoryId, target)`;
   - buat **`StockMovement`** tipe `ADJUSTMENT` dengan `before`, `after`, `delta`, `reason`, `actor`, `timestamp` (FR-INV-003, BR-019).
5. Return `{ inventory_id, before, after, delta, reason }`.

#### POST /inventory/bulk — OWNER, ADMIN
Logic:
- Body: `{ outlet_id, items: [{ product_id, quantity, reason }] }` untuk satu `outlet_id`.
- `reason` wajib di tiap item.
- Semua operasi (update + StockMovement per item) dalam **satu transaction** (UnitOfWork) agar konsisten.

#### POST /inventory/transfer — OWNER, ADMIN
Logic:
1. Body `{ product_id, from_outlet_id, to_outlet_id, quantity, reason? }`.
2. Cek stock cukup di `from_outlet_id` → jika tidak `BadRequestException`.
3. **Dalam satu transaction**: `decreaseStock(from, ...)` + `increaseStock(to, ...)` (pakai `transferStock` port) + catat StockMovement di kedua sisi (actor & timestamp).
4. Pastikan `from !== to`.

#### GET /inventory/low-stock — OWNER, ADMIN
Logic:
- Ambil inventory dengan stock `<=` **`Merchant.low_stock_threshold`** (satu threshold global nonnegatif per Merchant, berlaku untuk semua Outlet — FR-INV-008 / DR-011A).
- Return daftar `{ product, outlet, quantity, threshold }` untuk disorot di dashboard.

> **Siapa yang boleh decrement saat transaksi?** Hanya Transaction/Checkout lewat `InventoryPort.decreaseStock`. Inventory sendiri tidak menghitung harga.
> **Audit**: setiap perubahan stok (adjustment manual, sale, transfer) harus tercatat di `StockMovement` (tipe `ADJUSTMENT`/`SALE`/`TRANSFER_IN`/`TRANSFER_OUT`) dengan before/after/delta/reason/actor/timestamp (FR-INV-003, BR-019).

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
- **Per kasir per outlet** (unique `user_id + outlet_id`).
- **Dibuat lazily** saat item pertama ditambahkan (GET tidak membuat cart).
- Stock **hanya dicek** saat add/update quantity (belum di-decrement); decrement terjadi saat checkout.

### Endpoints — semua CASHIER

#### GET /cart
Logic:
- `cartService.getCart(userId, outletId)` (dari `@GetUser()`).
- Jika belum ada cart → `NotFoundException` (404).
- Return cart + items (hitung `subtotal` & `total_items` derived).

#### POST /cart/items
Logic:
1. Body `{ product_id, quantity }`.
2. `productPort.ensureActive(productId)` → jika tidak ada/tidak aktif → 400.
3. `inventoryPort.getStock(outletId, productId)`.
4. Cari/upsert cart. Jika item sudah ada → **tambah quantity**.
5. Cek `quantity baru <= stock` → jika tidak `BadRequestException("Insufficient stock ...")`.
6. Simpan `unit_price` **snapshot** dari product saat itu (agar transaksi valid walau harga berubah).
7. Return cart terbaru.

#### PUT /cart/items/{cartItemId}
Logic:
- Body `{ quantity }`.
- `quantity = 0` → hapus item.
- `quantity > 0` → cek stock (seperti di atas) lalu update.
- Pastikan `cartItemId` milik user+outlet yang login (ownership check) → jika bukan `NotFoundException`.

#### DELETE /cart/items/{cartItemId}
Logic:
- Ownership check → hapus item → return cart.

#### DELETE /cart/clear
Logic:
- Hapus semua item cart user+outlet → return cart kosong (atau snapshot kosong jika belum ada).

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
`createTransaction`, `getById`, `cancel`, `listByOutlet`, `listByCashier`

### Endpoints

#### GET /transactions — semua role (CASHIER hanya outlet sendiri)
Logic:
- Filter: `?outlet_id=`, `?start_date=`, `?end_date=`, `?cashier_id=`, `?page=`, `?limit=`.
- CASHIER → `outlet_id` dipaksa = outlet-nya (dari JWT).
- Response pagination + relasi `outlet` & `cashier`.

#### POST /transactions (CHECKOUT) — semua role (CASHIER outlet sendiri)
Body: `{ idempotency_key, payment_method, cart_id? }` **atau** `{ idempotency_key, payment_method, items: [{ product_id, quantity }] }`.

> `idempotency_key` **wajib** — client menghasilkan satu key unik per checkout attempt (FR-CHK-001, FR-CHK-002). `payment_method` wajib: `CASH` atau `CASHLESS_MANUAL` (FR-PAY-001; MVP hanya mencatat, tidak memindahkan dana / tidak ada payment gateway — ASM-008).

Logic (wajib **satu transaction** — `UnitOfWork`):
1. **Idempotency check**: cari `Payment` dengan `idempotency_key` yang sama pada merchant (FR-CHK-001) → jika sudah ada dengan payload sama → **return transaksi yang sama** (200, bukan error) tanpa proses ulang (FR-CHK-002, FR-CHK-003); jika payload **berbeda** → tolak sebagai **conflict** (FR-CHK-004). Hindari double-charge.
2. Tentukan item:
   - Jika `cart_id` → `cartPort.getCartForCheckout(userId, outletId)` → ambil items.
   - Jika `items` → pakai langsung.
3. Validasi ulang saat checkout (FR-CHK-005 / UC-05): untuk tiap item — product aktif, stock cukup di outlet, harga & inventory konsisten dengan cart. Jika tidak → `BadRequestException` + info `{ product_id, product_name, requested, available }` (kode error seperti `PRICE_CHANGED`, `PRODUCT_INACTIVE`, `INSUFFICIENT_STOCK`).
4. Hitung `subtotal` per item & total.
5. Generate `transaction_number` unik (misal `TRX-YYYYMMDD-NNN`).
6. `createTransaction` + `transaction_items` (simpan `unit_price` snapshot & `subtotal`) + **`Payment` record** (FR-PAY-002): `{ payment_method, amount = total, status: CONFIRMED, idempotency_key, paid_at }`.
7. `inventoryPort.decreaseStock(outletId, productId, qty, tx)` untuk tiap item.
8. Jika dari cart → `cartPort.clearAfterCheckout(userId, outletId)`.
9. Commit → return transaction + items + payment + **receipt** (FR-PAY-006).

> Jika salah satu gagal (stock habis dll) → **rollback semua**, tidak ada transaksi parsial.
> Karena idempotency_key + pembayaran + transaksi dikomit atomik dalam satu UnitOfWork, satu checkout attempt menghasilkan paling banyak satu transaksi final (FR-CHK-003, ASM-003).

#### GET /transactions/{transactionId} — semua role (CASHIER hanya milik outlet-nya)
Logic:
- `getById` → return transaction + items (+ relasi product).

#### POST /transactions/{transactionId}/cancel — **FUTURE / OUT OF SCOPE (MVP)**
Logic (tidak diimplementasikan di Iterasi 1):
- Refund/void transaksi final **di luar Must** (ASM-007, OD-005). Jika kelak ditambahkan, sistem harus membuat reversal/audit record, bukan mengubah transaksi final (FR-TRX-008).
- `cancel` pada `TransactionPort` dapat dipertahankan sebagai stub internal untuk masa depan, tetapi **tidak ada endpoint publik di MVP**.

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
Tidak punya tabel sendiri. **Read-only aggregator** (baca dari Transaction, Product, Inventory, Outlet, User lewat read contract / query di scope merchant).

### Endpoints

#### GET /dashboard/owner — OWNER
Query: `?period=TODAY|THIS_WEEK|THIS_MONTH|THIS_QUARTER|THIS_YEAR`, `?outlet_id=` (opsional).

Logic — kembalikan **satu payload besar** (SINGLE ENDPOINT):
- `summary`: total revenue, total transactions, AOV, produk terjual, jumlah outlet/pegawai/produk, growth.
- `sales_trend`: deret revenue & transaksi per hari/periode.
- `outlet_performance`: per-outlet revenue, transaksi, AOV, kontribusi %, growth.
- `top_products` (by revenue & by quantity) + `underperforming_products`.
- `time_pattern`: distribusi per jam, jam puncak, hari tersibuk/sepi.
- `stock_alerts`: low stock & out of stock.
- `aov_trend`, `recent_transactions`, `merchant_overview`, `period_comparison`.

> Baca dari Primary DB dulu; ke depannya boleh diarahkan ke read replica (lihat LLA).

#### GET /dashboard/admin — ADMIN
Logic:
- Ringkasan operasional: total outlet, pegawai aktif, produk, transaksi per outlet, stok menipis.
- Tidak perlu sedetail Owner dashboard (tanpa AI/AOV/analytics mendalam).

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
Tidak ada tabel sendiri. **Read-heavy aggregator** — agregasi dari Transaction/TransactionItem (dan Product/Inventory untuk nama & stok).

### Port — `AnalyticsPort`
`salesTrend(input)`, `timePattern(outletId?, period?)`, `aovTrend(outletId?, period?)`, `productPerformance(outletId?, period?, sortBy?, limit?)`

### Endpoints

#### GET /analytics/sales-trend — OWNER, ADMIN
Query: `outlet_id?`, `start_date` (req), `end_date` (req), `interval=DAILY|WEEKLY|MONTHLY`.
Logic:
- Group transaksi `COMPLETED` per interval dalam rentang tanggal.
- Return `{ trend: [{ date, total_sales, transaction_count }], summary: { total_revenue, average_daily_revenue, total_transactions, average_daily_transactions } }`.

#### GET /analytics/time-pattern — OWNER, ADMIN
Query: `outlet_id?`, `period=TODAY|THIS_WEEK|THIS_MONTH`.
Logic:
- Kelompokkan transaksi per jam → `{ patterns: [{ hour, revenue, transaction_count }], peak_hours, average_transactions_per_hour }`.

#### GET /analytics/aov-trend — OWNER, ADMIN
Query: `outlet_id?`, `period=THIS_WEEK|THIS_MONTH|THIS_QUARTER|THIS_YEAR`.
Logic:
- AOV per minggu/bulan → `{ trend: [{ period, aov, transaction_count }], overall_aov, aov_change_percentage }`.

#### GET /analytics/product-performance — OWNER, ADMIN
Query: `outlet_id?`, `period?`, `sort_by=REVENUE|QUANTITY`, `limit?`.
Logic:
- Agregasi `transaction_item` → `{ top_sellers: [...], underperformers: [...] }` (produk dengan penjualan terendah / lama tidak terjual).

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
Logic:
1. **Tidak ada limit harian** — Owner bebas memicu analisis kapan pun (FR-AI-012, ASM-010, UR-AI-010).
2. Jika job analisis masih berjalan untuk merchant → return 409/202 dengan status `PROCESSING` (idempotent, jangan tumpuk job).
3. **Enqueue job (async)** — jangan menahan request. Pemrosesan menggunakan **sistem berjenjang**:
   - **L1 (baseline):** job disimpan di DB (`AiJobRecord`) → rate limiting → worker polling.
   - **L2 (scale-up):** naik ke BullMQ + Redis bila L1 kurang (concurrency/retry terjadwal).
   - Detail alur lengkap: lihat [`ai-analyze-flow.md`](./ai-analyze-flow.md).
4. Return 202 `{ job_id, status: "PROCESSING", message }`.

Worker (async) melakukan:
- Ambil data via `AnalyticsPort` (sales trend, time pattern, product performance, low stock).
- Kirim ke AI provider → dapat `title`, `content`, `type`.
- **Upsert** `AiInsight` untuk merchant tsb (1:1 — update baris yang sama).
- Tandai job completed/failed.

#### GET /ai-insights — OWNER
Logic:
- `getCurrent(merchantId)` → return insight terakhir + `status` (`READY` | `PROCESSING` | `STALE` | `FAILED`; FR-AI-008) atau 404 jika belum pernah.
- **Hanya OWNER** yang boleh melihat/mengelola insight (FR-AI-012, URS §8). Admin tidak.

> **Tidak ada** list, detail by id, maupun dismiss — karena 1:1 tanpa histori (sudah disepakati).
> Insight yang dihasilkan hanya **saran** — tidak dapat mengubah data atau menjalankan operasi (prinsip "advise, do not command" — `deliverables/01-iterasi-1-business-flow.md` §11 Lapisan 4).

---

## Lampiran — Matriks Endpoint Cepat

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
| Category | GET,POST /categories | OWNER, ADMIN |
| Category | PUT,DELETE /categories/{id} | OWNER, ADMIN |
| Product | GET /products | semua |
| Product | POST /products | OWNER, ADMIN |
| Product | GET,PUT,DELETE /products/{id} | GET: semua; PUT/DELETE: OWNER, ADMIN |
| Inventory | GET /inventory | semua |
| Inventory | GET /inventory/outlet/{oid}/product/{pid} | semua |
| Inventory | PUT /inventory/{id} | OWNER, ADMIN |
| Inventory | POST /inventory/bulk | OWNER, ADMIN |
| Inventory | POST /inventory/transfer | OWNER, ADMIN |
| Inventory | GET /inventory/low-stock | OWNER, ADMIN |
| Cart | GET /cart | CASHIER |
| Cart | POST /cart/items | CASHIER |
| Cart | PUT,DELETE /cart/items/{id} | CASHIER |
| Cart | DELETE /cart/clear | CASHIER |
| Transaction | GET,POST /transactions | semua (CASHIER: outlet sendiri) |
| Transaction | GET /transactions/{id} | semua |
| Transaction | POST /transactions/{id}/cancel | FUTURE / di luar scope MVP |
| Dashboard | GET /dashboard/owner | OWNER |
| Dashboard | GET /dashboard/admin | ADMIN |
| Analytics | GET /analytics/* | OWNER, ADMIN |
| AI Insight | POST /ai-insights/analyze | OWNER |
| AI Insight | GET /ai-insights | OWNER |
