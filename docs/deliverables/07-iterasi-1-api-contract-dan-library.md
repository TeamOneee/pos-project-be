# Iterasi 1 — API Contract Lengkap & Library per Modul (NestJS)

> Dokumen ini adalah **perluasan detail** dari `05-iterasi-1-build-plan-nestjs.md` §1, §5, §6 — khusus membahas kontrak API secara lengkap (semua endpoint, DTO, response, error case) dan daftar library per modul secara menyeluruh. Requirement ID yang dirujuk tetap dari SRS (`03-iterasi-1-proposed-srs.md`). Bila ada perbedaan dengan dokumen `05`, dokumen ini yang lebih detail dan berlaku sebagai acuan implementasi.

---

## 0. Konvensi global API

| Aspek | Aturan |
|---|---|
| Base URL | `/api/v1` |
| Auth | Header `Authorization: Bearer <accessToken>`. Klaim JWT wajib: `sub` (userId), `merchantId`, `role`, `outletId` (nullable). Server **tidak pernah** mempercayai `merchantId`/`outletId` dari body — selalu dari klaim token tervalidasi (FR-TEN-010). |
| Content-Type | `application/json` untuk semua request/response |
| Uang | String desimal eksplisit, contoh `"total": "125000.00"` — **tidak pernah** number JSON (API-006) |
| Waktu | ISO-8601 dengan offset, contoh `"2026-08-13T10:00:00+07:00"` (API-005) |
| Pagination | Query `?page=0&size=20` (default `size=20`, maks `size=100`, `API-004`). Response list selalu dibungkus: |

```json
{
  "content": [ /* array item */ ],
  "page": 0,
  "size": 20,
  "totalElements": 134,
  "totalPages": 7
}
```

| Correlation ID | Setiap response (sukses maupun error) menyertakan header `X-Correlation-Id`. Client boleh kirim `X-Correlation-Id` sendiri untuk propagate trace, kalau tidak dikirim server generate baru (NFR-OBS-005). |
| Format error | Semua response non-2xx: |

```json
{
  "code": "INSUFFICIENT_STOCK",
  "message": "Stok tidak mencukupi untuk 1 produk.",
  "correlationId": "c-9f2a7e21",
  "details": [
    { "field": "items[1].productId", "reason": "stock=1, requested=3" }
  ]
}
```

### 0.1 Katalog kode error global (dipakai di seluruh dokumen ini)

| `code` | HTTP status | Kondisi |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input tidak valid (`class-validator` gagal) |
| `UNAUTHENTICATED` | 401 | Token tidak ada/invalid/kedaluwarsa |
| `FORBIDDEN` | 403 | Role/tenant tidak berhak |
| `NOT_FOUND` | 404 | Resource tidak ditemukan **atau** milik merchant/outlet lain (disamarkan, FR-TEN-010) |
| `PRODUCT_INACTIVE` | 409 | Produk tidak aktif saat checkout |
| `PRICE_CHANGED` | 409 | Harga server berbeda dari `expectedUnitPrice` |
| `INSUFFICIENT_STOCK` | 409 | Stok outlet tidak cukup |
| `IDEMPOTENCY_CONFLICT` | 409 | Key sama, payload beda |
| `CHECKOUT_PROCESSING` | 409 | Request checkout sebelumnya dengan key sama masih diproses |
| `CHECKOUT_NOT_CONFIRMED` | 422 | Hasil checkout tidak diketahui pasti (dipakai di respons lookup, bukan error keras) |
| `RATE_LIMITED` | 429 | Melewati batas `@nestjs/throttler` |
| `DEPENDENCY_UNAVAILABLE` | 503 | Database/dependency inti tidak sehat |
| `REPORT_STALE` | — (bukan error, flag di body 200) | Dipakai di `freshnessStatus`, bukan HTTP error |
| `INSIGHT_UNAVAILABLE` | — (flag di body 200) | Insight job gagal, dashboard tetap tampil |
| `INTERNAL_ERROR` | 500 | Error tak terduga; tidak menampilkan stack trace ke client |

---

## 1. Modul Identity — `libs/identity`

### 1.1 Endpoint

#### `POST /auth/register`
- Role: publik
- Requirement: FR-AUTH-001–004, FR-TEN-001–003

