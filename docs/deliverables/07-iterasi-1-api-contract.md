# Iterasi 1 — API Contract Lengkap (NestJS Modular Monolith)

**Version:** 1.0.0
**Last Updated:** Agustus 2026

> Dokumen ini adalah **kontrak API lengkap** untuk seluruh modul yang dinyatakan di `05-iterasi-1-build-plan-nestjs.md` §5, diperluas dengan data model, relasi antar modul, dan diagram alur dari `06-iterasi-1-module-interface-contract.md`. Bila ada konflik dengan dokumen `01`–`04`, **SRS menang**. Bila ada perbedaan detail dengan `05`, bagian yang lebih detail (dokumen ini) berlaku sebagai acuan implementasi HTTP layer.
>
> Konvensi penulisan: seluruh nama field **`snake_case`**, seluruh ID memakai **UUID (string)** kecuali disebutkan lain. Format response/error mengikuti konvensi global `05` §5 (bare format, tanpa envelope).

---

## Daftar Isi

1. [Modul Identity — `libs/identity`](#1-modul-identity--libsidentity)
2. [Modul Tenant — `libs/tenant`](#2-modul-tenant--libstenant)
3. [Modul Catalog — `libs/catalog`](#3-modul-catalog--libscatalog)
4. [Modul Inventory — `libs/inventory`](#4-modul-inventory--libsinventory)
5. [Modul Sales — `libs/sales`](#5-modul-sales--libssales)
6. [Modul Reporting — `libs/reporting`](#6-modul-reporting--libsreporting)
7. [Modul Insight (BI) — `libs/insight`](#7-modul-insight-bi--libsinsight)
8. [Modul Audit — `libs/audit`](#8-modul-audit--libsaudit)
9. [Modul Platform (shared) — `libs/platform`](#9-modul-platform-shared--libsplatform)
10. [Traceability ringkas](#10-traceability-ringkas)

---

## 0. Konvensi global API

| Aspek | Aturan |
|---|---|
| Base URL | `/api/v1` |
| Auth | Header `Authorization: Bearer <access_token>`. Klaim JWT wajib: `sub` (user_id), `merchant_id`, `role`, `outlet_id` (nullable). Server **tidak pernah** mempercayai `merchant_id`/`outlet_id` dari body/query — selalu dari klaim token tervalidasi (FR-TEN-010). |
| Content-Type | `application/json` untuk semua request/response |
| Uang | String desimal eksplisit, contoh `"total": "125000.00"` — **tidak pernah** number JSON (API-006) |
| Waktu | ISO-8601 dengan offset, contoh `"2026-08-13T10:00:00+07:00"` (API-005) |
| Pagination | Query `?page=0&size=20` (default `size=20`, maks `size=100`, API-004). Response list selalu dibungkus: |

```json
{
  "content": [ /* array item */ ],
  "page": 0,
  "size": 20,
  "total_elements": 134,
  "total_pages": 7
}
```

| Correlation ID | Setiap response (sukses maupun error) menyertakan header `X-Correlation-Id`. Client boleh kirim `X-Correlation-Id` sendiri untuk propagate trace; kalau tidak dikirim, server generate baru (NFR-OBS-005). |
| Format error | Semua response non-2xx (bare format, tanpa envelope): |

```json
{
  "code": "INSUFFICIENT_STOCK",
  "message": "Stok tidak mencukupi untuk 1 produk.",
  "correlation_id": "c-9f2a7e21",
  "details": [
    { "field": "items[1].product_id", "reason": "stock=1, requested=3" }
  ]
}
```

> Catatan: kode error `correlation_id` di JSON body merupakan duplikat dari header `X-Correlation-Id` untuk kemudahan debugging client.

### 0.1 Katalog kode error global (dipakai di seluruh dokumen ini)

| `code` | HTTP status | Kondisi |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input tidak valid (`class-validator` gagal, termasuk kombinasi role/outlet tidak sah dan `payment.amount != total`) |
| `UNAUTHENTICATED` | 401 | Token tidak ada/invalid/kedaluwarsa; atau kredensial login salah (pesan disamarkan, FR-AUTH-006) |
| `FORBIDDEN` | 403 | Role/tenant tidak berhak |
| `NOT_FOUND` | 404 | Resource tidak ditemukan **atau** milik merchant/outlet lain (disamarkan, FR-TEN-010) |
| `EMAIL_ALREADY_REGISTERED` | 409 | Email sudah terdaftar (register owner / create staff) |
| `PRODUCT_INACTIVE` | 409 | Produk tidak aktif saat checkout / tambah keranjang |
| `PRICE_CHANGED` | 409 | Harga server berbeda dari `expected_unit_price` |
| `INSUFFICIENT_STOCK` | 409 | Stok outlet tidak cukup |
| `IDEMPOTENCY_CONFLICT` | 409 | Key sama, payload beda |
| `CHECKOUT_PROCESSING` | 409 | Request checkout sebelumnya dengan key sama masih diproses |
| `CHECKOUT_NOT_CONFIRMED` | 422 | Hasil checkout tidak diketahui pasti (dipakai di respons lookup, bukan error keras) |
| `RATE_LIMITED` | 429 | Melewati batas `@nestjs/throttler` |
| `DEPENDENCY_UNAVAILABLE` | 503 | Database/dependency inti tidak sehat |
| `REPORT_STALE` | — (flag di body 200) | Dipakai di `freshness_status`, bukan HTTP error |
| `INSIGHT_UNAVAILABLE` | — (flag di body 200) | Insight job gagal, dashboard tetap tampil |
| `INTERNAL_ERROR` | 500 | Error tak terduga; tidak menampilkan stack trace ke client |

### 0.2 Konvensi tabel endpoint

Setiap endpoint disajikan dengan:

1. **Tabel properti** — Authentication (publik/token) dan Required Roles.
2. **Tabel parameter** — path/query (bila ada).
3. **Tabel request body** — `field | type | required | description`.
4. **Tabel response** — `status | kondisi | body (key fields)`; minimal 1 success case dan semua error case yang masuk akal (400/403/404/409/422).
5. **Catatan (ℹ)** dan **warning (⚠)** untuk behavior khusus/edge case.

Istilah role: `OWNER` = pemilik merchant, `ADMIN` = pengelola operasional (katalog/stok + dashboard operasional), `CASHIER` = kasir pada outlet tugasnya. Lihat matriks role di `03` §7.1 dan `04` §5.

---

## 1. Modul Identity — `libs/identity`

### 1.1 Overview

| Aspek | Nilai |
|---|---|
| Base URL | `/api/v1` |
| Scope | Registrasi owner + merchant, login/logout/refresh, lifecycle staf |
| State machine | **AccountStatus:** `ACTIVE` ↔ `INACTIVE`. Staf baru lahir `ACTIVE`; `PATCH /staff/:user_id` dapat menonaktifkan (logout paksa, token tidak berlaku lagi). `INACTIVE` tidak bisa checkout/login. |
| Aturan bisnis utama | |
| | 1. User pertama sebuah merchant selalu `OWNER`; satu Owner tepat satu Merchant (FR-TEN-002). |
| | 2. `role=CASHIER` → `outlet_id` **wajib** dan harus outlet aktif milik merchant yang sama; `role=ADMIN` → `outlet_id` **harus kosong** (ditolak bila dikirim). |
| | 3. Email dinormalisasi lowercase dan unik per sistem (FR-AUTH-004). |
| | 4. Password min 8 karakter + kombinasi huruf/angka; di-hash `argon2` (NFR-SEC-001). |
| | 5. Login di-rate-limit >5 percobaan/menit per email+IP (FR-AUTH-010). |
| | 6. Error login disamarkan (401) baik kredensial salah maupun akun nonaktif (FR-AUTH-006). |

### 1.2 Endpoint

#### `POST /auth/register`

| Properti | Nilai |
|---|---|
| Authentication | Publik (tanpa token) |
| Required Roles | — |

**Request body** (FR-AUTH-001–004, FR-TEN-001–003):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `name` | string | wajib | Nama lengkap owner, non-empty ≤ 150 |
| `email` | string | wajib | Email owner, format valid, dinormalisasi lowercase, unik |
| `password` | string | wajib | Min 8 karakter + kombinasi huruf/angka |
| `merchant_name` | string | wajib | Nama merchant, non-empty ≤ 150 |

```json
{ "name": "Budi Santoso", "email": "budi@warungku.id", "password": "P4ssw0rd!23", "merchant_name": "Warung Budi" }
```

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 201 | Berhasil | `{ user_id, merchant_id, email, role: "OWNER" }` |
| 400 | Validasi gagal | `VALIDATION_ERROR` |
| 409 | Email sudah dipakai | `EMAIL_ALREADY_REGISTERED`, `details.field="email"` |
| 500 | Error tak terduga | `INTERNAL_ERROR` |

```json
{ "user_id": "uuid", "merchant_id": "uuid", "email": "budi@warungku.id", "role": "OWNER" }
```

**Catatan ℹ:** Proses ini membuat Merchant + User OWNER + `merchant.service_charge_pct` default `10` dalam satu transaksi DB (atomik). `service_charge_pct` (5–15) ditetapkan saat membentuk Merchant (FR-TEN-011, OD-004); tidak ada endpoint untuk mengubahnya pada Iterasi 1.

#### `POST /auth/login`

| Properti | Nilai |
|---|---|
| Authentication | Publik |
| Required Roles | — |

**Request body** (FR-AUTH-005–007):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `email` | string | wajib | Email terdaftar |
| `password` | string | wajib | Password plain (dibandingkan hash argon2) |

```json
{ "email": "budi@warungku.id", "password": "P4ssw0rd!23" }
```

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ access_token, refresh_token, expires_in, role, merchant_id, outlet_id }` |
| 401 | Kredensial salah **atau** akun nonaktif (pesan sama) | `UNAUTHENTICATED` |
| 429 | >5 percobaan/menit per email+IP | `RATE_LIMITED` |

```json
{ "access_token": "eyJ...", "refresh_token": "eyJ...", "expires_in": 900, "role": "OWNER", "merchant_id": "uuid", "outlet_id": null }
```

**Catatan ℹ:** `access_token` berumur pendek (900 detik), `refresh_token` untuk `POST /auth/refresh`. `outlet_id` berisi UUID untuk `CASHIER`, `null` untuk `OWNER`/`ADMIN`.

#### `POST /auth/refresh`

| Properti | Nilai |
|---|---|
| Authentication | Refresh token valid |
| Required Roles | — |

**Request body:** `{ "refresh_token": "eyJ..." }`

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ access_token, expires_in }` |
| 401 | Refresh token invalid/kedaluwarsa/revoked | `UNAUTHENTICATED` |

#### `POST /auth/logout`

| Properti | Nilai |
|---|---|
| Authentication | Token valid |
| Required Roles | — |

**Response:**

| Status | Kondisi | Body |
|---|---|---|
| 204 | Berhasil | Kosong (refresh token direvoke) |
| 401 | Token tidak valid | `UNAUTHENTICATED` |

#### `POST /staff`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Request body** (FR-AUTH-011–014, FR-TEN-005–006):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `name` | string | wajib | Nama staf |
| `email` | string | wajib | Unik, dinormalisasi lowercase |
| `password` | string | wajib | Password awal, min 8 karakter |
| `role` | enum | wajib | `ADMIN` atau `CASHIER` |
| `outlet_id` | uuid | wajib bila `role=CASHIER`; dilarang bila `role=ADMIN` | Outlet tugas kasir |

```json
{ "name": "Sari", "email": "sari@warungku.id", "password": "InitPass1!", "role": "CASHIER", "outlet_id": "uuid" }
```

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 201 | Berhasil | `{ user_id, email, role, outlet_id, status }` |
| 400 | Kombinasi role/outlet tidak sah atau validasi gagal | `VALIDATION_ERROR` |
| 403 | Bukan OWNER | `FORBIDDEN` |
| 409 | Email sudah dipakai | `EMAIL_ALREADY_REGISTERED` |
| 404 | Outlet tidak ditemukan / bukan milik merchant | `NOT_FOUND` (disamarkan) |

```json
{ "user_id": "uuid", "email": "sari@warungku.id", "role": "CASHIER", "outlet_id": "uuid", "status": "ACTIVE" }
```

**Warning ⚠:** `outlet_id` harus dicocokkan ke merchant pemanggil via `TenantAuthorizationService` — jangan percaya input begitu saja (FR-TEN-010).

#### `GET /staff`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `role` | enum | opsional | Filter `ADMIN` / `CASHIER` |
| `status` | enum | opsional | Filter `ACTIVE` / `INACTIVE` |
| `page`, `size` | int | opsional | Paginasi (default 0/20, maks 100) |

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `Page<StaffDto>` — item `{ user_id, name, email, role, outlet_id, status, created_at }` |
| 403 | Bukan OWNER | `FORBIDDEN` |

#### `PATCH /staff/:user_id`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Parameter path:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `user_id` | uuid | wajib | Target staf yang diubah |

**Request body** (FR-AUTH-014, BR-011) — semua opsional, minimal 1 diisi:

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `role` | enum | opsional | Ubah role (kombinasi role/outlet tetap divalidasi) |
| `outlet_id` | uuid / null | opsional | Pindah outlet kasir / kosongkan untuk ADMIN |
| `status` | enum | opsional | `ACTIVE` / `INACTIVE` |
| `new_password` | string | opsional | Reset password |

```json
{ "role": "ADMIN", "outlet_id": null, "status": "INACTIVE", "new_password": "NewPass1!" }
```

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `StaffDto` terbaru |
| 400 | Validasi gagal (mis. ADMIN tetap dikirim `outlet_id`) | `VALIDATION_ERROR` |
| 403 | Target bukan staf merchant sendiri, atau target OWNER lain | `FORBIDDEN` |
| 404 | Staf tidak ditemukan | `NOT_FOUND` (disamarkan) |

**Catatan ℹ:** OWNER tidak dapat diubah/dinonaktifkan oleh OWNER lain (hanya ada satu OWNER per merchant).

### 1.3 Endpoint internal (service-to-service)

Tidak ada endpoint HTTP internal — monolith in-process. Komunikasi internal modul Identity:

| Mekanisme | Detail |
|---|---|
| Interface publik (barrel `index.ts`) | `AuthService`, `StaffService` dipakai oleh controller `apps/api` (06 §3.1) |
| Domain event (`@nestjs/event-emitter`) | `StaffCreatedEvent`, `StaffUpdatedEvent` → didengarkan modul `audit` (06 §2.2) |

### 1.4 Data Models

#### `StaffDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `user_id` | uuid | tidak | **PRIMARY KEY** |
| `merchant_id` | uuid | tidak | **FOREIGN KEY** → `merchant.merchant_id` |
| `outlet_id` | uuid | ya | **FOREIGN KEY** → `outlet.outlet_id`; wajib untuk CASHIER, `null` untuk OWNER/ADMIN |
| `name` | string | tidak | Nama lengkap |
| `email` | string | tidak | Unik, lowercase |
| `role` | enum | tidak | `OWNER` / `ADMIN` / `CASHIER` |
| `status` | enum | tidak | `ACTIVE` / `INACTIVE` |
| `created_at` | datetime | tidak | Waktu dibuat |
| `updated_at` | datetime | tidak | Waktu terakhir diubah |

#### `AuthTokens`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `access_token` | string (JWT) | tidak | Umur 900 detik |
| `refresh_token` | string (JWT) | tidak | Untuk `POST /auth/refresh` |
| `expires_in` | int | tidak | Detik sampai access token kedaluwarsa |
| `role` | enum | tidak | Role user |
| `merchant_id` | uuid | tidak | Scope tenant |
| `outlet_id` | uuid / null | ya | Outlet kasir; `null` untuk OWNER/ADMIN |

#### `CreateStaffRequest`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `name` | string | tidak | Nama staf |
| `email` | string | tidak | Unik |
| `password` | string | tidak | Min 8 karakter |
| `role` | enum | tidak | `ADMIN` / `CASHIER` |
| `outlet_id` | uuid | ya | Wajib untuk CASHIER |

### 1.5 Keterkaitan dengan Modul Lain

- **Sebagai Orchestrator:** Identity hanya memakai primitif `platform` (Prisma, guards, throttle). Tidak memanggil modul bisnis lain.
- **Sebagai Provider:**
  - `AuthService` / `StaffService` diekspos ke `apps/api` (frontend).
  - Modul `tenant` bergantung pada `identity` (06 §4).
  - `audit` mengonsumsi event `StaffCreatedEvent` / `StaffUpdatedEvent`.

### 1.6 Diagram Alur — Login

1. Client kirim `POST /auth/login` (`email`, `password`).
2. Server cek rate limit per email+IP (FR-AUTH-010); lewat → `429 RATE_LIMITED`.
3. Cari user by `email_normalized`; user tidak ditemukan → `401 UNAUTHENTICATED` (pesan disamarkan).
4. Verifikasi `argon2`; gagal → `401 UNAUTHENTICATED` (pesan sama).
5. Cek `status=ACTIVE`; nonaktif → `401 UNAUTHENTICATED` (disamarkan, FR-AUTH-006).
6. Sign `access_token` (900s) + `refresh_token`, simpan sesi refresh.
7. Return `{ access_token, refresh_token, expires_in, role, merchant_id, outlet_id }`.

**Warning ⚠:** Jangan bedakan alasan 401 (kredensial vs nonaktif) — bocor informasi akun (FR-AUTH-006). Logout harus mencabut refresh token agar tidak bisa dipakai ulang.

---

## 2. Modul Tenant — `libs/tenant`

### 2.1 Overview

| Aspek | Nilai |
|---|---|
| Base URL | `/api/v1` |
| Scope | Profil merchant, manajemen outlet, otorisasi tenant |
| State machine | **AccountStatus:** `ACTIVE` ↔ `INACTIVE` untuk Merchant dan Outlet. Outlet `INACTIVE` = read-only untuk operasi bisnis (tidak bisa dipakai checkout/adjustment, FR-TEN-004). |
| Aturan bisnis utama | |
| | 1. `merchant_id` selalu diambil dari klaim JWT, tidak pernah dari body (FR-TEN-010). |
| | 2. `low_stock_threshold` harus `>= 0` (FR-INV-008, DR-011A). |
| | 3. `service_charge_pct` (5–15) ditetapkan saat Merchant dibentuk dan dibaca sebagai snapshot di setiap checkout (OD-004). |

### 2.2 Endpoint

#### `GET /merchant`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | Semua role (OWNER, ADMIN, CASHIER) |

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ id, name, timezone, currency, low_stock_threshold, service_charge_pct, status }` |

```json
{ "id": "uuid", "name": "Warung Budi", "timezone": "Asia/Jakarta", "currency": "IDR", "low_stock_threshold": 5, "service_charge_pct": 10, "status": "ACTIVE" }
```

**Catatan ℹ:** Endpoint ini dipakai semua role untuk membaca profil merchant miliknya sendiri (scope selalu dari JWT).

#### `PATCH /merchant`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Request body** (FR-INV-008, DR-011A):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `name` | string | opsional | Nama merchant |
| `low_stock_threshold` | int | opsional | Ambang stok rendah, `>= 0` |

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `MerchantDto` terbaru |
| 400 | `low_stock_threshold < 0` atau validasi gagal | `VALIDATION_ERROR` |
| 403 | Bukan OWNER | `FORBIDDEN` |

**Warning ⚠:** Mengubah `service_charge_pct` tidak disediakan pada Iterasi 1 — nilai ditetapkan saat registrasi Owner (OD-004).

#### `POST /outlets`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Request body** (FR-TEN-004):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `name` | string | wajib | Nama outlet |
| `address` | string | opsional | Alamat outlet |

```json
{ "name": "Outlet Margonda", "address": "Jl. Margonda No. 1" }
```

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 201 | Berhasil | `{ id, name, address, status: "ACTIVE" }` |
| 400 | Validasi gagal | `VALIDATION_ERROR` |
| 403 | Bukan OWNER | `FORBIDDEN` |

#### `GET /outlets`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER`, `ADMIN` |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `status` | enum | opsional | Filter `ACTIVE` / `INACTIVE` |
| `page`, `size` | int | opsional | Paginasi |

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `Page<OutletDto>` — `{ id, name, address, status, created_at, updated_at }` |
| 403 | Role tidak diizinkan | `FORBIDDEN` |

#### `PATCH /outlets/:id`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Parameter path:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `id` | uuid | wajib | Outlet yang diubah |

**Request body** (FR-TEN-004):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `name` | string | opsional | Nama outlet |
| `address` | string | opsional | Alamat outlet |
| `status` | enum | opsional | `ACTIVE` / `INACTIVE` |

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `OutletDto` terbaru |
| 400 | Validasi gagal | `VALIDATION_ERROR` |
| 403 | Bukan OWNER | `FORBIDDEN` |
| 404 | Outlet tidak ditemukan / bukan milik merchant | `NOT_FOUND` |
| 409 | Mengaktifkan outlet dengan konflik nama | `VALIDATION_ERROR` |

**Warning ⚠:** Outlet `INACTIVE` tidak boleh dipakai untuk checkout atau stock adjustment (read-only, FR-TEN-004). Kasir yang `outlet_id`-nya nonaktif tidak dapat login-operasional.

### 2.3 Endpoint internal (service-to-service)

| Mekanisme | Detail |
|---|---|
| Interface publik (barrel `index.ts`) | `MerchantService`, `OutletService`, `TenantAuthorizationService` (06 §3.2) |
| Port yang dikonsumsi modul lain | `TenantAuthorizationService.assertOutletOwnedByMerchant(...)` / `assertUserBelongsToMerchant(...)` dipakai `catalog`, `inventory`, `sales` untuk menegakkan FR-TEN-010 |
| Domain event | `OutletCreatedEvent`, `OutletUpdatedEvent` → `audit` |

### 2.4 Data Models

#### `MerchantDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `id` | uuid | tidak | **PRIMARY KEY** |
| `owner_user_id` | uuid | tidak | **FOREIGN KEY** → `user.user_id` (unique) |
| `name` | string | tidak | Nama merchant |
| `timezone` | string | tidak | Default `Asia/Jakarta` (batas hari laporan, BR-018) |
| `currency` | string | tidak | Default `IDR` |
| `low_stock_threshold` | int | tidak | Default 5, `>= 0` |
| `service_charge_pct` | decimal | tidak | Default 10, rentang 5–15 (OD-004, FR-TEN-011) |
| `status` | enum | tidak | `ACTIVE` / `INACTIVE` |
| `created_at` | datetime | tidak | Waktu dibuat |
| `updated_at` | datetime | tidak | Waktu diubah |

#### `OutletDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `id` | uuid | tidak | **PRIMARY KEY** |
| `merchant_id` | uuid | tidak | **FOREIGN KEY** → `merchant.merchant_id` |
| `name` | string | tidak | Nama outlet |
| `address` | string | ya | Alamat outlet |
| `status` | enum | tidak | `ACTIVE` / `INACTIVE` |
| `created_at` | datetime | tidak | Waktu dibuat |
| `updated_at` | datetime | tidak | Waktu diubah |

### 2.5 Keterkaitan dengan Modul Lain

- **Sebagai Orchestrator:** `tenant` bergantung pada `identity` (untuk validasi user) dan primitif `platform`.
- **Sebagai Provider:**
  - `TenantAuthorizationService` dikonsumsi `catalog`, `inventory`, `sales`.
  - `audit` mengonsumsi `OutletCreatedEvent` / `OutletUpdatedEvent`.

### 2.6 Diagram Alur — Buat Outlet

1. OWNER kirim `POST /outlets` (`name`, `address`).
2. Server ambil `merchant_id` dari JWT; validasi role OWNER.
3. Buat row `outlet` dengan `status=ACTIVE`.
4. Emit `OutletCreatedEvent` → listener `audit` menulis `OUTLET_CREATED`.
5. Return `201` `OutletDto`.

**Warning ⚠:** Pembuatan outlet tidak otomatis membuat stok/inventory row — stok diinisialisasi lewat `POST /inventory/adjustments` (alur stok di modul Inventory).

---

## 3. Modul Catalog — `libs/catalog`

### 3.1 Overview

| Aspek | Nilai |
|---|---|
| Base URL | `/api/v1` |
| Scope | Category, Product master, harga override per Outlet |
| State machine | **Soft-deactivation (bukan delete fisik):** Category dan Product punya `is_active` boolean (BR-019). Tidak ada endpoint `DELETE` — hanya `PATCH is_active=false`. Produk nonaktif tidak muncul di katalog kasir dan ditolak saat checkout (`PRODUCT_INACTIVE`). |
| Aturan bisnis utama | |
| | 1. **Role:** mutasi (create/patch/outlet-prices) hanya `ADMIN`; `OWNER` read-only; `CASHIER` hanya lihat katalog aktif outlet tugasnya (04 §5, rule 9). |
| | 2. Nama Category unik per merchant (DR-010). |
| | 3. Harga master global + override per Outlet (OD-002, FR-CAT-011): tanpa override → pakai `product.price`; ada override → pakai `product_outlet_price.price`. |
| | 4. Semua harga rupiah dihitung server saat checkout (BR-012); harga di keranjang client-side hanya display. |
| | 5. `category_id` saat membuat/mengubah product harus kategori aktif milik merchant yang sama. |

### 3.2 Endpoint

#### `POST /categories`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `ADMIN` |

**Request body** (FR-CAT-001, DR-010):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `name` | string | wajib | Nama kategori, non-empty |

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 201 | Berhasil | `{ id, name, is_active: true }` |
| 400 | Nama kosong | `VALIDATION_ERROR` |
| 403 | Bukan ADMIN | `FORBIDDEN` |
| 409 | Nama duplikat dalam merchant | `VALIDATION_ERROR`, `details.field="name"` |

#### `GET /categories`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | Semua role (OWNER, ADMIN, CASHIER) |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `is_active` | boolean | opsional | Filter; CASHIER **dipaksa** `is_active=true` di service (bukan dari query) |
| `page`, `size` | int | opsional | Paginasi |

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `Page<CategoryDto>` — `{ id, name, is_active, created_at, updated_at }` |

**Catatan ℹ:** OWNER dan ADMIN melihat semua kategori (termasuk nonaktif); CASHIER hanya kategori aktif.

#### `PATCH /categories/:id`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `ADMIN` |

**Parameter path:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `id` | uuid | wajib | Kategori yang diubah |

**Request body** (BR-019):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `name` | string | opsional | Nama kategori |
| `is_active` | boolean | opsional | `false` = soft-deactivate |

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `CategoryDto` terbaru |
| 400 | Validasi gagal / duplikat nama | `VALIDATION_ERROR` |
| 403 | Bukan ADMIN | `FORBIDDEN` |
| 404 | Kategori tidak ditemukan | `NOT_FOUND` |

**Warning ⚠:** Tidak ada `DELETE /categories/:id` di kontrak ini sama sekali (BR-019). Menonaktifkan kategori tidak menonaktifkan produk di dalamnya secara otomatis.

#### `POST /products`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `ADMIN` |

**Request body** (FR-CAT-002–003):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `name` | string | wajib | Nama produk, non-empty |
| `price` | decimal string | wajib | Harga master global, `>= 0` |
| `category_id` | uuid | wajib | Kategori aktif milik merchant |
| `is_active` | boolean | opsional | Default `true` |

```json
{ "name": "Es Teh Manis", "price": "8000.00", "category_id": "uuid", "is_active": true }
```

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 201 | Berhasil | `ProductDto` |
| 400 | Nama kosong / harga negatif / kategori kosong/nonaktif/bukan milik merchant | `VALIDATION_ERROR` |
| 403 | Bukan ADMIN | `FORBIDDEN` |
| 404 | Category tidak ditemukan | `NOT_FOUND` |

**Catatan ℹ:** `is_active=false` saat create diperbolehkan (produk dibikin nonaktif).

#### `GET /products`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` (read-only), `ADMIN` |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `search` | string | opsional | Pencarian nama (partial) |
| `category_id` | uuid | opsional | Filter kategori |
| `is_active` | boolean | opsional | Filter status |
| `page`, `size` | int | opsional | Paginasi |

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `Page<ProductDto>` — `{ id, name, price, category_id, category_name, is_active }` |
| 403 | Bukan OWNER/ADMIN | `FORBIDDEN` |

**Catatan ℹ:** `price` di sini adalah harga master. Harga efektif per outlet dilihat via `PUT /products/:product_id/outlet-prices/:outlet_id` dan endpoint katalog kasir (modul Inventory).

#### `PATCH /products/:id`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `ADMIN` |

**Parameter path:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `id` | uuid | wajib | Produk yang diubah |

**Request body** (FR-CAT-005, FR-CAT-008):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `name` | string | opsional | Nama produk |
| `price` | decimal string | opsional | Harga master global |
| `category_id` | uuid | opsional | Pindah kategori |
| `is_active` | boolean | opsional | Soft-deactivate |

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `ProductDto` terbaru |
| 400 | Validasi gagal | `VALIDATION_ERROR` |
| 403 | Bukan ADMIN | `FORBIDDEN` |
| 404 | Produk tidak ditemukan | `NOT_FOUND` |

**Warning ⚠:** Perubahan harga/status **tidak mengubah transaksi lama** (snapshot disimpan di `transaction_line`, US-PROD-002). Perubahan dicatat sebagai `PriceChangedEvent`/`ProductStatusChangedEvent` untuk audit.

#### `PUT /products/:product_id/outlet-prices/:outlet_id`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `ADMIN` |

**Parameter path:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `product_id` | uuid | wajib | Produk |
| `outlet_id` | uuid | wajib | Outlet target |

**Request body** (FR-CAT-011, OD-002):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `price` | decimal string | wajib | Harga override untuk outlet, `>= 0` |

```json
{ "price": "8500.00" }
```

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ product_id, outlet_id, price, updated_at }` |
| 400 | Harga negatif / outlet bukan milik merchant | `VALIDATION_ERROR` |
| 403 | Bukan ADMIN | `FORBIDDEN` |
| 404 | Produk/outlet tidak ditemukan | `NOT_FOUND` |

**Catatan ℹ:** Untuk menghapus override gunakan `DELETE /products/:product_id/outlet-prices/:outlet_id` — fallback kembali ke harga master.

#### `DELETE /products/:product_id/outlet-prices/:outlet_id`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `ADMIN` |

**Response:**

| Status | Kondisi | Body |
|---|---|---|
| 204 | Override dihapus, harga efektif kembali ke harga master | Kosong |
| 403 | Bukan ADMIN | `FORBIDDEN` |
| 404 | Override tidak ada / resource tidak ditemukan | `NOT_FOUND` |

### 3.3 Endpoint internal (service-to-service)

| Mekanisme | Detail |
|---|---|
| Interface publik | `CategoryService`, `ProductService`, `OutletPriceService`, `ProductReadPort` (06 §3.3) |
| Port yang dikonsumsi modul lain | `ProductReadPort.getActiveByIds(...)` dipakai `inventory` (katalog kasir) dan `sales` (validasi harga efektif checkout) |
| Domain event | `PriceChangedEvent`, `ProductStatusChangedEvent` → `audit` |

### 3.4 Data Models

#### `CategoryDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `id` | uuid | tidak | **PRIMARY KEY** |
| `merchant_id` | uuid | tidak | **FOREIGN KEY** → `merchant.merchant_id` |
| `name` | string | tidak | Nama kategori (unique per merchant) |
| `is_active` | boolean | tidak | Soft-deactivation (BR-019) |
| `created_at` | datetime | tidak | Waktu dibuat |
| `updated_at` | datetime | tidak | Waktu diubah |

#### `ProductDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `id` | uuid | tidak | **PRIMARY KEY** |
| `merchant_id` | uuid | tidak | **FOREIGN KEY** → `merchant.merchant_id` |
| `category_id` | uuid | tidak | **FOREIGN KEY** → `category.category_id` |
| `name` | string | tidak | Nama produk |
| `price` | decimal | tidak | Harga master global |
| `is_active` | boolean | tidak | Soft-deactivation |
| `created_at` | datetime | tidak | Waktu dibuat |
| `updated_at` | datetime | tidak | Waktu diubah |

#### `ProductOutletPriceDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `product_id` | uuid | tidak | **FOREIGN KEY** → `product.product_id` (bagian composite key) |
| `outlet_id` | uuid | tidak | **FOREIGN KEY** → `outlet.outlet_id` (bagian composite key) |
| `price` | decimal | tidak | Harga override; tanpa baris berarti pakai harga master |
| `updated_at` | datetime | tidak | Waktu diubah |

### 3.5 Keterkaitan dengan Modul Lain

- **Sebagai Orchestrator:** Catalog memakai `TenantAuthorizationService` (tenant) + primitif `platform`. **Tidak** bergantung pada inventory (boundary 05 §3).
- **Sebagai Provider:**
  - `ProductReadPort` dikonsumsi `inventory` dan `sales` (harga efektif per outlet).
  - `audit` mengonsumsi `PriceChangedEvent` / `ProductStatusChangedEvent`.

### 3.6 Diagram Alur — Set Harga Override Outlet

1. ADMIN kirim `PUT /products/:product_id/outlet-prices/:outlet_id` (`price`).
2. Validasi produk aktif milik merchant + outlet milik merchant (via `TenantAuthorizationService`).
3. Upsert row `product_outlet_price` (unique `outlet_id + product_id`).
4. Emit `PriceChangedEvent` (jenis: override) → `audit` menulis `PRICE_CHANGED`.
5. Return `200` `{ product_id, outlet_id, price, updated_at }`.

**Warning ⚠:** Checkout berikutnya langsung memakai harga override baru (FR-CAT-011). Harga pada transaksi yang **sudah** terjadi tidak berubah (snapshot `unit_price_snapshot` di `transaction_line`).

---

## 4. Modul Inventory — `libs/inventory`

### 4.1 Overview

| Aspek | Nilai |
|---|---|
| Base URL | `/api/v1` |
| Scope | Stok per outlet, stock movement, katalog kasir |
| State machine | **StockMovement type:** `ADJUSTMENT` (manual) / `SALE` (dari checkout). Stock `quantity >= 0` (CHECK constraint + app-level). Tidak ada transisi status stok — stok adalah kuantitas, bukan state. |
| Aturan bisnis utama | |
| | 1. **Role:** mutasi stok (adjustment) hanya `ADMIN`; `OWNER` read-only; kasir tidak menyentuh endpoint stok. |
| | 2. `delta` tidak boleh `0`; `reason` wajib untuk `ADJUSTMENT`. |
| | 3. Hasil adjustment tidak boleh membuat stok negatif (FR-INV-004). |
| | 4. Pengurangan stok saat checkout memakai **conditional atomic update** (`quantity >= x`), bukan pessimistic lock — menjamin tepat satu kasir menang saat rebutan stok terakhir (AT-004, 05 §6.1). |
| | 5. Endpoint `GET /products/catalog` (katalog kasir) **diiimplementasikan di modul ini** karena membaca tabel `inventory`, walaupun path-nya di domain Catalog (06 §3.3–3.4). |

### 4.2 Endpoint

#### `GET /inventory`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` (read-only), `ADMIN` |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `outlet_id` | uuid | opsional | Filter outlet |
| `product_id` | uuid | opsional | Filter produk |
| `low_stock_only` | boolean | opsional | Hanya stok di bawah threshold merchant |
| `page`, `size` | int | opsional | Paginasi |

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `Page<InventoryDto>` — `{ id, outlet_id, outlet_name, product_id, product_name, quantity, updated_at }` |
| 403 | Role tidak diizinkan | `FORBIDDEN` |

#### `POST /inventory/adjustments`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `ADMIN` |

**Request body** (FR-INV-003, FR-INV-004):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `outlet_id` | uuid | wajib | Outlet tujuan |
| `product_id` | uuid | wajib | Produk |
| `delta` | int | wajib | Penambahan (+) / pengurangan (−), tidak boleh `0` |
| `reason` | string | wajib | Alasan adjustment (mis. "Barang rusak", "Stock opname") |

```json
{ "outlet_id": "uuid", "product_id": "uuid", "delta": -3, "reason": "Barang rusak" }
```

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 201 | Berhasil | `{ movement_id, outlet_id, product_id, quantity_before, quantity_after, delta, reason, actor_user_id, created_at }` |
| 400 | `reason` kosong / `delta=0` | `VALIDATION_ERROR` |
| 403 | Bukan ADMIN; outlet nonaktif (read-only, FR-TEN-004) | `FORBIDDEN` |
| 404 | Outlet/produk tidak ditemukan | `NOT_FOUND` |
| 409 | Hasil menjadi negatif | `VALIDATION_ERROR`, `details.field="delta"` |

```json
{ "movement_id": "uuid", "outlet_id": "uuid", "product_id": "uuid", "quantity_before": 12, "quantity_after": 9, "delta": -3, "reason": "Barang rusak", "actor_user_id": "uuid", "created_at": "2026-08-13T10:00:00+07:00" }
```

**Catatan ℹ:** `quantity_after` dihitung server; client tidak mengirim target quantity.

#### `GET /inventory/movements`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` (read-only), `ADMIN` |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `outlet_id` | uuid | opsional | Filter outlet |
| `product_id` | uuid | opsional | Filter produk |
| `type` | enum | opsional | `ADJUSTMENT` / `SALE` |
| `date_from`, `date_to` | datetime | opsional | Rentang waktu |
| `page`, `size` | int | opsional | Paginasi |

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `Page<StockMovementDto>` |
| 403 | Role tidak diizinkan | `FORBIDDEN` |

#### `GET /products/catalog` *(katalog kasir — diimplementasikan modul ini)*

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `CASHIER` |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `outlet_id` | uuid | wajib | Outlet tugas kasir |

**Response** (FR-CAT-006, FR-CAT-012):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `[{ id, name, price, category_id, stock_quantity }]` — hanya produk aktif yang punya inventory row di outlet; `price` = harga efektif outlet |
| 403 | `outlet_id` bukan outlet tugas kasir (dicek dari JWT) | `FORBIDDEN` |
| 400 | `outlet_id` tidak dikirim | `VALIDATION_ERROR` |

```json
[
  { "id": "uuid", "name": "Es Teh Manis", "price": "8500.00", "category_id": "uuid", "stock_quantity": 12 }
]
```

**Catatan ℹ:** Path berada di domain Catalog, tetapi route dipegang `InventoryModule` karena membaca tabel `inventory` (06 §3.4). Ini bukan pelanggaran boundary — hanya penempatan implementasi.

### 4.3 Endpoint internal (service-to-service)

| Mekanisme | Detail |
|---|---|
| Interface publik | `InventoryService`, `StockMovementService`, `StockReservationPort`, `OutletCatalogQueryService` (06 §3.4) |
| Port yang dikonsumsi modul lain | `StockReservationPort.reserveForSale(...)` dipanggil `sales` di dalam transaksi checkout (atomic conditional update, 05 §6.1) |
| Port yang dikonsumsi modul ini | `ProductReadPort` (catalog) untuk resolusi produk + harga efektif |
| Domain event | `StockAdjustedEvent` → `audit` |

### 4.4 Data Models

#### `InventoryDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `id` | uuid | tidak | **PRIMARY KEY** |
| `merchant_id` | uuid | tidak | **FOREIGN KEY** → `merchant.merchant_id` |
| `outlet_id` | uuid | tidak | **FOREIGN KEY** → `outlet.outlet_id` |
| `product_id` | uuid | tidak | **FOREIGN KEY** → `product.product_id` |
| `quantity` | int | tidak | Stok, `>= 0`; unique `(outlet_id, product_id)` |
| `updated_at` | datetime | tidak | Waktu terakhir berubah |

#### `StockMovementDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `id` | uuid | tidak | **PRIMARY KEY** |
| `merchant_id` | uuid | tidak | **FOREIGN KEY** → `merchant.merchant_id` |
| `outlet_id` | uuid | tidak | **FOREIGN KEY** → `outlet.outlet_id` |
| `product_id` | uuid | tidak | **FOREIGN KEY** → `product.product_id` |
| `type` | enum | tidak | `ADJUSTMENT` / `SALE` |
| `delta` | int | tidak | Perubahan kuantitas (negatif = berkurang) |
| `quantity_before` | int | tidak | Stok sebelum |
| `quantity_after` | int | tidak | Stok sesudah |
| `reason` | string | ya | Wajib untuk `ADJUSTMENT` |
| `reference_id` | uuid | ya | **FOREIGN KEY** → `transaction.transaction_id` (diisi untuk `SALE`) |
| `actor_user_id` | uuid | tidak | **FOREIGN KEY** → `user.user_id` |
| `created_at` | datetime | tidak | Waktu kejadian |

#### `AdjustStockRequest`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `outlet_id` | uuid | tidak | **FOREIGN KEY** |
| `product_id` | uuid | tidak | **FOREIGN KEY** |
| `delta` | int | tidak | Tidak boleh `0`; hasil tidak boleh negatif |
| `reason` | string | tidak | Wajib |

### 4.5 Keterkaitan dengan Modul Lain

- **Sebagai Orchestrator:** `inventory` memakai `ProductReadPort` (catalog) dan `TenantAuthorizationService` (tenant).
- **Sebagai Provider:**
  - `StockReservationPort` dikonsumsi `sales` saat checkout.
  - `OutletCatalogQueryService` menyediakan katalog kasir.
  - `audit` mengonsumsi `StockAdjustedEvent`.

### 4.6 Diagram Alur — Adjustment Stok

1. ADMIN kirim `POST /inventory/adjustments` (`outlet_id`, `product_id`, `delta`, `reason`).
2. Validasi role + outlet/produk milik merchant; outlet harus `ACTIVE`.
3. Baca `quantity` saat ini → `quantity_before`.
4. Hitung `quantity_after = quantity_before + delta`; kalau `< 0` → `409 VALIDATION_ERROR` (batal, tanpa perubahan).
5. Update kuantitas + tulis row `stock_movement` (`type=ADJUSTMENT`).
6. Emit `StockAdjustedEvent` → `audit`.
7. Return `201` `StockMovementDto`.

**Warning ⚠:** Adjustment manual dan `SALE` memakai jalur update yang sama; kuncinya adalah conditional update agar tidak ada stok negatif bahkan saat dua request bersamaan (AT-004).

---

## 5. Modul Sales — `libs/sales`

### 5.1 Overview

| Aspek | Nilai |
|---|---|
| Base URL | `/api/v1` |
| Scope | Cart (client-side only), checkout, riwayat transaksi, receipt |
| State machine | **TransactionStatus:** `COMPLETED` (hasil normal checkout), `FAILED` / `REJECTED` (reserved untuk alur batal/void di luar scope MVP — checkout gagal menghasilkan HTTP error tanpa baris transaksi, all-or-nothing FR-CHK-007). |
| | **IdempotencyRecord state:** `PROCESSING` → `COMPLETED` (sukses) / `FAILED` (attempt gagal, boleh submit ulang); key kedaluwarsa 24 jam. |
| | **PaymentStatus:** `CONFIRMED` (MVP). |
| Aturan bisnis utama (OD-004, FR-CHK-018, FR-PAY-003) | |
| | `discount = subtotal × discount_pct / 100` — `discount_pct` diisi Kasir (0–100), tanpa voucher. |
| | `service_charge = subtotal × service_charge_pct / 100` — `service_charge_pct` snapshot dari Merchant (5–15). |
| | `tax = (subtotal − discount) × tax_pct / 100` — `tax_pct` fiks `11`. |
| | `total = subtotal − discount + service_charge + tax`. |
| | `payment.amount` **wajib sama dengan** `total` (FR-PAY-003). |
| | Metode bayar: `CASH` / `QRIS` / `TRANSFER` (OD-001; tanpa payment gateway). |
| | Harga dihitung ulang server dari **harga efektif outlet** (override `product_outlet_price` ?: `product.price`), BR-012; `expected_unit_price` hanya untuk deteksi `PRICE_CHANGED`. |
| | **Role:** checkout hanya `CASHIER` (OD-010; cart dikelola client-side, tidak ada endpoint REST); lihat transaksi: `OWNER` (seluruh merchant) & `CASHIER` (hanya transaksi dirinya — OD-003); **ADMIN tidak punya akses** transaksi/receipt. |

> Catatan penamaan: endpoint checkout pada kontrak ini adalah **`POST /checkout`** (konsisten dengan `05` §5.5 dan `07` lama). Beberapa dokumen turunan non-deliverable (mis. `docs/api-contract.md`) menamainya `POST /transactions`; kontrak ini memakai `POST /checkout`.

### 5.2 Endpoint

> **Cart Iterasi 1 = client-side only.** Keranjang dikelola sepenuhnya di frontend (buat, tambah item, ubah kuantitas, hapus, kosongkan). **Tidak ada endpoint REST `/cart/*`** dan **tidak ada tabel `cart`/`cart_item` di skema** — checkout langsung menerima `items` inline; perilaku cart (FR-CART-001–004) diverifikasi sebagai UI test.

#### `POST /checkout` — **endpoint terpenting di seluruh sistem**

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `CASHIER` |
| Idempotency | Wajib — key di body `idempotency_key` |
| Rate limit | Per user (NFR-SEC-008) |

**Request body** (FR-CHK-001–018, FR-CART-005–010, FR-PAY-001–007, BR-006–010):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `idempotency_key` | string (uuid) | wajib | Key unik client untuk replay-safety (unique per merchant+outlet) |
| `outlet_id` | uuid | wajib | Outlet tugas kasir (harus cocok klaim JWT) |
| `items` | array | wajib | Minimal 1 item |
| `items[].product_id` | uuid | wajib | Produk aktif |
| `items[].quantity` | int | wajib | `> 0` |
| `items[].expected_unit_price` | decimal string | opsional | Harga yang dilihat kasir; dipakai deteksi `PRICE_CHANGED` |
| `discount_pct` | decimal | opsional | 0–100; default `0` |
| `payment.method` | enum | wajib | `CASH` / `QRIS` / `TRANSFER` |
| `payment.amount` | decimal string | wajib | Harus sama dengan `total` (dihitung server) |

```json
{
  "idempotency_key": "a3f5c9d2-1e4b-4a2c-9f21-client-generated-uuid",
  "outlet_id": "uuid",
  "items": [
    { "product_id": "uuid-1", "quantity": 2, "expected_unit_price": "8500.00" },
    { "product_id": "uuid-2", "quantity": 1, "expected_unit_price": "15000.00" }
  ],
  "discount_pct": 10,
  "payment": { "method": "CASH", "amount": "35168.00" }
}
```

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Checkout selesai (sinkron, all-or-nothing) | `CheckoutResult` — lihat contoh di bawah |
| 400 | Validasi gagal / `payment.amount != total` / `discount_pct` di luar 0–100 | `VALIDATION_ERROR` |
| 403 | Bukan CASHIER / outlet bukan tugas / outlet nonaktif | `FORBIDDEN` |
| 409 | Produk nonaktif | `PRODUCT_INACTIVE` |
| 409 | Harga server beda dengan `expected_unit_price` | `PRICE_CHANGED` |
| 409 | Stok tidak cukup | `INSUFFICIENT_STOCK` |
| 409 | Key sama tapi payload beda | `IDEMPOTENCY_CONFLICT` |
| 409 | Checkout dengan key sama masih diproses | `CHECKOUT_PROCESSING` |
| 422 | Hasil checkout tidak diketahui pasti (ambiguous) | `CHECKOUT_NOT_CONFIRMED` |
| 429 | Melewati rate limit checkout | `RATE_LIMITED` |

```json
{
  "transaction_id": "uuid",
  "receipt_number": "INV-2026-000123",
  "status": "COMPLETED",
  "outlet_id": "uuid",
  "cashier": { "user_id": "uuid", "name": "Sari" },
  "items": [
    { "product_id": "uuid-1", "name": "Es Teh Manis", "unit_price": "8500.00", "quantity": 2, "subtotal": "17000.00" },
    { "product_id": "uuid-2", "name": "Nasi Goreng", "unit_price": "15000.00", "quantity": 1, "subtotal": "15000.00" }
  ],
  "subtotal": "32000.00",
  "discount_pct": 10, "discount": "3200.00",
  "service_charge_pct": 10, "service_charge": "3200.00",
  "tax_pct": 11, "tax": "3168.00",
  "total": "35168.00",
  "payment": { "method": "CASH", "amount": "35168.00", "status": "CONFIRMED" },
  "created_at": "2026-08-13T10:00:00+07:00"
}
```

Contoh error:

```json
{ "code": "PRICE_CHANGED", "message": "Harga produk berubah sejak ditambahkan ke keranjang.",
  "correlation_id": "c-...", "details": [{ "field": "items[0].product_id", "reason": "current_price=9000.00" }] }

{ "code": "INSUFFICIENT_STOCK", "message": "Stok tidak mencukupi.",
  "correlation_id": "c-...", "details": [{ "field": "items[1].product_id", "reason": "stock=0, requested=1" }] }
```

**Catatan ℹ:** Semua nilai rupiah (subtotal, discount, service_charge, tax, total) **dihitung server**; nilai `expected_unit_price` dari keranjang client tidak dipakai untuk perhitungan. Replay request dengan `idempotency_key` yang sama dan payload sama → server mengembalikan transaksi yang sudah ada (idempotent), bukan membuat transaksi baru.

**Warning ⚠:** Semua error (400/409/422) menjamin **tidak ada** perubahan stok/transaksi parsial (FR-CHK-007, all-or-nothing — rollback penuh). Server **tidak pernah** menunggu reporting/AI dalam jalur ini (FR-CHK-014/015); p95 ≤ 500 ms (NFR-PERF-001).

#### `GET /transactions/status`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `CASHIER` |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `idempotency_key` | string | wajib | Key checkout yang ingin dicek |

**Response** (FR-CHK-012):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Sudah selesai | Sama dengan response `POST /checkout` sukses |
| 200 | Masih diproses | `{ "status": "PROCESSING" }` |
| 404 | Key tidak ditemukan/kedaluwarsa | `NOT_FOUND` — client boleh submit ulang sebagai checkout baru |
| 422 | Hasil tidak pasti (crash setelah commit tak terdeteksi) | `CHECKOUT_NOT_CONFIRMED` |

#### `GET /transactions`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` (semua outlet merchant), `CASHIER` (hanya transaksi dirinya — OD-003). **ADMIN tidak memiliki akses.** |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `date_from`, `date_to` | datetime | opsional | Rentang waktu |
| `status` | enum | opsional | Filter status |
| `outlet_id` | uuid | opsional | Filter outlet (OWNER) |
| `page`, `size` | int | opsional | Paginasi |

**Response** (FR-TRX-001–002, FR-TRX-004):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `Page<TransactionSummaryDto>` — `{ transaction_id, receipt_number, outlet_id, cashier_name, total, status, created_at }` |
| 403 | ADMIN / role tidak berhak | `FORBIDDEN` |

**Catatan ℹ:** Untuk CASHIER, filter `cashier_user_id = actor.user_id` **dipaksa di service** (OD-003 locked), bukan diandalkan dari query — Kasir tidak bisa melihat transaksi kasir lain.

#### `GET /transactions/:id`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | Sesuai scope: `OWNER` (seluruh merchant), `CASHIER` (hanya transaksi dirinya); **ADMIN tidak memiliki akses.** |

**Parameter path:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `id` | uuid | wajib | ID transaksi |

**Response** (FR-TRX-003, FR-TRX-006):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | Detail lengkap — bentuk sama dengan response checkout sukses |
| 403 | ADMIN / Kasir mengakses transaksi bukan miliknya | `FORBIDDEN` |
| 404 | Tidak ditemukan **atau** milik merchant/outlet lain (disamarkan) | `NOT_FOUND` |

#### `GET /transactions/search`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | Sesuai scope (OWNER / CASHIER miliknya; ADMIN tidak) |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `receipt_number` | string | wajib | Exact match (unik per merchant) |

**Response** (FR-TRX-005):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Ditemukan | `TransactionDetailDto` |
| 404 | Tidak ditemukan | `NOT_FOUND` |

#### `GET /receipts/:transaction_id`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | Sesuai scope (OWNER / CASHIER miliknya; ADMIN tidak) |

**Parameter path:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `transaction_id` | uuid | wajib | ID transaksi |

**Response** (FR-PAY-006–007):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | Format detail transaksi + `merchant_name`, `outlet_name`, `outlet_address` (untuk cetak) |
| 403 | Role tidak berhak | `FORBIDDEN` |
| 404 | Tidak ditemukan / bukan milik scope | `NOT_FOUND` |

**Catatan ℹ:** Receipt dirender dari **snapshot** transaksi (unit_price_snapshot, nama produk), bukan re-query katalog saat ini — perubahan harga produk tidak mengubah receipt lama (05 §5.5).

### 5.3 Endpoint internal (service-to-service)

| Mekanisme | Detail |
|---|---|
| Interface publik | `CheckoutService`, `ReceiptService`, `IdempotencyService` (06 §3.5) |
| Port yang dikonsumsi | `ProductReadPort` (catalog — harga efektif), `StockReservationPort` (inventory — kurangi stok), `TenantAuthorizationService` (tenant), primitif `platform` (outbox, prisma, money) |
| Outbox event (async) | `TransactionCompletedEvent` `{ transaction_id, schema_version: 1 }` → dikonsumsi modul `reporting` (FR-CHK-014) |
| Domain event | `CheckoutCompletedEvent` → `audit` |
| Constraint performa | p95 ≤ 500 ms, p99 ≤ 1000 ms; jalur ini tidak pernah menunggu reporting/AI (NFR-PERF-001, FR-CHK-014/015) |

### 5.4 Data Models

#### `CheckoutRequest`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `idempotency_key` | string | tidak | Unique per `(merchant_id, outlet_id)` (BR-008) |
| `outlet_id` | uuid | tidak | **FOREIGN KEY** → `outlet.outlet_id` |
| `items` | array | tidak | `CheckoutItem[]` (minimal 1) |
| `discount_pct` | decimal | ya | 0–100, default 0 |
| `payment` | `PaymentRequest` | tidak | Method + amount |

#### `CheckoutItem`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `product_id` | uuid | tidak | **FOREIGN KEY** → `product.product_id` |
| `quantity` | int | tidak | `> 0` |
| `expected_unit_price` | decimal string | ya | Deteksi `PRICE_CHANGED` saja |

#### `PaymentRequest` / `PaymentDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `method` | enum | tidak | `CASH` / `QRIS` / `TRANSFER` |
| `amount` | decimal | tidak | Wajib = total (FR-PAY-003) |
| `status` | enum | tidak | `CONFIRMED` (response) |
| `confirmed_by` | uuid | ya | **FOREIGN KEY** → `user.user_id` (response) |
| `confirmed_at` | datetime | ya | Waktu konfirmasi (response) |

#### `CheckoutResult` (detail transaksi)

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `transaction_id` | uuid | tidak | **PRIMARY KEY** |
| `merchant_id` | uuid | tidak | **FOREIGN KEY** → `merchant.merchant_id` |
| `outlet_id` | uuid | tidak | **FOREIGN KEY** → `outlet.outlet_id` |
| `cashier_user_id` | uuid | tidak | **FOREIGN KEY** → `user.user_id` |
| `receipt_number` | string | tidak | Unique per merchant (DR-003) |
| `status` | enum | tidak | `COMPLETED` / `FAILED` / `REJECTED` |
| `subtotal` | decimal | tidak | Jumlah `unit_price × quantity` |
| `discount_pct` | decimal | tidak | Snapshot dari input kasir |
| `discount` | decimal | tidak | `subtotal × discount_pct/100` |
| `service_charge_pct` | decimal | tidak | Snapshot dari merchant (5–15) |
| `service_charge` | decimal | tidak | `subtotal × service_charge_pct/100` |
| `tax_pct` | decimal | tidak | Fiks `11` |
| `tax` | decimal | tidak | `(subtotal − discount) × 11%` |
| `total` | decimal | tidak | `subtotal − discount + service_charge + tax` |
| `items` | array | tidak | `TransactionLineDto[]` (snapshot nama + harga) |
| `payment` | `PaymentDto` | tidak | Metode + status |
| `cashier` | object | tidak | `{ user_id, name }` |
| `created_at` | datetime | tidak | Waktu transaksi |

#### `TransactionLineDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `product_id` | uuid | tidak | **FOREIGN KEY** → `product.product_id` |
| `name` | string | tidak | Snapshot `product_name_snapshot` (BR-006) |
| `unit_price` | decimal | tidak | Snapshot `unit_price_snapshot` |
| `quantity` | int | tidak | Kuantitas |
| `subtotal` | decimal | tidak | `unit_price × quantity` |

#### `TransactionSummaryDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `transaction_id` | uuid | tidak | **PRIMARY KEY** |
| `receipt_number` | string | tidak | Unique per merchant |
| `outlet_id` | uuid | tidak | **FOREIGN KEY** |
| `cashier_name` | string | tidak | Nama kasir |
| `total` | decimal | tidak | Total transaksi |
| `status` | enum | tidak | Status transaksi |
| `created_at` | datetime | tidak | Waktu transaksi |

#### `ReceiptDto`

Sama dengan `CheckoutResult`, ditambah:

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `merchant_name` | string | tidak | Untuk header cetak |
| `outlet_name` | string | tidak | Untuk header cetak |
| `outlet_address` | string | ya | Untuk header cetak |

### 5.5 Keterkaitan dengan Modul Lain

- **Sebagai Orchestrator (paling kompleks):** checkout memanggil `ProductReadPort` (catalog), `StockReservationPort` (inventory), `TenantAuthorizationService` (tenant), dan primitif `platform` — semua dalam **satu transaksi Prisma** (05 §6.1).
- **Sebagai Provider:** `CheckoutService`, `ReceiptService`, `IdempotencyService` diekspos ke `apps/api` (frontend).
- **Sebagai Publisher:** `TransactionCompletedEvent` (outbox) untuk `reporting`; `CheckoutCompletedEvent` untuk `audit`.

### 5.6 Diagram Alur — Checkout

1. CASHIER kirim `POST /checkout` dengan `idempotency_key`, `items`, `discount_pct`, `payment`.
2. `@Roles(CASHIER)` + validasi `outlet_id` dari klaim JWT cocok dengan body.
3. Hitung `payload_fingerprint = sha256(canonical_json(...))`.
4. Buka transaksi DB (`ReadCommitted`).
5. **Idempotency guard** (BR-008/009):
   - Record ada & fingerprint sama & `COMPLETED` → kembalikan receipt yang tersimpan (replay, tanpa checkout baru).
   - Record ada & fingerprint beda → `409 IDEMPOTENCY_CONFLICT`.
   - Record ada & `PROCESSING` → `409 CHECKOUT_PROCESSING`.
   - Tidak ada → buat record `PROCESSING`, `expires_at = now + 24h`.
6. Validasi produk aktif + harga efektif outlet via `ProductReadPort`; `expected_unit_price` beda → `409 PRICE_CHANGED`.
7. Snapshot `service_charge_pct` dari Merchant; hitung `discount`, `service_charge`, `tax`, `total` (rumus OD-004).
8. **Kurangi stok** via `StockReservationPort` — conditional atomic update per line; ada baris gagal → `409 INSUFFICIENT_STOCK`; tulis `stock_movement` `type=SALE`.
9. Insert `transaction` + `transaction_line` (snapshot) + `payment` (`status=CONFIRMED`, `amount=total`).
10. Publish outbox `TransactionCompletedEvent` dalam transaksi yang sama.
11. Update idempotency record → `COMPLETED` (simpan `transaction_id`).
12. Commit → return `200 CheckoutResult`.
13. Gagal di langkah mana pun → rollback penuh; tidak ada stok/transaksi parsial.

**Warning ⚠ (edge cases):**
- **Race condition stok terakhir (AT-004):** dua kasir memesan sisa stok bersamaan → tepat satu sukses berkat conditional update `quantity >= x`; yang lain dapat `INSUFFICIENT_STOCK`.
- **Replay setelah timeout:** client tidak menerima respons tapi transaksi sudah commit → retry dengan `idempotency_key` sama → server mengembalikan transaksi yang sama (idempotent), bukan duplikat.
- **Crash ambigu:** kalau hasil tidak dapat ditentukan (mis. proses mati di tengah) → lookup `GET /transactions/status` mengembalikan `422 CHECKOUT_NOT_CONFIRMED` agar client memutuskan ulang.
- **Worker lambat:** kegagalan `reporting`/`insight` setelah commit **tidak** mempengaruhi checkout (outbox retry di `apps/worker`).
- **`payment.amount != total`** → `400 VALIDATION_ERROR`; transaksi dibatalkan.

---

## 6. Modul Reporting — `libs/reporting`

### 6.1 Overview

| Aspek | Nilai |
|---|---|
| Base URL | `/api/v1` |
| Scope | Dashboard operasional & analitik (baca) — tidak pernah query tabel `transaction` langsung; semua baca dari `ReportingProjection` (FR-REP-002, isolasi workload) |
| State machine | **Freshness:** `FRESH` / `STALE` (flag di body, bukan HTTP error) — bukan state machine entitas |
| Aturan bisnis utama | |
| | 1. **Role:** endpoint analitik (sales-trend, aov-trend, time-pattern, top-products, outlet-comparison) hanya `OWNER`; `summary` & `low-stock` juga `ADMIN` (operasional). ADMIN **tidak** melihat insight BI. |
| | 2. Rentang tanggal & scope outlet dibatasi merchant/periode sesuai role (FR-REP-009). |
| | 3. Data dibentuk asinkron via outbox `TransactionCompletedEvent` → `ReportingProjection`; sinkronisasi batch, sehingga `freshness_status` menyertakan `data_updated_at`. |
| | 4. Bucketing waktu mengikuti `merchant.timezone` (BR-018). |

### 6.2 Endpoint

#### `GET /dashboard/summary`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER`, `ADMIN` (operasional) |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `date_from`, `date_to` | datetime | wajib | Rentang |
| `outlet_id` | uuid | opsional | Filter outlet (OWNER) |

**Response** (FR-REP-001–004):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ gross_sales, transaction_count, average_transaction_value, data_updated_at, freshness_status, period_start, period_end }` |
| 400 | Rentang invalid / `date_from > date_to` | `VALIDATION_ERROR` |
| 403 | Role tidak berhak | `FORBIDDEN` |

```json
{
  "gross_sales": "4500000.00", "transaction_count": 128, "average_transaction_value": "35156.25",
  "data_updated_at": "2026-08-13T09:55:00+07:00", "freshness_status": "FRESH",
  "period_start": "2026-08-01T00:00:00+07:00", "period_end": "2026-08-13T23:59:59+07:00"
}
```

**Warning ⚠:** `freshness_status: "STALE"` (data belum sinkron penuh) tetap HTTP 200 — dashboard tidak boleh error hanya karena proyeksi tertinggal.

#### `GET /dashboard/sales-trend`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `date_from`, `date_to` | datetime | wajib | Rentang |
| `bucket` | enum | opsional | `HOUR` / `DAY` (default `DAY`) |
| `outlet_id` | uuid | opsional | Filter outlet |

**Response** (FR-REP-003A):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ bucket, data_updated_at, points: [{ bucket_start, gross_sales, transaction_count }] }` |
| 400 | Validasi | `VALIDATION_ERROR` |
| 403 | Bukan OWNER | `FORBIDDEN` |

#### `GET /dashboard/aov-trend`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Parameter query:** `date_from`, `date_to` (wajib), `bucket` (opsional, default `DAY`), `outlet_id` (opsional).

**Response** (FR-REP-003A):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ bucket, points: [{ bucket_start, average_transaction_value }] }` |
| 400 | Validasi | `VALIDATION_ERROR` |
| 403 | Bukan OWNER | `FORBIDDEN` |

#### `GET /dashboard/time-pattern`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Parameter query:** `date_from`, `date_to` (wajib), `outlet_id` (opsional).

**Response** (FR-REP-003C):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ timezone, points: [{ hour_of_day, gross_sales, transaction_count }] }` |
| 400 | Validasi | `VALIDATION_ERROR` |
| 403 | Bukan OWNER | `FORBIDDEN` |

#### `GET /dashboard/top-products`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `date_from`, `date_to` | datetime | wajib | Rentang |
| `limit` | int | opsional | Default 10 |
| `outlet_id` | uuid | opsional | Filter outlet |

**Response** (FR-REP-003B):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ top_selling: [{ product_id, name, units_sold, gross_sales }], least_selling: [...] }` |
| 400 | Validasi | `VALIDATION_ERROR` |
| 403 | Bukan OWNER | `FORBIDDEN` |

#### `GET /dashboard/outlet-comparison`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Parameter query:** `date_from`, `date_to` (wajib).

**Response** (FR-REP-003):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `[{ outlet_id, outlet_name, gross_sales, transaction_count }]` |
| 400 | Validasi | `VALIDATION_ERROR` |
| 403 | Bukan OWNER | `FORBIDDEN` |

#### `GET /dashboard/low-stock`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER`, `ADMIN` |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `threshold` | int | opsional | Default = `merchant.low_stock_threshold` |

**Response** (FR-INV-008):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `[{ product_id, name, outlet_id, outlet_name, quantity }]` |
| 403 | Role tidak berhak | `FORBIDDEN` |

### 6.3 Endpoint internal (service-to-service)

| Mekanisme | Detail |
|---|---|
| Interface publik | `ProjectionUpdateService` (worker), `DashboardQueryService` (api), `ReportingReadPort` (06 §3.6) |
| Outbox event masuk | `TransactionCompletedEvent` → `applyEvent(...)` idempotent (FR-REP-008) |
| Port yang dikonsumsi modul lain | `ReportingReadPort.getProjection(...)` dipakai modul `insight` |
| Dependency | Hanya `platform` (`PrismaReadService`, outbox) — **tidak** baca tabel `sales`/`inventory`/`catalog` langsung (05 §3) |

### 6.4 Data Models

#### `DashboardSummary`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `gross_sales` | decimal | tidak | Penjualan kotor periode |
| `transaction_count` | int | tidak | Jumlah transaksi |
| `average_transaction_value` | decimal | tidak | Rata-rata nilai transaksi |
| `data_updated_at` | datetime | tidak | Watermark data proyeksi |
| `freshness_status` | enum | tidak | `FRESH` / `STALE` |
| `period_start` | datetime | tidak | Awal periode (timezone merchant) |
| `period_end` | datetime | tidak | Akhir periode |

#### `TrendPoint`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `bucket_start` | datetime | tidak | Awal bucket |
| `gross_sales` | decimal | tidak | Penjualan kotor bucket |
| `transaction_count` | int | tidak | Jumlah transaksi bucket |
| `average_transaction_value` | decimal | ya | Hanya untuk aov-trend |

#### `TimePatternPoint`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `hour_of_day` | int | tidak | Jam (0–23) sesuai timezone merchant |
| `gross_sales` | decimal | tidak | Penjualan jam tersebut |
| `transaction_count` | int | tidak | Jumlah transaksi |

#### `TopProductsResult`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `top_selling` | array | tidak | `{ product_id, name, units_sold, gross_sales }` |
| `least_selling` | array | tidak | Bentuk sama |

#### `OutletComparisonItem`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `outlet_id` | uuid | tidak | **FOREIGN KEY** → `outlet.outlet_id` |
| `outlet_name` | string | tidak | Nama outlet |
| `gross_sales` | decimal | tidak | Penjualan outlet |
| `transaction_count` | int | tidak | Jumlah transaksi |

#### `LowStockItem`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `product_id` | uuid | tidak | **FOREIGN KEY** |
| `name` | string | tidak | Nama produk |
| `outlet_id` | uuid | tidak | **FOREIGN KEY** |
| `outlet_name` | string | tidak | Nama outlet |
| `quantity` | int | tidak | Stok saat ini |

### 6.5 Keterkaitan dengan Modul Lain

- **Sebagai Orchestrator:** tidak memanggil modul bisnis lain — hanya mengonsumsi outbox event dan memakai `platform`.
- **Sebagai Provider:** `ReportingReadPort` dikonsumsi modul `insight` (membaca proyeksi, bukan tabel mentah).

### 6.6 Diagram Alur — Update Proyeksi (worker)

1. `apps/worker` via `OutboxRelayService` mengambil outbox `PENDING` dengan `next_attempt_at <= now` (batch 50, oldest-first).
2. Untuk tiap event `TransactionCompletedEvent`: `ProjectionUpdateService.applyEvent(...)`.
3. Baca data transaksi (watermark), perbarui `ReportingProjection` per granularity `HOUR`/`DAY` (idempotent — event yang sama tidak menggandakan agregat).
4. Update outbox → `PROCESSED`.
5. Gagal → retry dengan backoff; melebihi maksimum → `FAILED` (FR-OPS-005); checkout tidak terpengaruh.

**Warning ⚠:** Pemrosesan harus idempotent (FR-REP-008) karena outbox bisa diproses ulang setelah crash. `freshness_status` dihitung dari selisih `source_watermark` vs waktu sekarang; lewat ambang 5 menit → `STALE` (FR-OPS-003).

---

## 7. Modul Insight (BI) — `libs/insight`

### 7.1 Overview

| Aspek | Nilai |
|---|---|
| Base URL | `/api/v1` |
| Scope | Fitur "AI Insight" sebagai **Business Intelligence (BI)** — menghasilkan beberapa tipe insight analitik (bukan satu tipe); AI (rule-based default / provider eksternal opsional) sebagai mesin pengerja-penjelas. |
| State machine | **InsightStatus:** `PENDING` → `PROCESSING` → `READY` | `RETRY_SCHEDULED` → `FAILED` | `STALE`. |
| | **JobRecord state:** `PENDING` → `PROCESSING` → `READY` | `RETRY_SCHEDULED` | `FAILED` (retry + backoff + dead-letter). |
| Aturan bisnis utama | |
| | 1. **OWNER only** untuk trigger dan baca (FR-AI-012). |
| | 2. Maksimal **1 analisis per tipe per hari per merchant** (FR-AI-012). |
| | 3. Tipe: `SALES_TREND`, `OUTLET_COMPARISON`, `TOP_PRODUCTS`, `TIME_PATTERN`, `AOV_TREND`. |
| | 4. `GET /insights` mengembalikan **hasil terbaru per tipe** (tanpa histori per tipe, OD-007). |
| | 5. Output berbasis **evidence terstruktur** (data angka dari `ReportingProjection`), bukan teks generatif bebas (FR-AI-004/005). |
| | 6. Modul baca hanya dari `ReportingProjection` (via `ReportingReadPort`), bukan tabel transaksi mentah (05 §3). |

### 7.2 Endpoint

#### `POST /insights/trigger`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Request body** (FR-AI-001–003, FR-AI-012):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `type` | enum | wajib | `SALES_TREND` / `OUTLET_COMPARISON` / `TOP_PRODUCTS` / `TIME_PATTERN` / `AOV_TREND` |
| `date_from` | date | wajib | Awal rentang |
| `date_to` | date | wajib | Akhir rentang |
| `outlet_id` | uuid | opsional | Filter outlet (`null` = seluruh merchant) |

```json
{ "type": "SALES_TREND", "date_from": "2026-08-01", "date_to": "2026-08-13", "outlet_id": null }
```

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 202 | Diterima (async) | `{ job_id, insight_id, status: "PENDING" }` |
| 400 | `type` tidak dikenal / rentang invalid / sudah ada analisis hari ini utk tipe tsb | `VALIDATION_ERROR` |
| 403 | Bukan OWNER | `FORBIDDEN` |

```json
{ "job_id": "uuid", "insight_id": "uuid", "status": "PENDING" }
```

**Catatan ℹ:** Eksekusi dijalankan `apps/worker` (job `AI_INSIGHT`); client menunggu hasil via `GET /insights`.

#### `GET /insights`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Response** (FR-AI-004–005, FR-AI-008):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ insights: [ InsightResult ] }` — hasil terbaru per tipe |
| 404 | Merchant belum pernah memicu analisis tipe tersebut | `NOT_FOUND` |

```json
{
  "insights": [
    {
      "id": "uuid", "type": "SALES_TREND", "status": "READY",
      "title": "Penjualan naik 18% dibanding periode sebelumnya",
      "explanation": "Gross sales periode ini Rp4.500.000 dibanding Rp3.813.000 periode sebelumnya.",
      "evidence": { "current_gross_sales": "4500000.00", "previous_gross_sales": "3813000.00", "delta_percent": 18.0 },
      "period_start": "2026-08-01T00:00:00+07:00", "period_end": "2026-08-13T23:59:59+07:00",
      "generated_at": "2026-08-13T10:02:00+07:00"
    }
  ]
}
```

**Catatan ℹ:** Kalau `status` bukan `READY` (`PENDING`/`PROCESSING`/`FAILED`/`STALE`), field `explanation`/`evidence` boleh `null`; client menampilkan status sesuai FR-AI-008. Insight job gagal **tidak** membuat dashboard error (flag di body, `INSIGHT_UNAVAILABLE`).

### 7.3 Endpoint internal (service-to-service)

| Mekanisme | Detail |
|---|---|
| Interface publik | `InsightTriggerService`, `InsightGenerationJob`, `InsightQueryService`, `AiProviderPort` (06 §3.7) |
| Port yang dikonsumsi | `ReportingReadPort` (reporting), `JobRecordService` (platform), primitif `platform` |
| Job internal | `AI_INSIGHT` dijalankan `apps/worker` (retry/backoff via `JobRecordService`) |
| Adapter | `RuleBasedInsightAdapter` (default, dari `ReportingProjection`); `ExternalAiAdapter` opsional via `AiProviderPort` (DG-006, EXT-AI-003) |

### 7.4 Data Models

#### `TriggerInsightRequest`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `type` | enum | tidak | 5 tipe BI |
| `date_from` | date | tidak | Rentang awal |
| `date_to` | date | tidak | Rentang akhir |
| `outlet_id` | uuid | ya | `null` = seluruh merchant |

#### `InsightResult`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `id` | uuid | tidak | **PRIMARY KEY** |
| `merchant_id` | uuid | tidak | **FOREIGN KEY** → `merchant.merchant_id` |
| `outlet_id` | uuid | ya | **FOREIGN KEY** → `outlet.outlet_id` |
| `type` | enum | tidak | Tipe BI |
| `period_start` | datetime | tidak | Rentang |
| `period_end` | datetime | tidak | Rentang |
| `data_version` | string | tidak | Versi data proyeksi |
| `title` | string | tidak | Judul insight |
| `explanation` | string | ya | Penjelasan (null bila belum `READY`) |
| `evidence` | json | ya | Data terstruktur (FR-AI-004/005) |
| `status` | enum | tidak | `PENDING`/`PROCESSING`/`READY`/`FAILED`/`RETRY_SCHEDULED`/`STALE` |
| `generated_at` | datetime | ya | Waktu selesai generate |
| `created_at` | datetime | tidak | Waktu dibuat |

### 7.5 Keterkaitan dengan Modul Lain

- **Sebagai Orchestrator:** `insight` memakai `ReportingReadPort` (reporting) dan `JobRecordService` (platform); memicu `AiProviderPort` (adapter).
- **Sebagai Provider:** interface `InsightTriggerService`/`InsightQueryService` diekspos ke `apps/api`; `AiProviderPort` adalah titik plug provider eksternal.

### 7.6 Diagram Alur — Generate Insight

1. OWNER kirim `POST /insights/trigger`; validasi tipe, rentang, dan kuota 1x/hari/tipe.
2. Buat `insight` (`status=PENDING`) + enqueue job `AI_INSIGHT` (`JobRecordService`).
3. Return `202 { job_id, insight_id, status: "PENDING" }` — client tidak menunggu.
4. Worker jalankan `InsightGenerationJob.process(...)`: `status=PROCESSING`.
5. Baca `ReportingProjection` via `ReportingReadPort` (rentang + scope outlet).
6. `AiProviderPort.generate(...)` — default rule-based: hitung delta %, ranking, pola; `evidence` terstruktur.
7. Simpan hasil → `status=READY`, `generated_at`, `data_version`.
8. Gagal → `RETRY_SCHEDULED` dengan backoff; melewati batas → `FAILED`; data lama boleh ditandai `STALE`.

**Warning ⚠:** Insight selalu dibaca dari proyeksi (bisa `STALE`); jangan pernah query tabel transaksi langsung. Provider eksternal memakai timeout + circuit breaker (`cockatiel`) agar worker tidak tersumbat (EXT-AI-003).

---

## 8. Modul Audit — `libs/audit`

### 8.1 Overview

| Aspek | Nilai |
|---|---|
| Base URL | `/api/v1` |
| Scope | Jejak audit lintas modul (read + listener) |
| State machine | Tidak ada state machine — `AuditEvent` adalah immutable log |
| Aturan bisnis utama | |
| | 1. Modul lain **tidak pernah memanggil audit langsung** — audit mendengarkan domain event via `@OnEvent` (05 §3, 06 §2.2). |
| | 2. Akses baca hanya `OWNER` (FR-AUD-005). |
| | 3. `before_json`/`after_json` tidak disertakan di list, hanya di detail bila dibutuhkan. |

### 8.2 Endpoint

#### `GET /audit`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `actor_id` | uuid | opsional | Filter aktor |
| `action` | enum | opsional | `STAFF_CREATED`, `STAFF_UPDATED`, `OUTLET_CREATED`, `OUTLET_UPDATED`, `PRICE_CHANGED`, `PRODUCT_STATUS_CHANGED`, `STOCK_ADJUSTED`, `CHECKOUT_COMPLETED`, dll |
| `target_type` | string | opsional | `USER`, `OUTLET`, `PRODUCT`, `TRANSACTION`, dll |
| `date_from`, `date_to` | datetime | opsional | Rentang |
| `page`, `size` | int | opsional | Paginasi |

**Response** (FR-AUD-005):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `Page<AuditEventDto>` — `{ id, actor_id, actor_name, action, target_type, target_id, result, correlation_id, created_at }` |
| 403 | Bukan OWNER | `FORBIDDEN` |

### 8.3 Endpoint internal (service-to-service)

| Mekanisme | Detail |
|---|---|
| Interface publik | `AuditListener`, `AuditQueryService` (06 §3.8) |
| Domain event masuk | `StaffCreatedEvent`, `StaffUpdatedEvent`, `OutletCreatedEvent`, `OutletUpdatedEvent`, `PriceChangedEvent`, `ProductStatusChangedEvent`, `StockAdjustedEvent`, `CheckoutCompletedEvent` (06 §2.2) |
| Dependency | Hanya `platform` (`PrismaWriteService`) |

### 8.4 Data Models

#### `AuditEventDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `id` | uuid | tidak | **PRIMARY KEY** |
| `merchant_id` | uuid | tidak | **FOREIGN KEY** → `merchant.merchant_id` |
| `outlet_id` | uuid | ya | **FOREIGN KEY** → `outlet.outlet_id` |
| `actor_user_id` | uuid | tidak | **FOREIGN KEY** → `user.user_id` |
| `action` | string | tidak | Nama aksi (mis. `PRICE_CHANGED`) |
| `target_type` | string | tidak | Jenis target |
| `target_id` | string | tidak | ID target |
| `before_json` | json | ya | Nilai sebelum (hanya detail) |
| `after_json` | json | ya | Nilai sesudah (hanya detail) |
| `correlation_id` | string | tidak | Menautkan jejak request |
| `result` | enum | tidak | `SUCCESS` / `DENIED` / `ERROR` |
| `created_at` | datetime | tidak | Waktu kejadian |

### 8.5 Keterkaitan dengan Modul Lain

- **Sebagai Orchestrator:** tidak memanggil modul bisnis lain.
- **Sebagai Provider:** `AuditQueryService` diekspos ke `apps/api`; listener mengonsumsi event dari seluruh modul bisnis (identity, tenant, catalog, inventory, sales).

### 8.6 Diagram Alur — Pencatatan Audit

1. Modul sumber melakukan aksi bisnis (mis. ADMIN mengubah harga produk).
2. Modul sumber publish domain event (`PriceChangedEvent`) via `@nestjs/event-emitter`.
3. `AuditListener.handle(...)` menangkap event (async, tidak memblokir aksi utama).
4. Tulis row `AuditEvent` (`action`, `target`, `result`, `correlation_id`).
5. OWNER membaca via `GET /audit`.

**Warning ⚠:** Listener audit harus toleran gagal dan tidak pernah membuat aksi bisnis utama gagal (fire-and-forget; kegagalan ditulis log, bukan di-rollback aksi).

---

## 9. Modul Platform (shared) — `libs/platform`

### 9.1 Overview

| Aspek | Nilai |
|---|---|
| Base URL | `/api/v1` |
| Scope | Infrastruktur bersama: error handler, guards, money, outbox, job, prisma, pagination, observability |
| State machine | Tidak ada state machine bisnis |
| Aturan bisnis utama | |
| | 1. Bukan modul bisnis — tidak boleh menampung logika bisnis (06 §1, poin 6). |
| | 2. Semua response error global diformat di sini (katalog §0.1). |
| | 3. Observability wajib: `/metrics` di-scrape **Prometheus**, visualisasi **Grafana** (NFR-OBS-002). |

### 9.2 Endpoint (non-bisnis, operasional)

#### `GET /health`

| Properti | Nilai |
|---|---|
| Authentication | Publik (atau dibatasi internal network di Railway) |
| Required Roles | — |

**Response** (FR-OPS-001):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Sehat | `{ status: "ok", database: "ok", worker_backlog: { outbox_pending, job_pending } }` |
| 503 | Database/dependency tidak sehat | `DEPENDENCY_UNAVAILABLE` |

```json
{ "status": "ok", "database": "ok", "worker_backlog": { "outbox_pending": 3, "job_pending": 0 } }
```

### 9.3 Endpoint internal (service-to-service)

Tidak ada endpoint internal. Platform menyediakan primitif in-process yang dipakai semua modul:

| Primitif | Dipakai oleh |
|---|---|
| `OutboxService` / `OutboxRelayService` | `sales` (publish), `reporting`/`insight` (consume) |
| `JobRecordService` | `insight` |
| `PrismaWriteService` / `PrismaReadService` | semua modul (write: primary, read: read replica) |
| `Money` helper | `catalog`, `inventory`, `sales`, `reporting` |
| `PageRequestDto` / `PageResponseDto<T>` | semua modul dengan list |
| `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()`, `CorrelationIdMiddleware` | semua modul |
| `AllExceptionsFilter`, `ErrorCode` | semua modul |

### 9.4 Data Models

Tidak ada entitas bisnis yang dimiliki platform. Objek bersama: `PageResponseDto`, `ApiError` (format error §0).

### 9.5 Keterkaitan dengan Modul Lain

- **Sebagai Orchestrator:** tidak ada.
- **Sebagai Provider:** seluruh modul bisnis bergantung pada `platform` (06 §4). Endpoint `GET /health` dan `GET /metrics` untuk operasional/observability.

### 9.6 Diagram Alur — Healthcheck

1. Monitor/CI memanggil `GET /health`.
2. Server cek koneksi `PrismaWriteService` (primary) + baca backlog outbox/job.
3. Semua sehat → `200 { status: "ok", ... }`; ada koneksi gagal → `503 DEPENDENCY_UNAVAILABLE`.

**Warning ⚠:** `GET /health` tidak boleh mengandalkan read replica (bisa lag); healthcheck inti hanya primary + proses worker. `/metrics` dipakai Prometheus untuk alert (mis. backlog > 5 menit, p95 latensi).

---

## 10. Traceability ringkas

| Area endpoint | Requirement utama |
|---|---|
| `/auth/*`, `/staff/*` | FR-AUTH-001–014, FR-TEN-001–008 |
| `/merchant`, `/outlets/*` | FR-TEN-004, FR-TEN-010, FR-INV-008, FR-TEN-011 |
| `/categories/*`, `/products/*` | FR-CAT-001–012, BR-012, BR-019, OD-002 |
| `/inventory/*`, `/products/catalog` | FR-INV-001–009, FR-CAT-006/012 |
| `/checkout`, `/transactions/*`, `/receipts/*` | FR-CART-001–010, FR-CHK-001–018, FR-PAY-001–008, FR-TRX-001–008, BR-001–014, OD-003/004/010, NFR-PERF-001 |
| `/dashboard/*` | FR-REP-001–010, FR-INV-008 |
| `/insights/*` | FR-AI-001–012, OD-007 |
| `/audit` | FR-AUD-001–006 |
| `/health`, `/metrics` | FR-OPS-001–006, NFR-OBS-001–005 |

> Setiap endpoint wajib memiliki minimal 1 acceptance test yang menautkan langsung ke ID requirement tersebut (lihat `AT-*` di SRS §17.2) sebelum dianggap "Done" (SRS §21 Definition of Done).
