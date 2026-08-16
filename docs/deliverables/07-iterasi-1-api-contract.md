# Iterasi 1 — API Contract Lengkap (NestJS Modular Monolith)

**Version:** 1.0.0
**Last Updated:** Agustus 2026

> Dokumen ini adalah **kontrak API lengkap** untuk seluruh modul yang dinyatakan di `05-iterasi-1-build-plan-nestjs.md` §5 dan mengikuti boundary modul pada `06-iterasi-1-module-library.md`. Bila ada konflik dengan dokumen `01`–`04`, **SRS menang**. Bila ada perbedaan detail dengan `05`, bagian yang lebih detail (dokumen ini) berlaku sebagai acuan implementasi HTTP layer.
>
> Konvensi penulisan: seluruh nama field **`snake_case`**, seluruh ID memakai **UUID (string)** kecuali disebutkan lain. Response sukses maupun error memakai **response/error envelope** sesuai konvensi global `05` §5, kecuali `204 No Content` pada DELETE yang dinyatakan eksplisit (detail di §0).

---

## Daftar Isi

1. [Modul Identity — `libs/identity`](#1-modul-identity--libsidentity)
2. [Modul Tenant — `libs/tenant`](#2-modul-tenant--libstenant)
3. [Modul Catalog — `libs/catalog`](#3-modul-catalog--libscatalog)
4. [Modul Inventory — `libs/inventory`](#4-modul-inventory--libsinventory)
5. [Modul Sales — `libs/sales`](#5-modul-sales--libssales)
6. [Modul Reporting — `libs/reporting`](#6-modul-reporting--libsreporting)
7. [Modul Insight (BI) — `libs/insight`](#7-modul-insight-bi--libsinsight)
8. [Modul Platform (shared) — `libs/platform`](#8-modul-platform-shared--libsplatform)
9. [Traceability ringkas](#9-traceability-ringkas)

---

## 0. Konvensi global API

| Aspek | Aturan |
|---|---|
| Base URL | `/api/v1` |
| Auth | Header `Authorization: Bearer <access_token>`. Klaim JWT wajib: `sub` (user_id), `merchant_id`, `role`, `outlet_id` (nullable). `merchant_id` dan role selalu berasal dari token. Outlet Kasir berasal dari token; parameter `outlet_id` untuk Owner/Admin hanya menjadi selector dan wajib divalidasi berada dalam Merchant token (FR-TEN-010). |
| Content-Type | `application/json` untuk semua request/response |
| Uang | String desimal eksplisit, contoh `"total": "125000.00"` — **tidak pernah** number JSON (API-006) |
| Waktu | ISO-8601 dengan offset, contoh `"2026-08-13T10:00:00+07:00"` (API-005) |
| Pagination | Query `?page=0&size=20` (default `size=20`, maks `size=100`, API-004). Response list selalu dibungkus di dalam `data` envelope: |

```json
{
  "success": true,
  "statusCode": 200,
  "message": "List berhasil dimuat",
  "data": {
    "content": [ /* array item */ ],
    "page": 0,
    "size": 20,
    "total_elements": 134,
    "total_pages": 7
  }
}
```

| Correlation ID | Setiap response (sukses maupun error) menyertakan header `X-Correlation-Id`. Client boleh kirim `X-Correlation-Id` sendiri untuk propagate trace; kalau tidak dikirim, server generate baru (NFR-OBS-005). Header ini adalah satu-satunya tempat correlation id — **body JSON tidak memuatnya**. |
| Format sukses | Semua response 2xx, **kecuali `204 No Content` pada DELETE yang dinyatakan eksplisit**, dibungkus **response envelope**: `success=true`, `statusCode` (angka HTTP nyata), `message` (deskripsi sukses per endpoint), dan payload di `data`. Response `204` tidak memiliki body: |

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Merchant berhasil diperbarui",
  "data": {
    "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "IndoMart Retail Updated",
    "low_stock_threshold": 15
  }
}
```

> Contoh di atas ilustrasi **bentuk envelope**; isi `data` mengikuti DTO endpoint yang bersangkutan (mis. `MerchantDto` di §2.4 — tidak ada field `low_stock_threshold` pada merchant).

| Format error | Semua response non-2xx dibungkus **error envelope**: |

```json
{
  "success": false,
  "statusCode": 400,
  "path": "/api/v1/products",
  "message": "Nama produk wajib diisi",
  "errors": [
    { "field": "name", "message": "Name should not be empty" }
  ],
  "timestamp": "2026-08-13T14:30:00.000Z"
}
```

> Aturan envelope: `errors` hanya muncul bila ada detail per field (khususnya validasi `class-validator`); untuk error tanpa field (401/403/404/409/429/503/500) `errors` dihilangkan. `statusCode` selalu konsisten dengan HTTP status nyata; `path` adalah path endpoint yang diminta; `timestamp` adalah waktu server (ISO-8601, UTC). `success` selalu `true` untuk 2xx yang memiliki body dan `false` untuk non-2xx. `204` adalah pengecualian tanpa body.

### 0.1 Katalog kondisi error global (dipakai di seluruh dokumen ini)

Kolom "Nama kondisi" dipakai sebagai **identitas referensi** di seluruh dokumen (tabel endpoint, kontrak port di `06`, acceptance test). Envelope error (§0) **tidak memuat field `code`** — pembeda bagi client adalah `statusCode`, `message`, dan `errors[].field`; `message` mengikuti template di kolom kanan agar konsisten.

| Nama kondisi (internal) | HTTP status | Kondisi | Contoh `message` |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Input tidak valid (`class-validator` gagal, termasuk kombinasi role/outlet tidak sah) | `"Validasi gagal"` — detail per field di `errors[]` |
| `UNAUTHENTICATED` | 401 | Token tidak ada/invalid/kedaluwarsa; atau kredensial login salah (pesan disamarkan, FR-AUTH-006) | `"Autentikasi gagal"` |
| `FORBIDDEN` | 403 | Role/tenant tidak berhak | `"Akses ditolak"` |
| `NOT_FOUND` | 404 | Resource tidak ditemukan **atau** milik merchant/outlet lain (disamarkan, FR-TEN-010) | `"Data tidak ditemukan"` |
| `EMAIL_ALREADY_REGISTERED` | 409 | Email sudah terdaftar (register owner / create staff) | `"Email sudah terdaftar"` |
| `PRODUCT_INACTIVE` | 409 | Produk tidak aktif saat checkout / tambah keranjang | `"Produk tidak aktif"` |
| `CATEGORY_INACTIVE` | 409 | Category produk tidak aktif saat checkout / pemuatan katalog | `"Kategori produk tidak aktif"` |
| `PRICE_CHANGED` | 409 | Harga server berbeda dari `expected_unit_price` | `"Harga produk berubah"` |
| `INSUFFICIENT_STOCK` | 409 | Stok outlet tidak cukup | `"Stok tidak mencukupi"` |
| `IDEMPOTENCY_CONFLICT` | 409 | `checkout_request_id` sama, payload beda | `"Konflik idempotency checkout"` |
| `RATE_LIMITED` | 429 | Melewati batas `@nestjs/throttler` | `"Terlalu banyak permintaan"` |
| `DEPENDENCY_UNAVAILABLE` | 503 | Database/dependency inti tidak sehat | `"Layanan tidak tersedia"` |
| `REPORT_STALE` | — (flag di body 200) | Dipakai di `freshness_status`, bukan HTTP error | — |
| `INSIGHT_UNAVAILABLE` | — (flag di body 200) | Insight job gagal, dashboard tetap tampil | — |
| `INTERNAL_ERROR` | 500 | Error tak terduga; tidak menampilkan stack trace ke client | `"Terjadi kesalahan internal"` |

### 0.2 Konvensi tabel endpoint

Setiap endpoint disajikan dengan:

1. **Tabel properti** — Authentication (publik/token) dan Required Roles.
2. **Tabel parameter** — path/query (bila ada).
3. **Tabel request body** — `field | type | required | description`.
4. **Tabel response** — `status | kondisi | body (key fields)`; minimal 1 success case dan semua error case yang masuk akal (400/403/404/409/422). Kolom `body (key fields)` untuk status 2xx menampilkan **isi `data`** (envelope §0); untuk non-2xx menampilkan **nama kondisi** (§0.1) dan field terdampak (`errors[].field`).
5. **Catatan (ℹ)** dan **warning (⚠)** untuk behavior khusus/edge case.

Istilah role: `OWNER` = pemilik merchant, `ADMIN` = pengelola operasional (katalog/stok + dashboard operasional), `CASHIER` = kasir pada outlet tugasnya. Lihat matriks role di `03` §7.1 dan `04` §5.

---

## 1. Modul Identity — `libs/identity`

### 1.1 Overview

| Aspek | Nilai |
|---|---|
| Base URL | `/api/v1` |
| Scope | Registrasi owner + merchant, login, lifecycle staf |
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
| 409 | Email sudah dipakai | `EMAIL_ALREADY_REGISTERED`, `errors[].field="email"` |
| 500 | Error tak terduga | `INTERNAL_ERROR` |

```json
{
  "success": true, "statusCode": 201, "message": "Registrasi berhasil",
  "data": { "user_id": "uuid", "merchant_id": "uuid", "email": "budi@warungku.id", "role": "OWNER" }
}
```

**Catatan ℹ:** Proses ini membuat Merchant + User OWNER dalam satu transaksi DB (atomik). Diskon, pajak, dan service charge tidak dikonfigurasi pada MVP (`OD-004`).

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
| 200 | Berhasil | `{ access_token, expires_in, role, merchant_id, outlet_id }` |
| 401 | Kredensial salah **atau** akun nonaktif (pesan sama) | `UNAUTHENTICATED` |
| 429 | >5 percobaan/menit per email+IP | `RATE_LIMITED` |

```json
{
  "success": true, "statusCode": 200, "message": "Login berhasil",
  "data": { "access_token": "eyJ...", "expires_in": 900, "role": "OWNER", "merchant_id": "uuid", "outlet_id": null }
}
```

**Catatan ℹ:** Login menerbitkan **satu JWT access token** berumur 900 detik (OD-011, FR-AUTH-007). Tidak ada refresh token maupun endpoint refresh/logout — logout dilakukan client dengan menghapus token (FR-AUTH-008). `outlet_id` berisi UUID untuk `CASHIER`, `null` untuk `OWNER`/`ADMIN`.

> **Tidak ada endpoint `POST /auth/refresh` dan `POST /auth/logout` pada MVP.** Logout dilakukan client dengan menghapus JWT (OD-011, FR-AUTH-008); tidak ada revocation/blacklist server-side. Setiap request terproteksi tetap memvalidasi signature, expiry, dan status akun `ACTIVE` saat itu (FR-AUTH-009).

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
{
  "success": true, "statusCode": 201, "message": "Staf berhasil dibuat",
  "data": { "user_id": "uuid", "email": "sari@warungku.id", "role": "CASHIER", "outlet_id": "uuid", "status": "ACTIVE" }
}
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
| `access_token` | string (JWT) | tidak | Satu-satunya token yang diterbitkan; umur 900 detik (OD-011, FR-AUTH-007) |
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

### 1.6 Diagram Alur — Login

1. Client kirim `POST /auth/login` (`email`, `password`).
2. Server cek rate limit per email+IP (FR-AUTH-010); lewat → `429 RATE_LIMITED`.
3. Cari user by `email_normalized`; user tidak ditemukan → `401 UNAUTHENTICATED` (pesan disamarkan).
4. Verifikasi `argon2`; gagal → `401 UNAUTHENTICATED` (pesan sama).
5. Cek `status=ACTIVE`; nonaktif → `401 UNAUTHENTICATED` (disamarkan, FR-AUTH-006).
6. Sign satu `access_token` (900s) — tanpa refresh token/revocation server-side (OD-011).
7. Return `{ access_token, expires_in, role, merchant_id, outlet_id }`.

**Warning ⚠:** Jangan bedakan alasan 401 (kredensial vs nonaktif) — bocor informasi akun (FR-AUTH-006). Logout dilakukan client dengan menghapus token; token yang telah disalin tetap valid sampai expiry selama akun aktif (FR-AUTH-008/009).

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

### 2.2 Endpoint

#### `GET /merchant`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | Semua role (OWNER, ADMIN, CASHIER) |

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ id, name, timezone, status }` |

```json
{
  "success": true, "statusCode": 200, "message": "Profil merchant dimuat",
  "data": { "id": "uuid", "name": "Warung Budi", "timezone": "Asia/Jakarta", "status": "ACTIVE" }
}
```

**Catatan ℹ:** Endpoint ini dipakai semua role untuk membaca profil merchant miliknya sendiri (scope selalu dari JWT).

#### `PATCH /merchant`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Request body:**

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `name` | string | opsional | Nama merchant |

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `MerchantDto` terbaru |
| 400 | Validasi gagal | `VALIDATION_ERROR` |
| 403 | Bukan OWNER | `FORBIDDEN` |


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

### 2.4 Data Models

#### `MerchantDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `id` | uuid | tidak | **PRIMARY KEY** |
| `owner_user_id` | uuid | tidak | **FOREIGN KEY** → `user.user_id` (unique) |
| `name` | string | tidak | Nama merchant |
| `timezone` | string | tidak | Default `Asia/Jakarta` (batas hari laporan, BR-018) |
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

### 2.6 Diagram Alur — Buat Outlet

1. OWNER kirim `POST /outlets` (`name`, `address`).
2. Server ambil `merchant_id` dari JWT; validasi role OWNER.
3. Buat row `outlet` dengan `status=ACTIVE`.
4. Return `201` `OutletDto`.

**Warning ⚠:** Pembuatan outlet tidak otomatis membuat stok/inventory row — stok diinisialisasi lewat `POST /inventory/adjustments` (alur stok di modul Inventory).

---

## 3. Modul Catalog — `libs/catalog`

### 3.1 Overview

| Aspek | Nilai |
|---|---|
| Base URL | `/api/v1` |
| Scope | Category, Product master, harga override per Outlet |
| State machine | **Soft-deactivation (bukan delete fisik):** Category dan Product punya `is_active` boolean (BR-019). Tidak ada endpoint `DELETE` — hanya `PATCH is_active=false`. Product nonaktif, atau Product dengan Category nonaktif, tidak muncul di katalog Kasir dan ditolak saat checkout (`PRODUCT_INACTIVE` atau `CATEGORY_INACTIVE`). |
| Aturan bisnis utama | |
| | 1. **Role:** mutasi (create/patch/outlet-prices) oleh `ADMIN` dan `OWNER` (OWNER mewarisi permission ADMIN — BR-011B); `CASHIER` hanya lihat katalog aktif outlet tugasnya (04 §5, rule 9). |
| | 2. Nama Category unik per merchant (DR-010). |
| | 3. Harga master global + override per Outlet (OD-002, FR-CAT-010): tanpa override → pakai `product.price`; ada override → pakai `product_outlet_price.price`. |
| | 4. Semua harga rupiah dihitung server saat checkout (BR-012); harga di keranjang client-side hanya display. |
| | 5. `category_id` saat membuat/mengubah product harus kategori aktif milik merchant yang sama. |

### 3.2 Endpoint

#### `POST /categories`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `ADMIN`, `OWNER` |

**Request body** (FR-CAT-001, DR-010):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `name` | string | wajib | Nama kategori, non-empty |

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 201 | Berhasil | `{ id, name, is_active: true }` |
| 400 | Nama kosong | `VALIDATION_ERROR` |
| 403 | Bukan ADMIN/OWNER | `FORBIDDEN` |
| 409 | Nama duplikat dalam merchant | `VALIDATION_ERROR`, `errors[].field="name"` |

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
| 200 | Berhasil | `Page<CategoryDto>` — `{ id, name, is_active }` |

**Catatan ℹ:** OWNER dan ADMIN melihat semua kategori (termasuk nonaktif); CASHIER hanya kategori aktif.

#### `PATCH /categories/:id`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `ADMIN`, `OWNER` |

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
| 403 | Bukan ADMIN/OWNER | `FORBIDDEN` |
| 404 | Kategori tidak ditemukan | `NOT_FOUND` |

**Warning ⚠:** Tidak ada `DELETE /categories/:id` di kontrak ini sama sekali (BR-019). Menonaktifkan Category tidak menghapus atau mengubah status Product di dalamnya, tetapi Product tersebut tidak tampil di katalog Kasir dan checkout harus menolaknya sampai Category aktif kembali.

#### `POST /products`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `ADMIN`, `OWNER` |

**Request body** (FR-CAT-002–003, FR-INV-007, DR-011A):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `name` | string | wajib | Nama produk, non-empty |
| `price` | decimal string | wajib | Harga master global, `>= 0` |
| `category_id` | uuid | wajib | Kategori aktif milik merchant |
| `low_stock_threshold` | int | wajib | Threshold stok rendah dasar Product, `>= 0` |
| `is_active` | boolean | opsional | Default `true` |

```json
{ "name": "Es Teh Manis", "price": "8000.00", "category_id": "uuid", "low_stock_threshold": 5, "is_active": true }
```

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 201 | Berhasil | `ProductDto` |
| 400 | Nama kosong / harga negatif / threshold kosong atau negatif / kategori kosong/nonaktif/bukan milik merchant | `VALIDATION_ERROR` |
| 403 | Bukan ADMIN/OWNER | `FORBIDDEN` |
| 404 | Category tidak ditemukan | `NOT_FOUND` |

**Catatan ℹ:** `is_active=false` saat create diperbolehkan (produk dibikin nonaktif).

#### `GET /products`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER`, `ADMIN` |

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
| 200 | Berhasil | `Page<ProductDto>` — `{ id, name, price, category_id, category_name, low_stock_threshold, is_active }` |
| 403 | Bukan OWNER/ADMIN | `FORBIDDEN` |

**Catatan ℹ:** `price` di sini adalah harga master. Harga efektif per outlet dilihat via `PUT /products/:product_id/outlet-prices/:outlet_id` dan endpoint katalog kasir (modul Inventory).

#### `PATCH /products/:id`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `ADMIN`, `OWNER` |

**Parameter path:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `id` | uuid | wajib | Produk yang diubah |

**Request body** (FR-CAT-005, FR-CAT-007):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `name` | string | opsional | Nama produk |
| `price` | decimal string | opsional | Harga master global |
| `category_id` | uuid | opsional | Pindah kategori |
| `low_stock_threshold` | int | opsional | Threshold stok rendah dasar Product, `>= 0` |
| `is_active` | boolean | opsional | Soft-deactivate |

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `ProductDto` terbaru |
| 400 | Validasi gagal | `VALIDATION_ERROR` |
| 403 | Bukan ADMIN/OWNER | `FORBIDDEN` |
| 404 | Produk tidak ditemukan | `NOT_FOUND` |

**Warning ⚠:** Perubahan harga/status **tidak mengubah transaksi lama** (snapshot disimpan di `transaction_item`, US-PROD-002).

#### `PUT /products/:product_id/outlet-prices/:outlet_id`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `ADMIN`, `OWNER` |

**Parameter path:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `product_id` | uuid | wajib | Produk |
| `outlet_id` | uuid | wajib | Outlet target |

**Request body** (FR-CAT-010, OD-002):

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
| 403 | Bukan ADMIN/OWNER | `FORBIDDEN` |
| 404 | Produk/outlet tidak ditemukan | `NOT_FOUND` |

**Catatan ℹ:** Untuk menghapus override gunakan `DELETE /products/:product_id/outlet-prices/:outlet_id` — fallback kembali ke harga master.

#### `DELETE /products/:product_id/outlet-prices/:outlet_id`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `ADMIN`, `OWNER` |

**Response:**

| Status | Kondisi | Body |
|---|---|---|
| 204 | Override dihapus, harga efektif kembali ke harga master | Kosong |
| 403 | Bukan ADMIN/OWNER | `FORBIDDEN` |
| 404 | Override tidak ada / resource tidak ditemukan | `NOT_FOUND` |

### 3.3 Endpoint internal (service-to-service)

| Mekanisme | Detail |
|---|---|
| Interface publik | `CategoryService`, `ProductService`, `OutletPriceService`, `ProductReadPort` (06 §3.3) |
| Port yang dikonsumsi modul lain | `ProductReadPort.getProductsForSaleValidation(...)` dipakai `inventory` (katalog kasir) dan `sales` (validasi status Product/Category serta harga efektif checkout) |

### 3.4 Data Models

#### `CategoryDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `id` | uuid | tidak | **PRIMARY KEY** |
| `merchant_id` | uuid | tidak | **FOREIGN KEY** → `merchant.merchant_id` |
| `name` | string | tidak | Nama kategori (unique per merchant) |
| `is_active` | boolean | tidak | Soft-deactivation (BR-019) |

#### `ProductDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `id` | uuid | tidak | **PRIMARY KEY** |
| `merchant_id` | uuid | tidak | **FOREIGN KEY** → `merchant.merchant_id` |
| `category_id` | uuid | tidak | **FOREIGN KEY** → `category.category_id` |
| `name` | string | tidak | Nama produk |
| `price` | decimal string | tidak | Harga master global |
| `low_stock_threshold` | int | tidak | Threshold dasar Product, `>= 0` |
| `is_active` | boolean | tidak | Soft-deactivation |
| `created_at` | datetime | tidak | Waktu dibuat |
| `updated_at` | datetime | tidak | Waktu diubah |

#### `ProductOutletPriceDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `product_id` | uuid | tidak | **FOREIGN KEY** → `product.product_id` (bagian composite key) |
| `outlet_id` | uuid | tidak | **FOREIGN KEY** → `outlet.outlet_id` (bagian composite key) |
| `price` | decimal string | tidak | Harga override; tanpa baris berarti pakai harga master |
| `updated_at` | datetime | tidak | Waktu diubah |

### 3.5 Keterkaitan dengan Modul Lain

- **Sebagai Orchestrator:** Catalog memakai `TenantAuthorizationService` (tenant) + primitif `platform`. **Tidak** bergantung pada inventory (boundary 05 §3).
- **Sebagai Provider:**
  - `ProductReadPort` dikonsumsi `inventory` dan `sales` (harga efektif per outlet).

### 3.6 Diagram Alur — Set Harga Override Outlet

1. ADMIN kirim `PUT /products/:product_id/outlet-prices/:outlet_id` (`price`).
2. Validasi produk aktif milik merchant + outlet milik merchant (via `TenantAuthorizationService`).
3. Upsert row `product_outlet_price` (unique `outlet_id + product_id`).
4. Return `200` `{ product_id, outlet_id, price, updated_at }`.

**Warning ⚠:** Checkout berikutnya langsung memakai harga override baru (FR-CAT-010). Harga pada transaksi yang **sudah** terjadi tidak berubah (snapshot `unit_price_snapshot` di `transaction_item`).

---

## 4. Modul Inventory — `libs/inventory`

### 4.1 Overview

| Aspek | Nilai |
|---|---|
| Base URL | `/api/v1` |
| Scope | Stok per outlet, stock movement, katalog kasir |
| State machine | **StockMovement type:** `ADJUSTMENT` (manual) / `SALE` (dari checkout). Stock `quantity >= 0` (CHECK constraint + app-level). Tidak ada transisi status stok — stok adalah kuantitas, bukan state. |
| Aturan bisnis utama | |
| | 1. **Role:** mutasi stok (adjustment) oleh `ADMIN` dan `OWNER` (warisan permission, BR-011B); kasir tidak menyentuh endpoint stok. |
| | 2. `delta` tidak boleh `0`; `reason` wajib untuk `ADJUSTMENT`. |
| | 3. Hasil adjustment tidak boleh membuat stok negatif (FR-INV-004). |
| | 4. Pengurangan stok saat checkout memakai **conditional atomic update** (`quantity >= x`), bukan pessimistic lock — menjamin tepat satu kasir menang saat rebutan stok terakhir (AT-004, 05 §6.1). |
| | 5. Threshold efektif stok rendah adalah `inventory.low_stock_threshold_override` bila terisi; jika `null`, gunakan `product.low_stock_threshold`. Tidak ada threshold global Merchant dan query tidak boleh mengganti threshold efektif. |
| | 6. Endpoint `GET /products/catalog` (katalog kasir) **diimplementasikan di modul ini** karena membaca tabel `inventory`, walaupun path-nya di domain Catalog (06 §3.3–3.4). |

### 4.2 Endpoint

#### `GET /inventory`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER`, `ADMIN` |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `outlet_id` | uuid | opsional | Filter Outlet dalam Merchant untuk Owner/Admin; tanpa filter menampilkan seluruh Outlet dalam Merchant |
| `product_id` | uuid | opsional | Filter produk |
| `low_stock_only` | boolean | opsional | Hanya stok dengan `quantity <= effective_low_stock_threshold` |
| `page`, `size` | int | opsional | Paginasi |

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `Page<InventoryDto>` — `{ id, outlet_id, outlet_name, product_id, product_name, quantity, base_low_stock_threshold, low_stock_threshold_override, effective_low_stock_threshold, is_low_stock, updated_at }` |
| 403 | Role tidak diizinkan | `FORBIDDEN` |

#### `POST /inventory/adjustments`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `ADMIN`, `OWNER` |

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
| 403 | Bukan ADMIN/OWNER; outlet nonaktif (read-only, FR-TEN-004) | `FORBIDDEN` |
| 404 | Outlet/produk tidak ditemukan | `NOT_FOUND` |
| 409 | Hasil menjadi negatif | `VALIDATION_ERROR`, `errors[].field="delta"` |

```json
{
  "success": true, "statusCode": 201, "message": "Adjustment stok berhasil",
  "data": { "movement_id": "uuid", "outlet_id": "uuid", "product_id": "uuid", "quantity_before": 12, "quantity_after": 9, "delta": -3, "reason": "Barang rusak", "actor_user_id": "uuid", "created_at": "2026-08-13T10:00:00+07:00" }
}
```

**Catatan ℹ:** `quantity_after` dihitung server; client tidak mengirim target quantity.

#### `PUT /inventory/:product_id/outlets/:outlet_id/low-stock-threshold`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `ADMIN`, `OWNER` |

**Request body** (`UR-ADM-005B`, `FR-INV-007A`, `DR-011A`):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `threshold` | int | wajib | Override threshold Product pada Outlet, `>= 0` |

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ product_id, outlet_id, base_low_stock_threshold, low_stock_threshold_override, effective_low_stock_threshold, updated_at }` |
| 400 | Threshold negatif | `VALIDATION_ERROR` |
| 403 | Bukan ADMIN/OWNER atau Outlet nonaktif | `FORBIDDEN` |
| 404 | Product/Outlet tidak ditemukan dalam Merchant | `NOT_FOUND` |

Jika kombinasi Inventory belum ada, endpoint membuat baris Inventory dengan `quantity=0` dan override yang diminta. Dengan demikian Admin dapat menyiapkan threshold setiap Outlet sebelum memasukkan stok awal.

#### `DELETE /inventory/:product_id/outlets/:outlet_id/low-stock-threshold`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `ADMIN`, `OWNER` |

| Status | Kondisi | Body |
|---|---|---|
| 204 | Override dihapus; threshold efektif kembali ke threshold dasar Product | Kosong |
| 403 | Bukan ADMIN/OWNER atau Outlet nonaktif | `FORBIDDEN` |
| 404 | Product/Outlet tidak ditemukan dalam Merchant | `NOT_FOUND` |

#### `GET /inventory/movements`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER`, `ADMIN` |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `outlet_id` | uuid | opsional | Filter Outlet dalam Merchant untuk Owner/Admin; tanpa filter menampilkan seluruh Outlet dalam Merchant |
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
| Required Roles | `CASHIER`, `OWNER` |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `outlet_id` | uuid | wajib | Kasir: wajib sama dengan Outlet tugas pada JWT. Owner: Outlet aktif pilihan dalam Merchant yang tervalidasi. |
| `search` | string | opsional | Pencarian nama Product |
| `category_id` | uuid | opsional | Filter Category aktif dalam Merchant |
| `page`, `size` | int | opsional | Paginasi; frontend boleh memfilter lagi atas halaman/katalog yang sudah dimuat untuk respons tap instan |

**Response** (FR-CAT-006, FR-CAT-011–012):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `Page<CatalogProductDto>` — hanya Product aktif dengan Category aktif yang punya inventory row di Outlet; `price` = harga efektif Outlet |
| 403 | Kasir memakai Outlet selain tugasnya, Owner memilih Outlet tidak aktif/di luar Merchant, atau role lain | `FORBIDDEN` |
| 400 | `outlet_id` tidak dikirim | `VALIDATION_ERROR` |

```json
{
  "success": true, "statusCode": 200, "message": "Katalog kasir dimuat",
  "data": {
    "items": [
      { "id": "uuid", "name": "Es Teh Manis", "price": "8500.00", "category_id": "uuid", "stock_quantity": 12 }
    ],
    "page": 1, "size": 20, "total_elements": 1, "total_pages": 1
  }
}
```

**Catatan ℹ:** Kasir dipaksa memakai Outlet tugasnya; Owner boleh memilih satu Outlet aktif dalam Merchant saat membuka POS. Path berada di domain Catalog, tetapi route dipegang `InventoryModule` karena membaca tabel `inventory` (06 §3.4). Ini bukan pelanggaran boundary — hanya penempatan implementasi.

### 4.3 Endpoint internal (service-to-service)

| Mekanisme | Detail |
|---|---|
| Interface publik | `InventoryService`, `StockMovementService`, `StockReservationPort`, `OutletCatalogQueryService` (06 §3.4) |
| Port yang dikonsumsi modul lain | `StockReservationPort.reserveForSale(...)` dipanggil `sales` di dalam transaksi checkout (atomic conditional update, 05 §6.1) |
| Port yang dikonsumsi modul ini | `ProductReadPort` (catalog) untuk resolusi produk + harga efektif |

### 4.4 Data Models

#### `InventoryDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `id` | uuid | tidak | **PRIMARY KEY** |
| `merchant_id` | uuid | tidak | **FOREIGN KEY** → `merchant.merchant_id` |
| `outlet_id` | uuid | tidak | **FOREIGN KEY** → `outlet.outlet_id` |
| `product_id` | uuid | tidak | **FOREIGN KEY** → `product.product_id` |
| `quantity` | int | tidak | Stok, `>= 0`; unique `(outlet_id, product_id)` |
| `low_stock_threshold_override` | int | ya | Override threshold Product pada Outlet; `null` berarti memakai threshold dasar Product |
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
| `transaction_id` | uuid | ya | **FOREIGN KEY** → `transaction.transaction_id` (diisi untuk `SALE`) |
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

### 4.6 Diagram Alur — Adjustment Stok

1. ADMIN kirim `POST /inventory/adjustments` (`outlet_id`, `product_id`, `delta`, `reason`).
2. Validasi role + outlet/produk milik merchant; outlet harus `ACTIVE`.
3. Baca `quantity` saat ini → `quantity_before`.
4. Hitung `quantity_after = quantity_before + delta`; kalau `< 0` → `409 VALIDATION_ERROR` (batal, tanpa perubahan).
5. Update kuantitas + tulis row `stock_movement` (`type=ADJUSTMENT`).
6. Return `201` `StockMovementDto`.

**Warning ⚠:** Adjustment manual dan `SALE` memakai jalur update yang sama; kuncinya adalah conditional update agar tidak ada stok negatif bahkan saat dua request bersamaan (AT-004).

---

## 5. Modul Sales — `libs/sales`

### 5.1 Overview

| Aspek | Nilai |
|---|---|
| Base URL | `/api/v1` |
| Scope | Cart (client-side only), checkout, riwayat transaksi, receipt |
| State machine | **TransactionStatus:** hanya `COMPLETED` pada MVP. Checkout gagal menghasilkan HTTP error tanpa membuat baris Transaction. **Idempotency tidak memakai state terpisah** — dijamin oleh kolom `checkout_request_id` pada `Transaction` (unique `merchant_id + checkout_request_id`) dan `request_hash` (OD-012); tidak ada tabel `IdempotencyRecord`. |
| | **PaymentStatus:** `CONFIRMED` pada Transaction (OD-001) — tidak ada entitas Payment. |
| Aturan bisnis utama (OD-004, OD-001, FR-CHK-018, FR-PAY-003) | |
| | `total = subtotal`; diskon, pajak, service charge, tip, voucher, dan promo tidak tersedia pada MVP. |
| | `Transaction.total` adalah jumlah pembayaran manual yang dikonfirmasi untuk single-payment MVP; **tidak ada field payment amount terpisah** (FR-PAY-003). |
| | Metode bayar: `CASH` / `QRIS` / `TRANSFER` (OD-001). |
| | Harga dihitung ulang server dari **harga efektif outlet** (override `product_outlet_price` ?: `product.price`), BR-012; `expected_unit_price` hanya untuk deteksi `PRICE_CHANGED`. |
| | **Role:** checkout oleh `CASHIER` (Outlet tugasnya) dan `OWNER` (Outlet aktif yang dipilih dalam Merchant), Admin ditolak (OD-010); cart dikelola client-side, tidak ada endpoint REST cart. Lihat transaksi: `OWNER` (seluruh merchant) & `CASHIER` (hanya transaksi dirinya — OD-003); **ADMIN tidak punya akses** transaksi/receipt. |

> Endpoint checkout normatif pada Iterasi 1 adalah **`POST /checkout`**, konsisten dengan `05` §5.5.

### 5.2 Endpoint

> **Cart Iterasi 1 = client-side only.** Keranjang dikelola sepenuhnya di frontend (buat, tambah item, ubah kuantitas, hapus, kosongkan). **Tidak ada endpoint REST `/cart/*`** dan **tidak ada tabel `cart`/`cart_item` di skema** — checkout langsung menerima `items` inline; perilaku cart (FR-CART-001–004) diverifikasi sebagai UI test.

#### `POST /checkout` — **endpoint terpenting di seluruh sistem**

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `CASHIER` (Outlet tugasnya), `OWNER` (Outlet aktif yang dipilih dalam Merchant) — OD-010 |
| Idempotency | Wajib — `checkout_request_id` di body (unique `merchant_id + checkout_request_id`, OD-012) |
| Rate limit | Per user (NFR-SEC-008) |

**Request body** (FR-CHK-001–018, FR-CART-005–010, FR-PAY-001–007, BR-006–010):

| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `checkout_request_id` | string (uuid) | wajib | UUID unik client untuk replay-safety (BR-008, DR-014) |
| `outlet_id` | uuid | wajib | Outlet aktif; Kasir wajib = klaim JWT, Owner = outlet aktif dalam Merchant yang dipilih |
| `items` | array | wajib | Minimal 1 item |
| `items[].product_id` | uuid | wajib | Produk aktif |
| `items[].quantity` | int | wajib | `> 0` |
| `items[].expected_unit_price` | decimal string | opsional | Harga yang dilihat kasir; dipakai deteksi `PRICE_CHANGED` |
| `payment_method` | enum | wajib | `CASH` / `QRIS` / `TRANSFER` |

```json
{
  "checkout_request_id": "a3f5c9d2-1e4b-4a2c-9f21-client-generated-uuid",
  "outlet_id": "uuid",
  "items": [
    { "product_id": "uuid-1", "quantity": 2, "expected_unit_price": "8500.00" },
    { "product_id": "uuid-2", "quantity": 1, "expected_unit_price": "15000.00" }
  ],
  "payment_method": "CASH"
}
```

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Checkout selesai (sinkron, all-or-nothing) | `CheckoutResult` — lihat contoh di bawah |
| 400 | Validasi gagal | `VALIDATION_ERROR` |
| 403 | Bukan CASHIER/OWNER / outlet bukan tugas / outlet nonaktif / Admin ditolak | `FORBIDDEN` |
| 409 | Produk nonaktif | `PRODUCT_INACTIVE` |
| 409 | Category produk nonaktif | `CATEGORY_INACTIVE` |
| 409 | Harga server beda dengan `expected_unit_price` | `PRICE_CHANGED` |
| 409 | Stok tidak cukup | `INSUFFICIENT_STOCK` |
| 409 | `checkout_request_id` sama tapi payload beda | `IDEMPOTENCY_CONFLICT` |
| 429 | Melewati rate limit checkout | `RATE_LIMITED` |

```json
{
  "success": true, "statusCode": 200, "message": "Checkout berhasil",
  "data": {
    "transaction_id": "uuid",
    "transaction_number": "INV-2026-000123",
    "status": "COMPLETED",
    "outlet_id": "uuid",
    "operator": { "user_id": "uuid", "role": "CASHIER", "name": "Sari" },
    "items": [
      { "product_id": "uuid-1", "name": "Es Teh Manis", "unit_price": "8500.00", "quantity": 2, "subtotal": "17000.00" },
      { "product_id": "uuid-2", "name": "Nasi Goreng", "unit_price": "15000.00", "quantity": 1, "subtotal": "15000.00" }
    ],
    "subtotal": "32000.00",
    "total": "32000.00",
    "payment": { "method": "CASH", "status": "CONFIRMED", "paid_at": "2026-08-13T10:00:00+07:00" },
    "created_at": "2026-08-13T10:00:00+07:00"
  }
}
```

Contoh error:

```json
{
  "success": false, "statusCode": 409, "path": "/api/v1/checkout",
  "message": "Harga produk berubah", "timestamp": "2026-08-13T14:30:00.000Z",
  "errors": [{ "field": "items[0].product_id", "message": "current_price=9000.00" }]
}

{
  "success": false, "statusCode": 409, "path": "/api/v1/checkout",
  "message": "Stok tidak mencukupi", "timestamp": "2026-08-13T14:30:00.000Z",
  "errors": [{ "field": "items[1].product_id", "message": "stock=0, requested=1" }]
}
```

**Catatan ℹ:** Semua nilai rupiah (subtotal dan total) **dihitung server**; pada MVP `total = subtotal` dan tidak ada field payment `amount`. Nilai `expected_unit_price` dari keranjang client tidak dipakai untuk perhitungan. Replay request dengan `checkout_request_id` yang sama dan payload sama → server mengembalikan transaksi yang sudah ada (idempotent), bukan membuat transaksi baru; `request_hash` dibandingkan untuk deteksi konflik.

**Warning ⚠:** Semua error (400/403/409) menjamin **tidak ada** perubahan stok/transaksi parsial (FR-CHK-007, all-or-nothing — rollback penuh). Server **tidak pernah** menunggu reporting/AI dalam jalur ini (FR-CHK-014/015); p95 ≤ 500 ms (NFR-PERF-001).

#### `GET /transactions/status`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `CASHIER` (transaksi miliknya), `OWNER` (seluruh Merchant) — sesuai scope |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `checkout_request_id` | string | wajib | UUID checkout yang ingin dicek |

**Response** (FR-CHK-012):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Sudah selesai | Sama dengan response `POST /checkout` sukses |
| 404 | `checkout_request_id` tidak ditemukan | `NOT_FOUND` — client boleh submit ulang sebagai checkout baru (FR-CHK-003/004) |

#### `GET /transactions`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` (semua outlet merchant), `CASHIER` (hanya transaksi dirinya — OD-003). **ADMIN tidak memiliki akses.** |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `date_from`, `date_to` | datetime | opsional | Rentang waktu |
| `outlet_id` | uuid | opsional | Filter Outlet dalam Merchant untuk Owner; Kasir tetap dibatasi pada Outlet tugasnya |
| `page`, `size` | int | opsional | Paginasi |

**Response** (FR-TRX-001–002, FR-TRX-004):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `Page<TransactionSummaryDto>` — `{ transaction_id, transaction_number, outlet_id, operator_name, total, status, created_at }` |
| 403 | ADMIN / role tidak berhak | `FORBIDDEN` |

**Catatan ℹ:** Untuk CASHIER, filter `operator_user_id = actor.user_id` **dipaksa di service** (OD-003 locked), bukan diandalkan dari query — Kasir tidak bisa melihat transaksi operator lain.

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
| `transaction_number` | string | wajib | Exact match (unik per merchant) |

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
| Interface publik | `CheckoutService`, `ReceiptService` (06 §3.5) |
| Port yang dikonsumsi | `ProductReadPort` (catalog — harga efektif), `StockReservationPort` (inventory — kurangi stok), `TenantAuthorizationService` (tenant), primitif `platform` (prisma, money) |
| Async keluar | **Tidak ada** — checkout tidak menerbitkan event/outbox; Transaction `COMPLETED` menjadi sumber query reporting di jalur dashboard (FR-CHK-014/015) |
| Constraint performa | p95 ≤ 500 ms, p99 ≤ 1000 ms; jalur ini tidak pernah menunggu reporting/AI (NFR-PERF-001, FR-CHK-014/015) |

### 5.4 Data Models

#### `CheckoutRequest`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `checkout_request_id` | string | tidak | UUID client; unique `(merchant_id, checkout_request_id)` (BR-008, DR-014) |
| `outlet_id` | uuid | tidak | **FOREIGN KEY** → `outlet.outlet_id` |
| `items` | array | tidak | `CheckoutItem[]` (minimal 1) |
| `payment_method` | enum | tidak | `CASH` / `QRIS` / `TRANSFER` |

#### `CheckoutItem`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `product_id` | uuid | tidak | **FOREIGN KEY** → `product.product_id` |
| `quantity` | int | tidak | `> 0` |
| `expected_unit_price` | decimal string | ya | Deteksi `PRICE_CHANGED` saja |

#### `PaymentInfo` (atribut pada `Transaction`, OD-001)

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `method` | enum | tidak | `CASH` / `QRIS` / `TRANSFER` |
| `status` | enum | tidak | `CONFIRMED` — selalu CONFIRMED pada MVP (FR-PAY-002) |
| `paid_at` | datetime | tidak | Waktu checkout commit; tidak ada field amount terpisah (FR-PAY-003) |

#### `CheckoutResult` (detail transaksi)

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `transaction_id` | uuid | tidak | **PRIMARY KEY** |
| `merchant_id` | uuid | tidak | **FOREIGN KEY** → `merchant.merchant_id` |
| `outlet_id` | uuid | tidak | **FOREIGN KEY** → `outlet.outlet_id` |
| `operator_user_id` | uuid | tidak | **FOREIGN KEY** → `user.user_id`; operator Kasir atau Owner (ERD 05b) |
| `transaction_number` | string | tidak | Unique per merchant (DR-003) |
| `status` | enum | tidak | `COMPLETED` |
| `subtotal` | decimal string | tidak | Jumlah `unit_price × quantity` |
| `total` | decimal string | tidak | Sama dengan `subtotal` pada MVP (DR-013) |
| `items` | array | tidak | `TransactionItemDto[]` (snapshot nama + harga) |
| `payment` | `PaymentInfo` | tidak | Metode + status + `paid_at` |
| `operator` | object | tidak | `{ user_id, role, name }` |
| `created_at` | datetime | tidak | Waktu transaksi |

#### `TransactionItemDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `product_id` | uuid | tidak | **FOREIGN KEY** → `product.product_id` |
| `name` | string | tidak | Snapshot `product_name_snapshot` (BR-006) |
| `unit_price` | decimal string | tidak | Snapshot `unit_price_snapshot` |
| `quantity` | int | tidak | Kuantitas |
| `subtotal` | decimal string | tidak | `unit_price × quantity` |

#### `TransactionSummaryDto`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `transaction_id` | uuid | tidak | **PRIMARY KEY** |
| `transaction_number` | string | tidak | Unique per merchant |
| `outlet_id` | uuid | tidak | **FOREIGN KEY** |
| `operator_name` | string | tidak | Nama operator (Kasir/Owner) |
| `total` | decimal string | tidak | Total transaksi |
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
- **Sebagai Provider:** `CheckoutService`, `ReceiptService` diekspos ke `apps/api` (frontend).
- **Sebagai Publisher:** tidak ada — modul sales tidak menerbitkan event apa pun (FR-CHK-014/015).

### 5.6 Diagram Alur — Checkout

1. CASHIER/OWNER kirim `POST /checkout` dengan `checkout_request_id`, `items`, dan `payment_method`.
2. `@Roles(CASHIER, OWNER)`; validasi scope: Kasir → `outlet_id` wajib = klaim JWT; Owner → `outlet_id` outlet aktif dalam Merchant (OD-010). Admin ditolak.
3. Normalisasi item (gabungkan Product sama lalu urutkan `product_id`) dan hitung `request_hash = sha256(canonical_json(merchant_id, outlet_id, operator_user_id, items, payment_method))` (FR-CHK-002).
4. Buka transaksi DB (`ReadCommitted`).
5. **Idempotency guard** (BR-008/009, DR-014, FR-CHK-003/004):
   - Transaction dengan `merchant_id + checkout_request_id` sama sudah ada & `request_hash` sama → kembalikan receipt yang tersimpan (replay, tanpa checkout baru).
   - Sudah ada & `request_hash` beda → `409 IDEMPOTENCY_CONFLICT`.
   - Pada submit bersamaan, hanya satu `create` commit; yang lain kena unique violation → baca ulang Transaction, bandingkan `request_hash`, kembalikan hasil yang sama.
6. Validasi produk aktif + harga efektif outlet via `ProductReadPort`; `expected_unit_price` beda → `409 PRICE_CHANGED`.
7. Hitung `total = subtotal` (OD-004, DR-013).
8. **Kurangi stok** via `StockReservationPort` — conditional atomic update per line; ada baris gagal → `409 INSUFFICIENT_STOCK`; tulis `stock_movement` `type=SALE` dengan `transaction_id`.
9. Insert `transaction` (`operator_user_id`, atribut pembayaran `payment_method`/`payment_status=CONFIRMED`/`paid_at`) + `transaction_item` (snapshot). Tidak ada tabel Payment terpisah (OD-001).
10. Commit → return `200 CheckoutResult`. Tidak ada outbox/event (FR-CHK-014/015).
11. Gagal di langkah mana pun → rollback penuh; tidak ada stok/transaksi parsial.

**Warning ⚠ (edge cases):**
- **Race condition stok terakhir (AT-004):** dua kasir memesan sisa stok bersamaan → tepat satu sukses berkat conditional update `quantity >= x`; yang lain dapat `INSUFFICIENT_STOCK`.
- **Replay setelah timeout:** client tidak menerima respons tapi transaksi sudah commit → retry dengan `checkout_request_id` sama → server mengembalikan transaksi yang sama (idempotent), bukan duplikat.
- **Hasil tidak pasti:** tidak ada state `PROCESSING`/ambiguitas terpisah — hasil hanya "transaksi ada" (200, lookup `GET /transactions/status`) atau "belum ada" (404, boleh submit ulang) (FR-CHK-003).
- **Worker lambat:** reporting/insight **tidak** bergantung pada checkout dan sebaliknya; checkout tidak pernah menunggu ataupun menulis untuk reporting (FR-CHK-014/015).

---

## 6. Modul Reporting — `libs/reporting`

### 6.1 Overview

| Aspek | Nilai |
|---|---|
| Base URL | `/api/v1` |
| Scope | Dashboard bisnis Owner membaca hasil **agregasi cache-aside** (Redis) dari fakta `Transaction` `COMPLETED` melalui `SalesReportingReadPort`; implementasi port membaca read replica. Dashboard operasional Admin dan low-stock membaca current state melalui read port Catalog/Inventory. Tidak ada route dashboard yang query tabel `transaction` secara langsung dari jalur request — agregasi hanya berjalan saat cache miss di `ReportingCacheService`. |
| State machine | **Freshness:** `FRESH` / `STALE` (flag di body, bukan HTTP error) — bukan state machine entitas |
| Aturan bisnis utama | |
| | 1. **Role:** endpoint bisnis (`summary`, sales-trend, aov-trend, time-pattern, top-products, outlet-comparison) hanya `OWNER`. `operations` dapat dibaca `ADMIN` dan `OWNER`; `low-stock` dapat dibaca `OWNER` sebagai inventory read-only dan `ADMIN` sebagai fungsi operasional. ADMIN **tidak** melihat omzet, AOV, transaksi, analytics bisnis, atau insight BI. |
| | 2. Rentang tanggal & scope outlet dibatasi merchant/periode sesuai role (FR-REP-009). |
| | 3. Data bisnis Owner dibangun **on-demand** lewat cache-aside: cache hit (umur ≤30 menit) mengembalikan agregat; cache miss meminta fakta `Transaction` `COMPLETED` melalui `SalesReportingReadPort` (bounded + single-flight), lalu menyimpan hasil bersama `data_updated_at`. Implementasi port membaca read replica. Checkout **tidak** membangun/menginvalidasi cache (FR-REP-002); tanpa outbox maupun projection persisten (DG-005). |
| | 4. Bucketing waktu mengikuti `merchant.timezone` (BR-018). |

### 6.2 Endpoint

**Konvensi query dan metadata dashboard:** seluruh endpoint dashboard menggunakan `merchant.timezone`. Untuk endpoint bisnis Owner, `date_from` dan `date_to` wajib, rentang inklusif maksimum 366 hari, dan `bucket`—bila tersedia—hanya `HOUR` atau `DAY`. `limit`—bila tersedia—bernilai 1–100 (default 10). Semua respons dashboard menyertakan `DashboardMeta`: `data_updated_at`, `freshness_status`, dan `timezone`. Endpoint bisnis Owner menambahkan `period_start` dan `period_end`; endpoint current-state (`operations`, `low-stock`) tidak memiliki periode. `freshness_status` bernilai `FRESH` untuk pembacaan current-state yang berhasil dan `FRESH`/`STALE` untuk hasil cache-aside.

#### `GET /dashboard/summary`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `date_from`, `date_to` | datetime | wajib | Rentang inklusif maksimum 366 hari |
| `outlet_id` | uuid | opsional | Filter Outlet dalam Merchant Owner; tanpa filter menampilkan agregat seluruh Merchant |

**Response** (FR-REP-001–004):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ omzet, transaction_count, average_transaction_value, data_updated_at, freshness_status, timezone, period_start, period_end }` |
| 400 | Rentang invalid / `date_from > date_to` | `VALIDATION_ERROR` |
| 403 | Role tidak berhak | `FORBIDDEN` |

```json
{
  "success": true, "statusCode": 200, "message": "Ringkasan dashboard",
  "data": {
    "omzet": "4500000.00", "transaction_count": 128, "average_transaction_value": "35156.25",
    "data_updated_at": "2026-08-13T09:55:00+07:00", "freshness_status": "FRESH", "timezone": "Asia/Jakarta",
    "period_start": "2026-08-01T00:00:00+07:00", "period_end": "2026-08-13T23:59:59+07:00"
  }
}
```

**Warning ⚠:** `freshness_status: "STALE"` (data melewati ambang umur cache, agregat terakhir tetap ditampilkan) tetap HTTP 200 — dashboard tidak boleh error hanya karena cache tertinggal/expire.

#### `GET /dashboard/operations`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `ADMIN`, `OWNER` |

**Parameter query:** `outlet_id` opsional sebagai filter Outlet dalam Merchant.

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ inventory_item_count, low_stock_item_count, out_of_stock_item_count, active_product_count, inactive_product_count, inactive_category_count, outlet_id, data_updated_at, freshness_status, timezone }` |
| 403 | Bukan ADMIN/OWNER | `FORBIDDEN` |

Endpoint ini tidak mengembalikan omzet, AOV, jumlah/nilai transaksi, analytics bisnis, atau insight BI.

#### `GET /dashboard/sales-trend`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Parameter query:**

| Parameter | Type | Wajib | Deskripsi |
|---|---|---|---|
| `date_from`, `date_to` | datetime | wajib | Rentang inklusif maksimum 366 hari |
| `bucket` | enum | opsional | `HOUR` / `DAY` (default `DAY`) |
| `outlet_id` | uuid | opsional | Filter outlet |

**Response** (FR-REP-003A):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ bucket, points: [{ bucket_start, omzet, transaction_count }], data_updated_at, freshness_status, timezone, period_start, period_end }` |
| 400 | Validasi | `VALIDATION_ERROR` |
| 403 | Bukan OWNER | `FORBIDDEN` |

#### `GET /dashboard/aov-trend`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Parameter query:** `date_from`, `date_to` wajib dengan rentang inklusif maksimum 366 hari; `bucket` opsional `HOUR`/`DAY` (default `DAY`); `outlet_id` opsional.

**Response** (FR-REP-003A):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ bucket, points: [{ bucket_start, average_transaction_value }], data_updated_at, freshness_status, timezone, period_start, period_end }` |
| 400 | Validasi | `VALIDATION_ERROR` |
| 403 | Bukan OWNER | `FORBIDDEN` |

#### `GET /dashboard/time-pattern`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Parameter query:** `date_from`, `date_to` wajib dengan rentang inklusif maksimum 366 hari; `outlet_id` opsional.

**Response** (FR-REP-003C):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ points: [{ hour_of_day, omzet, transaction_count }], data_updated_at, freshness_status, timezone, period_start, period_end }` |
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
| `date_from`, `date_to` | datetime | wajib | Rentang inklusif maksimum 366 hari |
| `limit` | int | opsional | 1–100; default 10 |
| `outlet_id` | uuid | opsional | Filter outlet |

**Response** (FR-REP-003B):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ top_selling: [{ product_id, name, units_sold, omzet }], least_selling: [...], data_updated_at, freshness_status, timezone, period_start, period_end }` |
| 400 | Validasi | `VALIDATION_ERROR` |
| 403 | Bukan OWNER | `FORBIDDEN` |

#### `GET /dashboard/outlet-comparison`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Parameter query:** `date_from`, `date_to` wajib dengan rentang inklusif maksimum 366 hari.

**Response** (FR-REP-003):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ items: [{ outlet_id, outlet_name, omzet, transaction_count }], data_updated_at, freshness_status, timezone, period_start, period_end }` |
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
| `outlet_id` | uuid | opsional | Filter Outlet dalam Merchant untuk Owner/Admin; tanpa filter menampilkan seluruh Outlet dalam Merchant |

**Response** (FR-INV-007):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil | `{ items: [{ product_id, name, outlet_id, outlet_name, quantity, base_low_stock_threshold, low_stock_threshold_override, effective_low_stock_threshold }], data_updated_at, freshness_status, timezone }` |
| 403 | Role tidak berhak | `FORBIDDEN` |

### 6.3 Endpoint internal (service-to-service)

| Mekanisme | Detail |
|---|---|
| Interface publik | `DashboardQueryService` (api), `ReportingCacheService`, `ReportingReadPort` (06 §3.6) |
| Sumber data | `ReportingCacheService` cache-aside (Redis, TTL 30 menit) + agregasi fakta `Transaction` `COMPLETED` via `SalesReportingReadPort` saat miss (bounded, single-flight, FR-REP-008/009). Implementasi port membaca read replica. |
| Port yang dikonsumsi modul lain | `ReportingReadPort` dipakai modul `insight` (dataset cache-aside atau agregasi bounded saat miss, bukan tabel mentah) |
| Dependency | Query bisnis memakai `SalesReportingReadPort` dan `ReportingCacheService`; Reporting tidak membaca tabel Sales, Inventory, atau Catalog secara langsung. Route `operations`/`low-stock` memakai interface read-only Catalog/Inventory melalui application/API layer, bukan akses silang tabel. |

### 6.4 Data Models

#### `DashboardMeta`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `data_updated_at` | datetime | tidak | Waktu aggregate cache dibangun atau current-state dibaca. |
| `freshness_status` | enum | tidak | `FRESH` / `STALE`; current-state yang berhasil dibaca langsung berstatus `FRESH`. |
| `timezone` | string | tidak | Zona waktu Merchant yang dipakai untuk menafsirkan waktu dan periode. |
| `period_start` | datetime | ya | Wajib pada dashboard bisnis Owner; kosong untuk endpoint current-state. |
| `period_end` | datetime | ya | Wajib pada dashboard bisnis Owner; kosong untuk endpoint current-state. |

#### `DashboardSummary`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `omzet` | decimal string | tidak | Total nilai transaksi `COMPLETED` pada periode |
| `transaction_count` | int | tidak | Jumlah transaksi |
| `average_transaction_value` | decimal string | tidak | Rata-rata nilai transaksi |
| `data_updated_at` | datetime | tidak | Bagian dari `DashboardMeta` |
| `freshness_status` | enum | tidak | Bagian dari `DashboardMeta` |
| `timezone` | string | tidak | Bagian dari `DashboardMeta` |
| `period_start` | datetime | tidak | Bagian dari `DashboardMeta`; awal periode (timezone merchant) |
| `period_end` | datetime | tidak | Bagian dari `DashboardMeta`; akhir periode |

#### `TrendPoint`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `bucket_start` | datetime | tidak | Awal bucket |
| `omzet` | decimal string | tidak | Omzet bucket |
| `transaction_count` | int | tidak | Jumlah transaksi bucket |
| `average_transaction_value` | decimal string | ya | Hanya untuk aov-trend |

#### `TimePatternPoint`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `hour_of_day` | int | tidak | Jam (0–23) sesuai timezone merchant |
| `omzet` | decimal string | tidak | Omzet jam tersebut |
| `transaction_count` | int | tidak | Jumlah transaksi |

#### `TopProductsResult`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `top_selling` | array | tidak | `{ product_id, name, units_sold, omzet }` |
| `least_selling` | array | tidak | Bentuk sama |

#### `OutletComparisonItem`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `outlet_id` | uuid | tidak | **FOREIGN KEY** → `outlet.outlet_id` |
| `outlet_name` | string | tidak | Nama outlet |
| `omzet` | decimal string | tidak | Omzet outlet |
| `transaction_count` | int | tidak | Jumlah transaksi |

#### `LowStockItem`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `product_id` | uuid | tidak | **FOREIGN KEY** |
| `name` | string | tidak | Nama produk |
| `outlet_id` | uuid | tidak | **FOREIGN KEY** |
| `outlet_name` | string | tidak | Nama outlet |
| `quantity` | int | tidak | Stok saat ini |
| `base_low_stock_threshold` | int | tidak | Threshold dasar Product |
| `low_stock_threshold_override` | int | ya | Override Product–Outlet; `null` bila tidak ada |
| `effective_low_stock_threshold` | int | tidak | Override bila ada, jika tidak threshold dasar Product |

### 6.5 Keterkaitan dengan Modul Lain

- **Sebagai Orchestrator:** memakai `SalesReportingReadPort` untuk fakta transaksi dan primitif `platform` (`ReportingCacheService`); tidak mengonsumsi event apa pun.
- **Sebagai Provider:** `ReportingReadPort` dikonsumsi modul `insight` (dataset hasil agregasi, bukan tabel mentah).

### 6.6 Diagram Alur — Agregasi Cache-aside (dashboard)

1. Request `GET /dashboard/*` masuk; `DashboardQueryService` menormalkan key (merchant, outlet nullable, periode, bucket, limit, timezone, versi schema cache — FR-REP-009).
2. `ReportingCacheService` cek cache Redis (TTL 30 menit). Cache hit → return agregat + `data_updated_at` + `freshness_status`.
3. Cache miss → single-flight per key (mencegah banyak agregasi identik, FR-REP-008).
4. Ambil fakta `Transaction` `COMPLETED` secara bounded melalui `SalesReportingReadPort` sesuai scope & bucket; implementasi port membaca read replica (FR-REP-001).
5. Simpan hasil ke cache bersama `data_updated_at`; hitung `freshness_status` dari umur data vs ambang (FR-OPS-003) → `FRESH`/`STALE`.
6. Checkout **tidak** membangun/menginvalidasi cache; cache dapat dibangun ulang kapan saja dan bukan source of truth (FR-REP-002, DG-005).

**Warning ⚠:** Agregasi idempotent dan bounded (FR-REP-008) karena cache bisa expire/rebuild; `freshness_status` tetap mengembalikan data terakhir saat `STALE` agar dashboard tidak error (FR-REP-004).

---

## 7. Modul Insight (BI) — `libs/insight`

### 7.1 Overview

| Aspek | Nilai |
|---|---|
| Base URL | `/api/v1` |
| Scope | Fitur "AI Insight" sebagai **Business Intelligence (BI)** — menghasilkan beberapa tipe insight analitik (bukan satu tipe) dengan LLM melalui `AiProviderPort` sebagai mesin pengerja-penjelas. |
| State machine | **InsightStatus:** `READY` | `STALE` — hanya untuk hasil `AiInsight` yang sudah lengkap. |
| | **AiAnalysisJob state:** `PENDING` → `PROCESSING` → `READY` | `RETRY_SCHEDULED` → `FAILED` (retry + backoff + batas attempt); satu job per `(merchant_id, analysis_date)` (FR-AI-006/007) — bukan `JobRecord` generik. |
| Aturan bisnis utama | |
| | 1. **OWNER only** untuk trigger dan baca (FR-AI-012). |
| | 2. Maksimal **1 analisis per Merchant per hari** (`merchant_id + analysis_date` lokal Merchant); satu analisis dapat menghasilkan atau memperbarui beberapa tipe insight sekaligus sesuai data (FR-AI-012). |
| | 3. Tipe: `SALES_TREND`, `OUTLET_COMPARISON`, `TOP_PRODUCTS`, `TIME_PATTERN`, `AOV_TREND`. |
| | 4. `GET /insights` mengembalikan **status `AiAnalysisJob` terbaru** serta hasil terbaru per tipe (tanpa histori per tipe, OD-007). |
| | 5. Output berbasis **evidence terstruktur** (data angka dari hasil agregasi reporting), bukan teks generatif bebas (FR-AI-004/005). |
| | 6. Modul baca hanya dari `ReportingReadPort` (dataset cache-aside atau agregasi bounded saat miss), bukan tabel transaksi mentah (05 §3). |

### 7.2 Endpoint

#### `POST /insights/trigger`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Request body:** tidak ada. Trigger selalu menganalisis seluruh Merchant pada 30 hari kalender lokal yang berakhir pada tanggal lokal trigger.

**Response:**

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 202 | Trigger pertama pada tanggal lokal Merchant; job dibuat secara async | `{ job_id, status: "PENDING" }` |
| 200 | Trigger ulang pada tanggal lokal Merchant yang sama; tidak membuat job baru | `{ job_id, status }` dari `AiAnalysisJob` yang sudah ada |
| 403 | Bukan OWNER | `FORBIDDEN` |

```json
{ "success": true, "statusCode": 202, "message": "Analisis insight dijadwalkan", "data": { "job_id": "uuid", "status": "PENDING" } }
```

**Catatan ℹ:** Eksekusi dijalankan `apps/worker` (polling `AiAnalysisJob` via `@nestjs/schedule`); client menunggu hasil via `GET /insights`. Dedupe key adalah `merchant_id + tanggal lokal Merchant` berdasarkan `merchant.timezone` (unique `(merchant_id, analysis_date)`, FR-AI-007). Worker selalu menurunkan periode Merchant-wide 30 hari lokal dari `analysis_date`; trigger berikutnya pada hari yang sama mengembalikan job yang sama. Tipe insight dan versi data tidak menjadi bagian dedupe key.

#### `GET /insights`

| Properti | Nilai |
|---|---|
| Authentication | Bearer token |
| Required Roles | `OWNER` |

**Response** (FR-AI-004–005, FR-AI-008):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Berhasil atau analisis sedang berjalan | `{ analysis_job, insights: [ InsightResult ] }` — status proses dan hasil terbaru per tipe |
| 404 | Merchant belum pernah memicu analisis | `NOT_FOUND` |

```json
{
  "success": true, "statusCode": 200, "message": "Insight terbaru per tipe",
  "data": {
    "analysis_job": {
      "id": "uuid", "status": "READY", "analysis_date": "2026-08-13",
      "updated_at": "2026-08-13T10:02:00+07:00"
    },
    "insights": [
      {
        "id": "uuid", "type": "SALES_TREND", "status": "READY",
        "title": "Penjualan naik 18% dibanding periode sebelumnya",
        "content": "Omzet periode ini Rp4.500.000 dibanding Rp3.813.000 periode sebelumnya.",
        "evidence_summary": { "current_omzet": "4500000.00", "previous_omzet": "3813000.00", "delta_percent": 18.0 },
        "period_start": "2026-08-01T00:00:00+07:00", "period_end": "2026-08-13T23:59:59+07:00",
        "generated_at": "2026-08-13T10:02:00+07:00"
      }
    ]
  }
}
```

**Catatan ℹ:** `analysis_job` adalah job Merchant terbaru berdasarkan `analysis_date` (lalu `updated_at` bila diperlukan). Setelah Owner memicu analisis, endpoint ini selalu mengembalikannya, bahkan bila belum ada hasil insight. `PENDING`, `PROCESSING`, `RETRY_SCHEDULED`, dan `FAILED` berasal dari job; `AiInsight` hanya berisi hasil lengkap berstatus `READY` atau `STALE`. Merchant yang belum pernah memicu analisis tetap menerima `404`. Insight job gagal tidak membuat dashboard error (flag di body, `INSIGHT_UNAVAILABLE`).

### 7.3 Endpoint internal (service-to-service)

| Mekanisme | Detail |
|---|---|
| Interface publik | `InsightTriggerService`, `InsightGenerationJob`, `InsightQueryService`, `AiAnalysisJobService`, `AiProviderPort` (06 §3.7) |
| Port yang dikonsumsi | `ReportingReadPort` (reporting), `PrismaWriteService` (platform — state `AiAnalysisJob`), primitif `platform` |
| Job internal | `AiAnalysisJob` dijalankan `apps/worker` (retry/backoff pada state job, `@nestjs/schedule` polling) |
| Adapter | `LlmInsightAdapter` melalui `AiProviderPort` (DG-006, EXT-AI-003); dataset tetap berasal dari `ReportingReadPort`. |

### 7.4 Data Models

#### `InsightResult`

| Field | Type | Nullable | Keterangan |
|---|---|---|---|
| `id` | uuid | tidak | **PRIMARY KEY** |
| `merchant_id` | uuid | tidak | **FOREIGN KEY** → `merchant.merchant_id` |
| `type` | enum | tidak | Tipe BI |
| `period_start` | datetime | tidak | Rentang |
| `period_end` | datetime | tidak | Rentang |
| `data_version` | string | tidak | Versi data agregasi reporting yang dipakai |
| `title` | string | tidak | Judul insight |
| `content` | text | tidak | Penjelasan hasil insight lengkap |
| `evidence_summary` | json | tidak | Data terstruktur (FR-AI-004/005) |
| `status` | enum | tidak | `READY` / `STALE`; status proses dibaca dari `AiAnalysisJob` |
| `generated_at` | datetime | tidak | Waktu selesai generate |

### 7.5 Keterkaitan dengan Modul Lain

- **Sebagai Orchestrator:** `insight` memakai `ReportingReadPort` (reporting), `PrismaWriteService` (platform — state `AiAnalysisJob`), dan memicu `AiProviderPort` (adapter).
- **Sebagai Provider:** interface `InsightTriggerService`/`InsightQueryService` diekspos ke `apps/api`; `AiProviderPort` adalah batas implementasi LLM provider.

### 7.6 Diagram Alur — Generate Insight

1. OWNER kirim `POST /insights/trigger` tanpa body; validasi kuota 1x/hari/Merchant.
2. Bentuk dedupe key dari `merchant_id + tanggal lokal Merchant` berdasarkan `merchant.timezone`; tipe insight dan versi data tidak termasuk dalam key. Periode 30 hari Merchant-wide diturunkan dari `analysis_date` saat Worker menjalankan job.
3. Jika key belum ada, buat satu `AiAnalysisJob` (`status=PENDING`) dan return `202`; jika sudah ada, return `200` dengan `job_id` serta status job yang sama tanpa membuat job baru.
4. Worker (`AiAnalysisJobService.@Cron`) mengklaim satu job due secara atomik (`PENDING` tanpa retry time atau `RETRY_SCHEDULED` yang sudah due) lalu mengubahnya menjadi `PROCESSING`; Worker lain melewati job yang sudah diklaim.
5. Baca dataset Merchant-wide via `ReportingReadPort` (cache-aside atau agregasi bounded saat miss, periode 30 hari hasil turunan).
6. `AiProviderPort.generate(...)` memanggil LLM dengan dataset reporting; hasil tiap tipe yang datanya mencukupi tetap menyertakan `evidence_summary` terstruktur.
7. Upsert hasil per tipe → `status=READY`, `generated_at`, `data_version`.
8. Gagal → `RETRY_SCHEDULED` dengan backoff; melewati batas → `FAILED`; data lama boleh ditandai `STALE`.

**Warning ⚠:** Insight selalu dibaca dari hasil agregasi reporting (bisa `STALE`); jangan pernah query tabel transaksi langsung. LLM provider memakai timeout + circuit breaker (`cockatiel`) agar worker tidak tersumbat (EXT-AI-003).

---

## 8. Modul Platform (shared) — `libs/platform`

### 8.1 Overview

| Aspek | Nilai |
|---|---|
| Base URL | `/api/v1` |
| Scope | Infrastruktur bersama: error handler, guards, money, prisma, cache (Redis), pagination, observability |
| State machine | Tidak ada state machine bisnis |
| Aturan bisnis utama | |
| | 1. Bukan modul bisnis — tidak boleh menampung logika bisnis (06 §1, poin 6). |
| | 2. Semua response error global diformat di sini (katalog §0.1). |
| | 3. Observability wajib: `/metrics` di-scrape **Prometheus**, visualisasi **Grafana** (NFR-OBS-002). |

### 8.2 Endpoint (non-bisnis, operasional)

#### `GET /health`

| Properti | Nilai |
|---|---|
| Authentication | Publik (atau dibatasi internal network di Railway) |
| Required Roles | — |

**Response** (FR-OPS-001):

| Status | Kondisi | Body (key fields) |
|---|---|---|
| 200 | Sehat | `{ status: "ok", database: "ok", worker_backlog: { ai_job_pending } }` |
| 503 | Database/dependency tidak sehat | `DEPENDENCY_UNAVAILABLE` |

```json
{ "success": true, "statusCode": 200, "message": "Sistem sehat", "data": { "status": "ok", "database": "ok", "worker_backlog": { "ai_job_pending": 0 } } }
```

### 8.3 Endpoint internal (service-to-service)

Tidak ada endpoint internal. Platform menyediakan primitif in-process yang dipakai semua modul:

| Primitif | Dipakai oleh |
|---|---|
| `PrismaWriteService` / `PrismaReadService` | semua modul (write: primary, read: read replica) |
| `ReportingCacheService` / single-flight | `reporting` (cache-aside Redis) |
| `Money` helper | `catalog`, `inventory`, `sales`, `reporting` |
| `PageRequestDto` / `PageResponseDto<T>` | semua modul dengan list |
| `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()`, `CorrelationIdMiddleware` | semua modul |
| `AllExceptionsFilter`, `ErrorCode` | semua modul |

### 8.4 Data Models

Tidak ada entitas bisnis yang dimiliki platform. Objek bersama: `PageResponseDto`, `ApiError` (mengimplementasikan **envelope error** §0).

### 8.5 Keterkaitan dengan Modul Lain

- **Sebagai Orchestrator:** tidak ada.
- **Sebagai Provider:** seluruh modul bisnis bergantung pada `platform` (06 §4). Endpoint `GET /health` dan `GET /metrics` untuk operasional/observability.

### 8.6 Diagram Alur — Healthcheck

1. Monitor/CI memanggil `GET /health`.
2. Server cek koneksi `PrismaWriteService` (primary) + baca backlog `AiAnalysisJob` (job AI).
3. Semua sehat → `200 { status: "ok", ... }`; ada koneksi gagal → `503 DEPENDENCY_UNAVAILABLE`.

**Warning ⚠:** `GET /health` tidak boleh mengandalkan read replica (bisa lag); healthcheck inti hanya primary + proses worker. `/metrics` dipakai Prometheus untuk alert (mis. backlog AI > 5 menit, p95 latensi).

---

## 9. Traceability ringkas

| Area endpoint | Requirement utama |
|---|---|
| `/auth/*`, `/staff/*` | FR-AUTH-001–014, FR-TEN-001–008 |
| `/merchant`, `/outlets/*` | FR-TEN-004, FR-TEN-010 |
| `/categories/*`, `/products/*` | FR-CAT-001–012, BR-012, BR-019, OD-002 |
| `/inventory/*`, `/products/catalog` | FR-INV-001–008, termasuk FR-INV-007A, FR-CAT-006/011–012 |
| `/checkout`, `/transactions/*`, `/receipts/*` | FR-CART-001–010, FR-CHK-001–018, FR-PAY-001–008, FR-TRX-001–007, BR-001–014, OD-003/004/010, NFR-PERF-001 |
| `/dashboard/*` | FR-REP-001–010, FR-INV-007 |
| `/insights/*` | FR-AI-001–012, OD-007 |
| `/health`, `/metrics` | FR-OPS-001–006, NFR-OBS-001–005 |

> Setiap endpoint wajib memiliki minimal 1 acceptance test yang menautkan langsung ke ID requirement tersebut (lihat `AT-*` di SRS §17.2) sebelum dianggap "Done" (SRS §21 Definition of Done).