Request:
```json
{ "name": "Budi Santoso", "email": "budi@warungku.id", "password": "P4ssw0rd!23", "merchantName": "Warung Budi" }
```
Validasi (`class-validator`): `name` non-empty ≤150, `email` format valid + akan dinormalisasi lowercase, `password` min 8 karakter + kombinasi huruf/angka, `merchantName` non-empty ≤150.

Response `201`:
```json
{ "userId": "uuid", "merchantId": "uuid", "email": "budi@warungku.id", "role": "OWNER" }
```
Error: `VALIDATION_ERROR` (400), `409 EMAIL_ALREADY_REGISTERED` (khusus, turunan `VALIDATION_ERROR` dengan `field:"email"`).

#### `POST /auth/login`
- Role: publik
- Requirement: FR-AUTH-005–007

Request: `{ "email": "budi@warungku.id", "password": "P4ssw0rd!23" }`

Response `200`:
```json
{ "accessToken": "eyJ...", "refreshToken": "eyJ...", "expiresIn": 900, "role": "OWNER", "merchantId": "uuid", "outletId": null }
```
Error: `401 UNAUTHENTICATED` (credential salah **atau** akun nonaktif — pesan sama, tidak membocorkan mana yang salah, FR-AUTH-006), `429 RATE_LIMITED` (>5 percobaan/menit per email+IP, FR-AUTH-010).

#### `POST /auth/refresh`
- Role: authenticated (refresh token valid)
- Request: `{ "refreshToken": "eyJ..." }`
- Response `200`: `{ "accessToken": "eyJ...", "expiresIn": 900 }`
- Error: `401 UNAUTHENTICATED`

#### `POST /auth/logout`
- Role: authenticated
- Response `204`, tidak ada body. Refresh token direvoke (disimpan di tabel/blacklist token — lihat §3 platform).

#### `POST /staff`
- Role: `OWNER`
- Requirement: FR-AUTH-011–014, FR-TEN-005–006

Request:
```json
{ "name": "Sari", "email": "sari@warungku.id", "password": "InitPass1!", "role": "CASHIER", "outletId": "uuid" }
```
Validasi tambahan di service (bukan hanya DTO): `role=CASHIER` → `outletId` wajib & harus outlet aktif milik merchant yang sama; `role=ADMIN` → `outletId` harus kosong (kalau dikirim, ditolak `VALIDATION_ERROR`).

Response `201`: `{ "userId": "uuid", "email": "sari@warungku.id", "role": "CASHIER", "outletId": "uuid", "status": "ACTIVE" }`

Error: `VALIDATION_ERROR` (400, termasuk kombinasi role/outlet tidak sah), `403 FORBIDDEN` (bukan OWNER), `409 EMAIL_ALREADY_REGISTERED`.

#### `GET /staff?role=&status=&page=`
- Role: `OWNER`
- Response `200`: `Page<StaffDto>` — tiap item `{userId, name, email, role, outletId, status, createdAt}`.

#### `PATCH /staff/:userId`
- Role: `OWNER`
- Requirement: FR-AUTH-014, BR-011

Request (semua field opsional, minimal 1 harus diisi):
```json
{ "role": "ADMIN", "outletId": null, "status": "INACTIVE", "newPassword": "NewPass1!" }
```
Response `200`: `StaffDto` terbaru.
Error: `VALIDATION_ERROR`, `403 FORBIDDEN` (target bukan staf merchant sendiri, atau target adalah OWNER lain), `404 NOT_FOUND`.

### 1.2 Library modul `identity`

| Package | Versi disarankan | Fungsi |
|---|---|---|
| `@nestjs/passport` | `^10.x` | Integrasi strategy auth ke Nest |
| `passport-jwt` | `^4.x` | Strategy validasi JWT dari header `Authorization` |
| `@nestjs/jwt` | `^10.x` | Sign/verify access & refresh token |
| `argon2` | `^0.31.x` | Hash password (Argon2id), NFR-SEC-001 |
| `@nestjs/throttler` | `^5.x` | Rate limit login (FR-AUTH-010) |
| `class-validator`, `class-transformer` | `^0.14.x` / `^0.5.x` | Validasi DTO register/login/staff |
| `uuid` | `^9.x` | Generate ID kalau tidak pakai default Prisma `uuid()` |

Install:
```bash
npm i @nestjs/passport passport-jwt @nestjs/jwt argon2 @nestjs/throttler class-validator class-transformer
npm i -D @types/passport-jwt
```

---

## 2. Modul Tenant — `libs/tenant`

### 2.1 Endpoint

#### `GET /merchant`
- Role: semua role authenticated
- Response `200`: `{ "id": "uuid", "name": "Warung Budi", "timezone": "Asia/Jakarta", "currency": "IDR", "lowStockThreshold": 5, "status": "ACTIVE" }`

#### `PATCH /merchant`
- Role: `OWNER`
- Requirement: FR-INV-008, DR-011A
- Request: `{ "name": "Warung Budi Jaya", "lowStockThreshold": 10 }`
- Error: `VALIDATION_ERROR` (`lowStockThreshold < 0`)

#### `POST /outlets`
- Role: `OWNER`
- Requirement: FR-TEN-004
- Request: `{ "name": "Outlet Margonda", "address": "Jl. Margonda No. 1" }`
- Response `201`: `{ "id": "uuid", "name": "...", "address": "...", "status": "ACTIVE" }`

#### `GET /outlets?status=&page=`
- Role: `OWNER`, `ADMIN`
- Response `200`: `Page<OutletDto>`

#### `PATCH /outlets/:id`
- Role: `OWNER`
- Requirement: FR-TEN-004 (outlet nonaktif = read-only untuk operasi bisnis)
- Request: `{ "name": "...", "address": "...", "status": "INACTIVE" }`
- Error: `409` jika mencoba mengaktifkan kembali outlet yang punya konflik nama, `403 FORBIDDEN`

### 2.2 Library modul `tenant`

| Package | Fungsi |
|---|---|
| — | Modul ini murni pakai Prisma (`PrismaWriteService` dari `platform`) + `class-validator`. Tidak butuh library eksternal tambahan. |

---

## 3. Modul Catalog — `libs/catalog`

### 3.1 Endpoint

#### `POST /categories`
- Role: `OWNER`, `ADMIN`
- Requirement: FR-CAT-001, DR-010
- Request: `{ "name": "Minuman" }`
- Response `201`: `{ "id": "uuid", "name": "Minuman", "isActive": true }`
- Error: `409 VALIDATION_ERROR` (nama duplikat dalam merchant)

#### `GET /categories?isActive=&page=`
- Role: semua role (Kasir hanya lihat `isActive=true`, dipaksa di service bukan query param)
- Response `200`: `Page<CategoryDto>`

#### `PATCH /categories/:id`
- Role: `OWNER`, `ADMIN`
- Requirement: BR-019 (soft-deactivation, bukan delete fisik)
- Request: `{ "name": "Minuman Dingin", "isActive": false }`
- Response `200`: `CategoryDto`
- **Catatan implementasi:** endpoint ini **tidak pernah** `DELETE` — hanya `PATCH isActive=false`. Tidak ada `DELETE /categories/:id` di kontrak ini sama sekali (sengaja, sesuai BR-019).

#### `POST /products`
- Role: `OWNER`, `ADMIN`
- Requirement: FR-CAT-002–003
- Request: `{ "name": "Es Teh Manis", "price": "8000.00", "categoryId": "uuid", "isActive": true }`
- Response `201`: `ProductDto`
- Error: `VALIDATION_ERROR` (nama kosong, harga negatif, category kosong/nonaktif/bukan milik merchant)

#### `GET /products?search=&categoryId=&isActive=&page=`
- Role: `OWNER`, `ADMIN`
- Response `200`: `Page<ProductDto>` — `{id, name, price, categoryId, categoryName, isActive}`

#### `GET /products/catalog?outletId=`
- Role: `CASHIER`
- Requirement: FR-CAT-006 (produk aktif **yang punya inventory row** di outlet tugasnya)
- Response `200`: `[{ "id":"uuid","name":"Es Teh Manis","price":"8000.00","categoryId":"uuid","stockQuantity":12 }]`
- Error: `403 FORBIDDEN` jika `outletId` bukan outlet tugas Kasir (dicek dari klaim JWT, bukan dipercaya dari query)

#### `PATCH /products/:id`
- Role: `OWNER`, `ADMIN`
- Requirement: FR-CAT-005, FR-CAT-008 (rekam actor/waktu/before-after)
- Request: `{ "name": "...", "price": "9000.00", "categoryId": "uuid", "isActive": true }`
- Response `200`: `ProductDto`

### 3.2 Library modul `catalog`

| Package | Fungsi |
|---|---|
| — | Murni Prisma + `class-validator`. Tidak ada dependency eksternal khusus. |

---

## 4. Modul Inventory — `libs/inventory`

### 4.1 Endpoint

#### `GET /inventory?outletId=&productId=&lowStockOnly=&page=`
- Role: `OWNER`, `ADMIN`
- Requirement: FR-INV-002
- Response `200`: `Page<InventoryDto>` — `{id, outletId, outletName, productId, productName, quantity, updatedAt}`

#### `POST /inventory/adjustments`
- Role: `OWNER`, `ADMIN`
- Requirement: FR-INV-003, FR-INV-004
- Request: `{ "outletId": "uuid", "productId": "uuid", "delta": -3, "reason": "Barang rusak" }`
- Response `201`:
```json
{ "movementId": "uuid", "outletId": "uuid", "productId": "uuid", "quantityBefore": 12, "quantityAfter": 9, "delta": -3, "reason": "Barang rusak", "actorUserId": "uuid", "createdAt": "..." }
```
- Error: `VALIDATION_ERROR` (`reason` kosong, `delta=0`), `409 VALIDATION_ERROR` (hasil jadi negatif), `403 FORBIDDEN` (outlet nonaktif — outlet nonaktif read-only, FR-TEN-004)

#### `GET /inventory/movements?outletId=&productId=&type=&dateFrom=&dateTo=&page=`
- Role: `OWNER`, `ADMIN`
- Response `200`: `Page<StockMovementDto>`

### 4.2 Library modul `inventory`

| Package | Fungsi |
|---|---|
| — | Murni Prisma. Logic conditional-update atomik ada di service, tidak butuh library concurrency tambahan. |

---

## 5. Modul Sales — `libs/sales` (paling kritis)

### 5.1 Endpoint

#### `POST /cart` *(opsional, kalau cart dipersist server-side)*
- Role: `CASHIER`
- Requirement: FR-CART-001
- Request: `{ "outletId": "uuid" }`
- Response `201`: `{ "cartId": "uuid", "outletId": "uuid", "items": [] }`

#### `POST /cart/:cartId/items`
- Role: `CASHIER`
- Requirement: FR-CART-002
- Request: `{ "productId": "uuid", "quantity": 2 }`
- Response `200`: `CartDto` (item ditambah/quantity digabung kalau produk sudah ada)
- Error: `409 PRODUCT_INACTIVE`, `VALIDATION_ERROR` (`quantity <= 0`)

#### `DELETE /cart/:cartId/items/:itemId`
- Role: `CASHIER`
- Requirement: FR-CART-003
- Response `204`

#### `DELETE /cart/:cartId`
- Role: `CASHIER`
- Requirement: FR-CART-003 (batalkan keranjang)
- Response `204`

#### `POST /checkout` — **endpoint terpenting di seluruh sistem**
- Role: `CASHIER`
- Requirement: FR-CHK-001–017, FR-CART-005–010, FR-PAY-001–007, BR-006–010

Request:
```json
{
  "idempotencyKey": "a3f5c9d2-1e4b-4a2c-9f21-client-generated-uuid",
  "outletId": "uuid",
  "items": [
    { "productId": "uuid-1", "quantity": 2, "expectedUnitPrice": "8000.00" },
    { "productId": "uuid-2", "quantity": 1, "expectedUnitPrice": "15000.00" }
  ],
  "payment": { "method": "CASH", "amount": "31000.00" }
}
```

Header wajib tambahan: `Idempotency-Key` (opsional duplikat dari body, beberapa tim taruh di header — pilih **salah satu** konsisten; dokumen ini pakai body `idempotencyKey` sebagai sumber utama).

Response `200 COMPLETED`:
```json
{
  "transactionId": "uuid",
  "receiptNumber": "INV-2026-000123",
  "status": "COMPLETED",
  "outletId": "uuid",
  "cashier": { "id": "uuid", "name": "Sari" },
  "items": [
    { "productId": "uuid-1", "name": "Es Teh Manis", "unitPrice": "8000.00", "quantity": 2, "subtotal": "16000.00" },
    { "productId": "uuid-2", "name": "Nasi Goreng", "unitPrice": "15000.00", "quantity": 1, "subtotal": "15000.00" }
  ],
  "subtotal": "31000.00",
  "total": "31000.00",
  "payment": { "method": "CASH", "amount": "31000.00", "status": "CONFIRMED" },
  "createdAt": "2026-08-13T10:00:00+07:00"
}
```

Response error spesifik (contoh):
```json
// 409 PRICE_CHANGED
{ "code": "PRICE_CHANGED", "message": "Harga produk berubah sejak ditambahkan ke keranjang.",
  "correlationId": "c-...", "details": [{ "field": "items[0].productId", "reason": "currentPrice=9000.00" }] }

// 409 INSUFFICIENT_STOCK
{ "code": "INSUFFICIENT_STOCK", "message": "Stok tidak mencukupi.",
  "correlationId": "c-...", "details": [{ "field": "items[1].productId", "reason": "stock=0, requested=1" }] }

// 409 IDEMPOTENCY_CONFLICT
{ "code": "IDEMPOTENCY_CONFLICT", "message": "Key sudah dipakai dengan isi keranjang berbeda.", "correlationId": "c-..." }

// 409 CHECKOUT_PROCESSING
{ "code": "CHECKOUT_PROCESSING", "message": "Checkout sebelumnya masih diproses.", "correlationId": "c-..." }

// 409 PRODUCT_INACTIVE
{ "code": "PRODUCT_INACTIVE", "message": "Produk tidak lagi dijual.",
  "correlationId": "c-...", "details": [{ "field": "items[0].productId" }] }
```

Semua error di atas menjamin **tidak ada** perubahan stok/transaksi parsial (FR-CHK-007, all-or-nothing).

#### `GET /transactions/status?idempotencyKey=`
- Role: `CASHIER`
- Requirement: FR-CHK-012, UC-05
- Response `200` (kalau sudah selesai): sama seperti response `POST /checkout` sukses.
- Response `200` (masih diproses): `{ "status": "PROCESSING" }`
- Response `404`: key tidak ditemukan/kedaluwarsa → client boleh submit ulang sebagai checkout baru.

#### `GET /transactions?dateFrom=&dateTo=&status=&outletId=&page=`
- Role: `OWNER` (semua outlet), `ADMIN` (semua outlet), `CASHIER` (scope sesuai `OD-003`, default: outlet + transaksi sendiri)
- Requirement: FR-TRX-001–002
- Response `200`: `Page<TransactionSummaryDto>` — `{transactionId, receiptNumber, outletId, cashierName, total, status, createdAt}`

#### `GET /transactions/:id`
- Role: sesuai scope FR-TRX-003/006
- Response `200`: detail lengkap (sama seperti response checkout sukses)
- Error: `404 NOT_FOUND` (termasuk kalau milik merchant/outlet lain — disamarkan)

#### `GET /transactions/search?receiptNumber=`
- Role: sesuai scope
- Requirement: FR-TRX-005 (exact match)
- Response `200`: `TransactionDetailDto` atau `404`

#### `GET /receipts/:transactionId`
- Role: sesuai scope
- Requirement: FR-PAY-006–007 (dari snapshot, bukan re-kalkulasi katalog saat ini)
- Response `200`: format sama seperti detail transaksi, ditambah field cetak `merchantName`, `outletName`, `outletAddress`

### 5.2 Library modul `sales`

| Package | Fungsi |
|---|---|
| — (Node built-in `crypto`) | `sha256` untuk `payloadFingerprint` idempotency |
| `date-fns` atau `date-fns-tz` | Perhitungan waktu aman timezone (mis. nomor receipt per hari sesuai `merchant.timezone`, BR-018) |
| `@nestjs/throttler` | Rate limit endpoint checkout per user (NFR-SEC-008) — bisa reuse instance dari `platform`, tidak perlu install ulang |

Install tambahan khusus modul ini:
```bash
npm i date-fns date-fns-tz
```

---

## 6. Modul Reporting — `libs/reporting`

### 6.1 Endpoint

Semua endpoint di bawah **hanya baca** dari `ReportingProjection` (via `PrismaReadService`, read replica) — tidak pernah query tabel `transaction` langsung (FR-REP-002, isolasi workload).

#### `GET /dashboard/summary?dateFrom=&dateTo=&outletId=`
- Role: `OWNER` (semua outlet/pilih outlet), `ADMIN` (operasional saja — tanpa akses insight)
- Requirement: FR-REP-001–004
- Response `200`:
```json
{
  "grossSales": "4500000.00", "transactionCount": 128, "averageTransactionValue": "35156.25",
  "dataUpdatedAt": "2026-08-13T09:55:00+07:00", "freshnessStatus": "FRESH",
  "periodStart": "2026-08-01T00:00:00+07:00", "periodEnd": "2026-08-13T23:59:59+07:00"
}
```

#### `GET /dashboard/sales-trend?dateFrom=&dateTo=&bucket=DAY`
- Role: `OWNER`
- Requirement: FR-REP-003A
- Response `200`: `{ "bucket": "DAY", "dataUpdatedAt": "...", "points": [ { "bucketStart": "2026-08-01T00:00:00+07:00", "grossSales": "350000.00", "transactionCount": 12 } ] }`

#### `GET /dashboard/aov-trend?dateFrom=&dateTo=&bucket=DAY`
- Role: `OWNER`
- Requirement: FR-REP-003A
- Response `200`: `{ "bucket": "DAY", "points": [ { "bucketStart": "...", "averageTransactionValue": "29166.67" } ] }`

#### `GET /dashboard/time-pattern?dateFrom=&dateTo=`
- Role: `OWNER`
- Requirement: FR-REP-003C
- Response `200`: `{ "timezone": "Asia/Jakarta", "points": [ { "hourOfDay": 12, "grossSales": "820000.00", "transactionCount": 24 } ] }`

#### `GET /dashboard/top-products?dateFrom=&dateTo=&limit=10&outletId=`
- Role: `OWNER`
- Requirement: FR-REP-003B
- Response `200`: `{ "topSelling": [ {"productId":"uuid","name":"Es Teh Manis","unitsSold":140,"grossSales":"1120000.00"} ], "leastSelling": [ {"productId":"uuid","name":"Kopi Susu","unitsSold":0,"grossSales":"0.00"} ] }`

#### `GET /dashboard/outlet-comparison?dateFrom=&dateTo=`
- Role: `OWNER`
- Requirement: FR-REP-003 poin "perbandingan outlet"
- Response `200`: `[ { "outletId":"uuid","outletName":"Margonda","grossSales":"2500000.00","transactionCount":70 } ]`

#### `GET /dashboard/low-stock?threshold=`
- Role: `OWNER`, `ADMIN`
- Requirement: FR-INV-008
- Response `200`: `[ { "productId":"uuid","name":"Kopi Susu","outletId":"uuid","outletName":"...","quantity":2 } ]` (default `threshold` = `merchant.lowStockThreshold`)

### 6.2 Library modul `reporting`

| Package | Fungsi |
|---|---|
| — | Murni Prisma (`PrismaReadService`) + agregasi di SQL/service layer. Tidak butuh library statistik eksternal untuk MVP. |
| `date-fns-tz` | Bucketing waktu sesuai `merchant.timezone` untuk sales-trend & time-pattern (shared dengan `sales`, tidak perlu install ulang kalau sudah ada di root `package.json`) |

---

## 7. Modul Insight (BI) — `libs/insight`

> **Notifikasi:** Fitur "AI Insight" diimplementasikan sebagai **Business Intelligence (BI)**. Modul ini menghasilkan **beberapa tipe insight** (tren penjualan, perbandingan outlet, produk terlaris/tidak laku, pola waktu, tren AOV), bukan satu tipe insight tunggal; AI (rule-based atau provider eksternal) menjadi mesin pengerja/penjelas.

### 7.1 Endpoint

#### `POST /insights/trigger`
- Role: `OWNER` only
- Requirement: FR-AI-001–003, FR-AI-012 (maksimal satu analisis per hari per merchant; tipe BI: `SALES_TREND`, `OUTLET_COMPARISON`, `TOP_PRODUCTS`, `TIME_PATTERN`, `AOV_TREND`)

Request:
```json
{ "type": "SALES_TREND", "dateFrom": "2026-08-01", "dateTo": "2026-08-13", "outletId": null }
```
Response `202`:
```json
{ "jobId": "uuid", "insightId": "uuid", "status": "PENDING" }
```
Error: `403 FORBIDDEN` (bukan OWNER — diverifikasi security test khusus, FR-AI-012), `VALIDATION_ERROR` (`type` tidak dikenal, rentang tanggal invalid)

#### `GET /insights`
- Role: `OWNER` only
- Requirement: FR-AI-004–005 (evidence-based, bukan hanya teks generatif)
- Mengembalikan **hasil insight terbaru per tipe** untuk merchant (beberapa tipe BI; satu hasil terbaru per tipe, tanpa histori per tipe).
- Response `200`:
```json
{
  "insights": [
    {
      "id": "uuid", "type": "SALES_TREND", "status": "READY",
      "title": "Penjualan naik 18% dibanding periode sebelumnya",
      "explanation": "Gross sales periode ini Rp4.500.000 dibanding Rp3.813.000 periode sebelumnya.",
      "evidence": { "currentGrossSales": "4500000.00", "previousGrossSales": "3813000.00", "deltaPercent": 18.0 },
      "periodStart": "2026-08-01T00:00:00+07:00", "periodEnd": "2026-08-13T23:59:59+07:00",
      "generatedAt": "2026-08-13T10:02:00+07:00"
    },
    {
      "id": "uuid", "type": "OUTLET_COMPARISON", "status": "READY",
      "title": "Outlet Margonda menyumbang 56% penjualan",
      "explanation": "Gross sales Margonda Rp2.500.000 dari total Rp4.500.000.",
      "evidence": { "outlets": [ { "outletId": "uuid", "name": "Margonda", "grossSales": "2500000.00" } ] },
      "periodStart": "2026-08-01T00:00:00+07:00", "periodEnd": "2026-08-13T23:59:59+07:00",
      "generatedAt": "2026-08-13T10:02:10+07:00"
    }
  ]
}
```
Kalau `status` bukan `READY` (`PENDING`/`PROCESSING`/`FAILED`/`STALE`), field `explanation`/`evidence` boleh `null` dan client menampilkan status sesuai FR-AI-008.
Error: `404 NOT_FOUND` bila merchant belum pernah memicu analisis untuk tipe tersebut.

### 7.2 Library modul `insight`

| Package | Fungsi |
|---|---|
| — (default: `RuleBasedInsightAdapter`) | Tidak butuh library eksternal — insight dihitung langsung dari `ReportingProjection` dengan aturan statistik sederhana (delta %, ranking) |
| `axios` atau bawaan `fetch` (Node 18+) | **Opsional**, hanya kalau pakai `ExternalAiAdapter` (provider AI eksternal) |
| `cockatiel` | **Opsional**, timeout + circuit breaker untuk panggilan provider eksternal (EXT-AI-003) |

Install (hanya kalau pakai provider eksternal):
```bash
npm i axios cockatiel
```

---

## 8. Modul Audit — `libs/audit`

### 8.1 Endpoint

#### `GET /audit?actorId=&action=&targetType=&dateFrom=&dateTo=&page=`
- Role: `OWNER`
- Requirement: FR-AUD-005 (Should)
- Response `200`: `Page<AuditEventDto>` — `{id, actorId, actorName, action, targetType, targetId, result, correlationId, createdAt}` (tanpa `beforeJson`/`afterJson` di list, hanya di detail kalau dibutuhkan)

### 8.2 Library modul `audit`

| Package | Fungsi |
|---|---|
| `@nestjs/event-emitter` | `@OnEvent()` listener yang mendengarkan event domain (`StaffCreatedEvent`, `PriceChangedEvent`, `StockAdjustedEvent`, `CheckoutCompletedEvent`, dll) dari modul lain tanpa modul lain memanggil `audit` secara langsung |

Install:
```bash
npm i @nestjs/event-emitter
```

---

## 9. Modul Platform (shared) — `libs/platform`

Modul ini tidak punya endpoint sendiri (tidak ada controller publik selain healthcheck), tapi jadi fondasi semua modul lain.

| Sub-bagian | Isi | Dipakai oleh |
|---|---|---|
| `error/` | `AllExceptionsFilter` (global exception filter, format response error §0), `ErrorCode` enum | Semua modul |
| `security/` | `JwtAuthGuard`, `RolesGuard`, `@Roles()` decorator, `@CurrentUser()` decorator, `CorrelationIdMiddleware` | Semua modul |
| `money/` | `Money` helper (wrapper `Prisma.Decimal`, format serialize ke string API-006) | `catalog`, `inventory`, `sales`, `reporting` |
| `outbox/` | `OutboxService.publish(tx, eventType, payload)`, `OutboxRelayService` (`@Cron`, jalan di `apps/worker`) | `sales` (publish), `reporting`/`insight` (consume) |
| `job/` | `JobRecordService` (retry+backoff+dead-letter generik) | `insight` |
| `prisma/` | `PrismaWriteService`, `PrismaReadService` | Semua modul |
| `pagination/` | `PageRequestDto`, `PageResponseDto<T>` generic | Semua modul dengan endpoint list |

### 9.1 Endpoint (non-bisnis, operasional)

#### `GET /health`
- Role: publik (atau dibatasi internal network di Railway)
- Requirement: FR-OPS-001
- Response `200`: `{ "status": "ok", "database": "ok", "workerBacklog": { "outboxPending": 3, "jobPending": 0 } }`

### 9.2 Library modul `platform`

| Package | Fungsi |
|---|---|
| `nestjs-pino` + `pino-http` | Structured JSON logging dengan correlation ID otomatis (NFR-OBS-001) |
| `@willsoto/nestjs-prometheus` + `prom-client` | Metrics endpoint `/metrics` (checkout rate, error rate, latency, job backlog — NFR-OBS-002) |
| `nestjs-cls` | AsyncLocalStorage untuk propagate correlation ID lintas service/layer tanpa passing manual |
| `class-validator`, `class-transformer` | Base untuk semua DTO validation di seluruh modul |
| `@nestjs/config` | Load `.env` terpusat (`DATABASE_URL_WRITE`, `DATABASE_URL_READ_REPLICA`, `JWT_SECRET`, dll), NFR-SEC-009 |
| `@nestjs/terminus` | Healthcheck endpoint standar (`/health`) dengan health indicator Prisma |
| `@prisma/client` + `prisma` (devDependency) | ORM client + CLI migrate |
| `@nestjs/schedule` | `@Cron`/`@Interval` untuk `OutboxRelayService` dan job AI (dipakai di `apps/worker`) |

Install:
```bash
npm i nestjs-pino pino-http @willsoto/nestjs-prometheus prom-client nestjs-cls \
      class-validator class-transformer @nestjs/config @nestjs/terminus \
      @prisma/client @nestjs/schedule
npm i -D prisma
```

---

## 10. Ringkasan `package.json` root (gabungan semua modul)

```jsonc
{
  "dependencies": {
    "@nestjs/common": "^10.x", "@nestjs/core": "^10.x", "@nestjs/platform-express": "^10.x",
    "@nestjs/config": "^3.x", "@nestjs/terminus": "^10.x", "@nestjs/schedule": "^4.x",
    "@nestjs/event-emitter": "^2.x", "@nestjs/swagger": "^7.x", "@nestjs/throttler": "^5.x",
    "@nestjs/passport": "^10.x", "@nestjs/jwt": "^10.x", "passport-jwt": "^4.x",
    "@prisma/client": "^5.x",
    "argon2": "^0.31.x",
    "class-validator": "^0.14.x", "class-transformer": "^0.5.x",
    "nestjs-pino": "^4.x", "pino-http": "^9.x",
    "@willsoto/nestjs-prometheus": "^6.x", "prom-client": "^15.x",
    "nestjs-cls": "^4.x",
    "date-fns": "^3.x", "date-fns-tz": "^2.x",
    "uuid": "^9.x"
  },
  "devDependencies": {
    "prisma": "^5.x",
    "@types/passport-jwt": "^4.x", "@types/uuid": "^9.x",
    "jest": "^29.x", "supertest": "^6.x", "testcontainers": "^10.x",
    "dependency-cruiser": "^16.x",
    "eslint": "^8.x", "@typescript-eslint/parser": "^7.x", "@typescript-eslint/eslint-plugin": "^7.x"
  }
}
```
Package **opsional** (baru diinstall kalau enhancement dipakai): `axios`, `cockatiel` (provider AI eksternal), `bullmq` + `ioredis` (kalau outbox polling diupgrade ke message broker sesuai roadmap §9 dokumen `05`).

---

## 11. Traceability ringkas: endpoint → requirement ID

| Area endpoint | Requirement utama |
|---|---|
| `/auth/*`, `/staff/*` | FR-AUTH-001–014, FR-TEN-001–008 |
| `/merchant`, `/outlets/*` | FR-TEN-004 |
| `/categories/*`, `/products/*` | FR-CAT-001–010, BR-019 |
| `/inventory/*` | FR-INV-001–009 |
| `/cart/*`, `/checkout`, `/transactions/*`, `/receipts/*` | FR-CART-001–010, FR-CHK-001–017, FR-PAY-001–008, FR-TRX-001–008, BR-001–014 |
| `/dashboard/*` | FR-REP-001–010 |
| `/insights/*` | FR-AI-001–012 |
| `/audit` | FR-AUD-001–006 |
| `/health` | FR-OPS-001–006 |

Setiap endpoint di atas wajib punya minimal 1 acceptance test yang menautkan langsung ke ID requirement ini (lihat `AT-*` di SRS §17.2) sebelum dianggap "Done" (SRS §21 Definition of Done).