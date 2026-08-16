# Iterasi 1 — Library & Dependency per Modul (NestJS Modular Monolith)

**Version:** 1.0.0
**Last Updated:** Agustus 2026

> Dokumen ini **melengkapi** `05-iterasi-1-build-plan-nestjs.md` §1 (tech stack) dan §7 (boundary), serta `07-iterasi-1-api-contract.md` (kontrak API) — khusus mendokumentasikan **library/dependency, boundary, dan interface publik setiap modul** secara eksplisit.
>
> Sumber kebenaran requirement tetap di `01`–`04`. Bila ada perbedaan detail, dokumen `05`/`06`/`07` yang lebih detail berlaku sebagai acuan implementasi.
>
> **Status versi library:** seluruh nilai kolom Versi telah diisi dari root `package.json` (bootstrap Iterasi 1). Dua library yang direncanakan untuk `ReportingCacheService` — `@nestjs/cache-manager` (dengan store Redis) dan `ioredis` — **belum terpasang** di package.json dan wajib diinstal saat implementasi cache (lihat §3.0 dan §3.6.1). Nama library, peran, dan penempatannya per modul **diturunkan dari `05` §1 dan `07`**.
>
> **Cakupan:** backend saja (8 modul `libs/*` + 2 deployable `apps/api`, `apps/worker`). Frontend (React/Vite) tidak dibahas.

---

## Daftar Isi

1. [Overview](#1-overview)
2. [Shared/Common Dependencies](#2-sharedcommon-dependencies)
3. [Dependency per Modul](#3-dependency-per-modul)
4. [Cross-Module Communication Matrix](#4-cross-module-communication-matrix)
5. [Kontrak Port Antar Modul](#5-kontrak-port-antar-modul)
6. [Dependency Graph](#6-dependency-graph)
7. [Versioning & Update Policy](#7-versioning--update-policy)

---

## 1. Overview

### 1.1 Arsitektur modular monolith

- Satu codebase **Nest monorepo** yang menghasilkan **2 deployable**: `apps/api` (HTTP, melayani checkout/CRUD) dan `apps/worker` (proses terpisah khusus **pekerjaan AI** — polling `AiAnalysisJob`) — 05 §0.
- Setiap **bounded context bisnis** menjadi `libs/*` tersendiri: `platform`, `identity`, `tenant`, `catalog`, `inventory`, `sales`, `reporting`, dan `insight` (05 §2).
- Satu database **PostgreSQL (Neon)** dengan **2 datasource**: primary (write path: identity, tenant, catalog, inventory, sales, ai job) dan read replica (reporting aggregation, insight dataset) — diakses lewat Prisma (05 §1).
- Modul dibatasi per bounded context supaya tiap modul bisa diekstrak menjadi service sendiri nanti tanpa refactor besar (roadmap 05 §10).

### 1.2 Prinsip boundary antar modul

1. **Barrel-only import.** Modul lain hanya boleh `import { CheckoutService } from '@app/sales'` (path alias ke `libs/sales/src/index.ts`), **tidak pernah** ke file internal (`05` §2).
2. **Interface-first, bukan implementasi.** Pemanggil lintas modul hanya melihat nama interface (mis. `ProductReadPort`, `StockReservationPort`); implementasi konkret (`*repository.ts`/`*service.ts` di `infrastructure/`) dilarang diimpor. Anti-corruption: interface tidak pernah membocorkan entitas Prisma modul lain (§1.2).
3. **Anti-corruption boundary.** Modul lain **tidak boleh query tabel modul lain** secara langsung; read lintas modul hanya lewat port yang diekspos pemilik data (`05` §3).
4. **Shared kernel tunggal.** Satu-satunya shared kernel yang boleh dipakai semua modul adalah **`libs/platform`** — primitif infrastruktur (Prisma, cache, money, pagination, security, error, observability). Platform bukan tempat logic bisnis (§3.0).
5. **Komunikasi antar modul** dilakukan dengan 1 mekanisme terstruktur (bukan import bebas):
   - **direct method call** lewat interface publik (in-process) — untuk jalur sinkron yang memang wajib (mis. checkout → harga/stok);
   - Jalur async satu-satunya pada Iterasi 1 adalah pekerjaan AI: `AiAnalysisJob` (tabel DB) di-polling `apps/worker`. Tidak ada outbox/RabbitMQ/BullMQ pada Iterasi 1 (`05` §0); mekanisme queue/broker akan **dipertimbangkan untuk iterasi berikutnya** bila kebutuhan async lintas modul bertambah.
6. **Penegakan otomatis:** `dependency-cruiser` di CI membuat build gagal bila ada modul yang melanggar batas (05 §7, 06 §6).

### 1.3 Strategi dependency management

- **Satu build tool:** npm workspaces + Nest monorepo. Satu root `package.json` + `lockfile` sebagai sumber kebenaran versi shared dependency (06 §7).
- **Target split-readiness:** tiap `libs/*` siap memiliki `package.json` sendiri (didukung mode monorepo Nest), sehingga dependency list tiap modul **eksplisit dan bisa di-split** tanpa memilah shared/global secara manual.
- **Aturan dasar:**
  - library lintas modul (framework, ORM, observability, testing) → deklarasi di root, versi tunggal;
  - library khusus modul (mis. `argon2` untuk identity, `axios`/`cockatiel` untuk insight) → tetap di root `package.json` pada Iterasi 1 (satu lockfile); menjadi deklarasi per modul saat target split-readiness tercapai (§1.3);
  - boundary ditegakkan oleh `dependency-cruiser` agar update dependency tidak pernah menembus batas modul.
- **CI gate:** eslint → `prisma validate` → jest → `dependency-cruiser` → build → deploy (05 §1).

---

## 2. Shared/Common Dependencies

Library berikut dipakai **lintas modul** dan dideklarasikan di root workspace dengan versi tunggal.

| Nama Library | Versi | Fungsi | Alasan Pemilihan |
|---|---|---|---|
| `@nestjs/common` | ^11.0.1 | DI, decorator, guard, pipe, exception filter | Framework inti; seluruh modul `libs/*` dan `apps/*` berdiri di atasnya |
| `@nestjs/core` | ^11.0.1 | Runtime/container Nest | Fondasi aplikasi Nest |
| `@nestjs/platform-express` | ^11.0.1 | Adapter HTTP (dipakai `apps/api`) | Server HTTP default Nest, ekosistem luas |
| `@nestjs/swagger` + `swagger-ui-express` | ^11.4.6 + ^5.0.1 | Generasi OpenAPI + UI docs (API-007) | Dokumentasi kontrak API otomatis dari decorator (05 §1) |
| `class-validator` | ^0.15.1 | Validasi DTO/body di seluruh modul | Backend sebagai validator final (NFR-MNT-002) lewat global `ValidationPipe` (05 §1) |
| `class-transformer` | ^0.5.1 | Transform/typing DTO, konversi tipe body | Pasangan `class-validator`; dipakai global |
| `@nestjs/jwt` | ^11.0.2 | Signing & verifikasi **access token** (900 detik; tanpa refresh token) | Backbone auth: identity *issue*, platform *verify* (05 §1, OD-011) |
| `@nestjs/passport` + `passport-jwt` | ^11.0.5 + ^4.0.1 | Strategi autentikasi JWT | Integrasi passport ke Nest untuk `JwtAuthGuard` (05 §1) |
| `@nestjs/config` | ^4.0.4 | `ConfigModule`/`ConfigService` — load & akses konfigurasi dari env (DB URL WRITE/READ, JWT_SECRET, TZ) | Sumber kebenaran konfigurasi di seluruh runtime (05 §1; dipakai platform & identity) |
| `nestjs-pino` + `pino` | ^4.6.1 + ^10.3.1 | Structured JSON logging + correlation id | NFR-OBS-001–005; log terstruktur untuk observability (05 §1) |
| `nestjs-cls` | ^6.2.1 | Async local storage (correlation ID lintas request/worker) | Menyebarkan trace id tanpa melewatkan parameter (NFR-OBS, 05 §1) |
| `@willsoto/nestjs-prometheus` | ^6.1.0 | Endpoint `/metrics` (di-scrape Prometheus) | NFR-OBS; dipasang di `apps/api` & `apps/worker` (05 §1) |
| `prisma` (CLI) | ^6.4.0 | Migrate, generate client | Satu `schema.prisma` sebagai sumber kebenaran skema (DR-009) |
| `@prisma/client` | ^6.4.0 | Runtime ORM (instansiasi dimiliki `libs/platform`) | Akses DB via platform; modul bisnis tidak instansiasi `PrismaClient` sendiri |
| `jest` + `ts-jest` + `@types/jest` | ^30.0.0 + ^29.2.5 + ^30.0.0 | Unit test seluruh modul | Standar testing Nest (NFR-MNT-008) |
| `supertest` | ^7.0.0 | E2E test HTTP (`apps/api`) | Test kontrak API nyata (NFR-MNT-008) |
| `testcontainers` | ^12.0.4 | Integration test dengan Postgres asli | Validasi behavior DB yang akurat, bukan mock (05 §8) |
| `typescript`, `eslint`, `@typescript-eslint/*`, `prettier` | ^5.7.3, ^9.18.0, ^8.20.0 (via `typescript-eslint`), ^3.4.2 | Compiler & tooling pengembangan | Standar toolchain TypeScript |
| `dependency-cruiser` | ^18.2.0 | Validasi batas modul (CI) | Nest tidak punya module boundary checker bawaan; ini pengganti Spring Modulith (05 §0) |

> `@prisma/client` tercatat di shared karena **dua instance `PrismaClient` dibangun di `libs/platform`** (`PrismaWriteService` untuk primary dan `PrismaReadService` untuk read replica; lihat `05` §4). Modul bisnis **tidak** membuat client sendiri; mereka mengonsumsi service platform (lihat §3).

### 2.1 Library multi-modul yang sengaja TIDAK dijadikan shared

| Library | Dipakai di | Alasan tidak dijadikan shared |
|---|---|---|
| `@nestjs/throttler` | `identity` (rate-limit login, FR-AUTH-010) dan `sales` (rate-limit checkout, NFR-SEC-008) | Kebijakan rate-limit **berbeda per modul** (target endpoint, TTL, limit, unit throttling). Deklarasi per modul menjaga konfigurasi tetap lokal, tidak bocor ke modul lain, dan siap di-split tanpa membawa policy modul lain. |

---

## 3. Dependency per Modul

Format sub-section tiap modul:
- **Tanggung jawab** (1 kalimat);
- **Tabel dependency modul ini saja** — kolom `Library | Versi | Kategori | Fungsi di modul ini | Scope`;
- **Dependency ke modul lain (internal)** — mekanisme (langsung via interface = good practice; import file internal = dilarang);
- **Infrastructure dependency** — resource eksternal yang spesifik dipakai modul.

> **Kategori:** `Core` / `Persistence` / `Messaging` / `Security` / `Testing` / `Utility`. **Scope:** `compile` / `runtime` / `test`.

---

### 3.0 Platform — `libs/platform`

**Tanggung jawab:** shared kernel infrastruktur (Prisma, cache, money, pagination, security, error, observability) yang dipakai semua modul — bukan tempat logic bisnis (06 §3.0).

| Library | Versi | Kategori | Fungsi di modul ini | Scope |
|---|---|---|---|---|
| `@nestjs/common` / `@nestjs/core` | ^11.0.1 | Core | Guard, pipe, exception filter, DI | compile, runtime |
| `@nestjs/config` | ^4.0.4 | Utility | `ConfigModule.forRoot` + `ConfigService` — baca env (`DATABASE_URL_WRITE`/`DATABASE_URL_READ`, `JWT_SECRET`) untuk `PrismaWriteService`, `PrismaReadService`, `JwtStrategy` | compile, runtime |
| `@prisma/client` | ^6.4.0 | Persistence | `PrismaWriteService` (primary) & `PrismaReadService` (read replica) — 2 instance manual (`05` §4) | runtime |
| `@nestjs/cache-manager` + store Redis | belum terpasang* | Utility | `ReportingCacheService` — cache-aside + TTL 30 menit (shared lintas instance API) | runtime |
| `ioredis` | belum terpasang* | Utility | Single-flight lock per cache key (FR-REP-008) | runtime |
| `nestjs-cls` | ^6.2.1 | Utility | `CorrelationIdMiddleware` — inject correlation id lintas proses | runtime |
| `nestjs-pino` | ^4.6.1 | Utility | Structured log untuk error/platform service | runtime |
| Nest interceptor bawaan | Core | `SuccessResponseInterceptor` global + `@SuccessMessage()` — membungkus seluruh response 2xx berbody dengan `{ success, statusCode, message, data }`; `204` dilewati | runtime |
| `@nestjs/jwt` + `@nestjs/passport` + `passport-jwt` | ^11.0.2 + ^11.0.5 + ^4.0.1 | Security | `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()` — verifikasi token | runtime |
| `class-validator` / `class-transformer` | ^0.15.1 / ^0.5.1 | Core | `PageRequestDto` / `PageResponseDto<T>` validasi & transformasi | compile, runtime |
| `jest` + `ts-jest` | ^30.0.0 + ^29.2.5 | Testing | Unit test primitif platform (money, error, guard, cache service) | test |
| `testcontainers` | ^12.0.4 | Testing | Integration test Prisma client (primary + replica behavior) | test |

\* Belum terpasang di root `package.json` — wajib diinstal saat implementasi `ReportingCacheService` (cache-aside + single-flight; keputusan & detail di §3.6.1).

**Dependency ke modul lain:** tidak ada — platform adalah lapisan dasar. Semua modul bergantung kepadanya (bukan sebaliknya).

**Infrastructure dependency:**
- PostgreSQL primary (via `PrismaWriteService`);
- PostgreSQL read replica (via `PrismaReadService`);
- **Redis shared cache** (via `ReportingCacheService` — cache-aside TTL 30 menit + single-flight);
- Prometheus (endpoint `/metrics` di-scrape — dipasang lewat `apps/api` & `apps/worker`);
- Healthcheck DB untuk `GET /health` (`07` §8.2).

---

### 3.1 Identity — `libs/identity`

**Tanggung jawab:** autentikasi (register owner, login, logout client-side) dan manajemen staff (07 §1).

| Library | Versi | Kategori | Fungsi di modul ini | Scope |
|---|---|---|---|---|
| `@nestjs/jwt` + `@nestjs/passport` + `passport-jwt` | ^11.0.2 + ^11.0.5 + ^4.0.1 | Security | `AuthService` — issue **satu access token 900 detik**, login (FR-AUTH-007/008); tanpa refresh token/revocation server-side | runtime |
| `argon2` | ^0.45.1 | Security | Hash & verifikasi password (NFR-SEC-001) | runtime |
| `@nestjs/throttler` | ^6.5.0 | Security | Rate-limit login (FR-AUTH-010) | runtime |
| `class-validator` / `class-transformer` | ^0.15.1 / ^0.5.1 | Core | Validasi DTO `LoginDto`, `CreateStaffDto`, dll. | compile, runtime |
| `@prisma/client` | ^6.4.0 | Persistence | **via platform** — tulis user/staff lewat `PrismaWriteService` | runtime |
| `jest` + `ts-jest` | ^30.0.0 + ^29.2.5 | Testing | Unit test auth flow (hash, token) | test |

**Dependency ke modul lain:**
- `platform` — via interface publik (guards, `PrismaWriteService`). **Good practice.**
- Tidak ada dependency langsung ke modul bisnis lain.

**Infrastructure dependency:** PostgreSQL primary (lewat platform). Tidak ada resource eksternal lain.

---

### 3.2 Tenant — `libs/tenant`

**Tanggung jawab:** manajemen merchant & outlet plus `TenantAuthorizationService` untuk isolasi tenant (FR-TEN-004/010).

| Library | Versi | Kategori | Fungsi di modul ini | Scope |
|---|---|---|---|---|
| `class-validator` / `class-transformer` | ^0.15.1 / ^0.5.1 | Core | Validasi `CreateOutletDto`, `UpdateMerchantDto`, dll. | compile, runtime |
| `@prisma/client` | ^6.4.0 | Persistence | **via platform** — tulis merchant/outlet lewat `PrismaWriteService` | runtime |
| `jest` + `ts-jest` | ^30.0.0 + ^29.2.5 | Testing | Unit test outlet/merchant + `TenantAuthorizationService` | test |

**Dependency ke modul lain:**
- `identity` — **langsung via interface publik** (`AuthService`/`StaffService` untuk validasi akses owner/aktor). Ini *good practice* untuk modular monolith: pemanggilan melalui barrel interface, bukan implementasi internal.
- `platform` — via interface publik. **Good practice.**

**Infrastructure dependency:** PostgreSQL primary (lewat platform). Tidak ada resource eksternal lain.

---

### 3.3 Catalog — `libs/catalog`

**Tanggung jawab:** master data kategori, produk, threshold dasar stok rendah, dan harga override per outlet (`ProductReadPort` untuk konsumen harga efektif — FR-CAT-001–012).

| Library | Versi | Kategori | Fungsi di modul ini | Scope |
|---|---|---|---|---|
| `class-validator` / `class-transformer` | ^0.15.1 / ^0.5.1 | Core | Validasi `CreateProductDto`, `CreateCategoryDto`, dll. | compile, runtime |
| `@prisma/client` | ^6.4.0 | Persistence | **via platform** — tulis product/category/`outlet_product_price` lewat `PrismaWriteService` | runtime |
| `jest` + `ts-jest` | ^30.0.0 + ^29.2.5 | Testing | Unit test harga efektif (override ?: master, BR-012) | test |

**Dependency ke modul lain:**
- `tenant` — **langsung via interface publik** (`TenantAuthorizationService.assertUserBelongsToMerchant` untuk isolasi tenant). **Good practice.**
- `platform` — via interface publik. **Good practice.**
- **Catalog TIDAK bergantung ke `inventory`** (route `GET /products/catalog` dipegang modul Inventory — 06 §3.3). Ini mencegah cycle dan menjaga pemisahan harga vs stok.

**Infrastructure dependency:** PostgreSQL primary (lewat platform). Tidak ada resource eksternal lain.

---

### 3.4 Inventory — `libs/inventory`

**Tanggung jawab:** manajemen stok per outlet, threshold dasar Product dan override Product–Outlet, stock movement, `StockReservationPort` (reservasi stok atomik saat checkout), katalog aktif per outlet, serta current-state inventory untuk dashboard operasional (`FR-INV-001–008`, termasuk `FR-INV-007A`).

| Library | Versi | Kategori | Fungsi di modul ini | Scope |
|---|---|---|---|---|
| `class-validator` / `class-transformer` | ^0.15.1 / ^0.5.1 | Core | Validasi `AdjustStockDto`, `StockQuery`, dll. | compile, runtime |
| `@prisma/client` | ^6.4.0 | Persistence | **via platform** — tulis inventory/`stock_movement`; `StockReservationPort` memakai `Prisma.TransactionClient` (atomic conditional update; `05` §6.1) | runtime |
| `jest` + `ts-jest` | ^30.0.0 + ^29.2.5 | Testing | Unit test reservasi stok (concurrency, insuff. stock) | test |

**Dependency ke modul lain:**
- `catalog` — **langsung via interface publik** (`ProductReadPort` untuk nama/harga produk aktif). **Good practice.**
- `tenant` — via interface publik (`TenantAuthorizationService`). **Good practice.**
- `platform` — via interface publik. **Good practice.**

**Infrastructure dependency:** PostgreSQL primary (lewat platform; transaksi checkout berbagi koneksi primary dengan sales). Tidak ada resource eksternal lain.

---

### 3.5 Sales — `libs/sales`

**Tanggung jawab:** checkout atomik + idempotency, receipt, dan lookup status transaksi — jalur paling kritis (FR-CHK-001–018, BR-001–014, NFR-PERF-001).

| Library | Versi | Kategori | Fungsi di modul ini | Scope |
|---|---|---|---|---|
| `@nestjs/throttler` | ^6.5.0 | Security | Rate-limit checkout (NFR-SEC-008) | runtime |
| `class-validator` / `class-transformer` | ^0.15.1 / ^0.5.1 | Core | Validasi `CheckoutDto` (items, payment method) dan lookup status checkout | compile, runtime |
| `@prisma/client` | ^6.4.0 | Persistence | **via platform** — satu transaksi Prisma: idempotency via unique `checkout_request_id` → tulis `transaction` (atribut pembayaran) + `transaction_item` (`05` §6.1) | runtime |
| `jest` + `ts-jest` | ^30.0.0 + ^29.2.5 | Testing | Unit test perhitungan total (`total = subtotal`), idempotency, race stok | test |

**Dependency ke modul lain:**
- `catalog` — **langsung via interface publik** (`ProductReadPort.getProductsForSaleValidation` untuk validasi Product dan harga efektif checkout). **Good practice.**
- `inventory` — **langsung via interface publik** (`StockReservationPort.reserveForSale` — atomic decrement dalam transaksi yang sama). **Good practice.**
- `tenant` — **langsung via interface publik** (`TenantAuthorizationService` — cek outlet milik merchant). **Good practice.**
- `identity` — **langsung via interface publik** (data konteks operator Kasir/Owner untuk receipt). **Good practice.**
- `reporting` — **TIDAK dipanggil sama sekali** dan **tidak menerbitkan event apa pun**: Transaction `COMPLETED` yang sudah commit menjadi sumber query reporting di jalur dashboard (FR-CHK-014/015), sehingga checkout tidak pernah menunggu reporting. **Good practice.**

**Infrastructure dependency:** PostgreSQL primary (lewat platform). Tidak ada Redis/RabbitMQ/BullMQ dan tidak ada outbox — checkout sinkron all-or-nothing, tanpa jalur async keluar dari modul ini (05 §0).

---

### 3.6 Reporting — `libs/reporting`

**Tanggung jawab:** agregasi penjualan **cache-aside** (Redis) dari fakta `Transaction` `COMPLETED` yang diterima melalui `SalesReportingReadPort` + query dashboard bisnis Owner (FR-REP-001–010). Route dashboard operasional Admin mengomposisikan read port Catalog/Inventory pada application/API layer dan tidak membaca agregat penjualan.

| Library | Versi | Kategori | Fungsi di modul ini | Scope |
|---|---|---|---|---|
| `class-validator` / `class-transformer` | ^0.15.1 / ^0.5.1 | Core | Validasi `DashboardQuery`, `LowStockQuery` | compile, runtime |
| `@prisma/client` | ^6.4.0 | Persistence | Tipe kontrak melalui port; query fakta penjualan berada pada implementasi `SalesReportingReadPort` di modul Sales | runtime |
| `jest` + `ts-jest` | ^30.0.0 + ^29.2.5 | Testing | Unit test agregasi dashboard (freshness status, cache miss) | test |

**Dependency ke modul lain:**
- `catalog` — **langsung via interface publik** (`CatalogReportingReadPort` — current catalog untuk melengkapi daftar least-selling dashboard). **Good practice.**
- `tenant` — **langsung via interface publik** (`TenantReportingReadPort` — timezone & label outlet untuk bucket/label agregasi). **Good practice.**
- `sales` — **langsung via interface publik** (`SalesReportingReadPort` — fakta `Transaction` `COMPLETED` yang dibaca bounded dari read replica). **Good practice.**
- `platform` — via interface publik (`ReportingCacheService`). **Good practice.**
- Reporting tidak membaca tabel Sales, Inventory, atau Catalog secara langsung. Saat cache miss, ia meminta fakta penjualan ke `SalesReportingReadPort`, lalu mengagregasinya secara bounded + single-flight (FR-REP-008/009); checkout tidak menginvalidasi cache (FR-REP-002). **Good practice.**

**Infrastructure dependency:** PostgreSQL **read replica** digunakan oleh implementasi `SalesReportingReadPort`; **Redis shared cache** TTL 30 menit (cache-aside + single-flight). Tidak ada worker reporting — cache dibangun di jalur dashboard (05 §0).

#### 3.6.1 `ReportingCacheService` — keputusan Redis (Iterasi 1)

Redis **dipakai** sebagai shared cache reporting lintas instance API (keputusan Iterasi 1, poin 6). Definisi konkret:

- **Posisi:** dijalankan sebagai service tersendiri (Railway) atau provider yang tersedia; bukan embedded. `libs/platform` memakai **`@nestjs/cache-manager`** (store `ioredis`) untuk cache-aside dan **`ioredis`** untuk lock single-flight.
- **Cache key:** `reporting:{merchantId}:{endpoint}:{scope}` (scope ternormalisasi: outletId/dateFrom/dateTo/bucket). TTL **30 menit** (FR-REP-006/007).
- **Payload:** agregat + `data_updated_at` + `freshness_status` (`FRESH`/`STALE`) — dihitung dari umur data vs ambang saat dibaca (FR-REP-004/009).
- **Single-flight (FR-REP-008):** saat cache miss, pemenang mengunci `SET reporting:lock:{key} 1 NX EX 30` via `ioredis`; yang kalah menunggu lalu membaca cache hasil pemenang. Redis mati → hitung langsung secara bounded (fallback, FR-REP-007), jangan blokir checkout (`05` §9 poin 4).
- **Tidak ada invalidasi saat checkout** (`FR-REP-002`): cache hanya dibangun saat dashboard diakses.

Dependensi `@nestjs/cache-manager` + `ioredis` **belum terpasang** di root `package.json` dan wajib diinstal saat implementasi `ReportingCacheService` (lihat §3.0).

---

### 3.7 Insight (BI) — `libs/insight`

**Tanggung jawab:** generate insight BI (SALES_TREND, OUTLET_COMPARISON, TOP_PRODUCTS, TIME_PATTERN, AOV_TREND) melalui LLM di balik `AiProviderPort` (FR-AI-001–012).

| Library | Versi | Kategori | Fungsi di modul ini | Scope |
|---|---|---|---|---|
| `axios` | ^1.19.0 | Utility | `LlmInsightAdapter` — panggilan HTTP ke LLM provider melalui `AiProviderPort` | runtime |
| `cockatiel` | ^4.0.0 | Utility | Circuit breaker + retry + timeout untuk LLM provider agar worker tidak tersumbat (EXT-AI-003; `07` §7) | runtime |
| `class-validator` / `class-transformer` | ^0.15.1 / ^0.5.1 | Core | Validasi query `InsightQueryService` | compile, runtime |
| `@nestjs/schedule` | ^6.1.3 | Utility | `AiAnalysisJobService.@Cron` — polling job AI di `apps/worker` (FR-AI-006) | runtime |
| `@prisma/client` | ^6.4.0 | Persistence | **via platform** — tulis `AiAnalysisJob` dan model `AiInsight` (tabel `ai_insight`) lewat `PrismaWriteService` (primary); baca dataset via `ReportingReadPort` | runtime |
| `jest` + `ts-jest` | ^30.0.0 + ^29.2.5 | Testing | Unit test `LlmInsightAdapter` + job processor | test |

**Dependency ke modul lain:**
- `reporting` — **langsung via interface publik** (`ReportingReadPort` — dataset cache-aside atau agregasi bounded saat miss, bukan tabel mentah transaksi). **Good practice.**
- `platform` — **langsung via interface publik** (`PrismaWriteService` untuk state `AiAnalysisJob`). **Good practice.**
- Proses generate berjalan di `apps/worker` sebagai **job internal** `AiAnalysisJob` (bukan endpoint sinkron) — user menerima `jobId` lalu polling status (07 §7).

**Infrastructure dependency:**
- PostgreSQL **primary** (tulis `AiAnalysisJob` dan `AiInsight` — model Prisma, tabel `ai_insight` — via `PrismaWriteService`) dan **read replica** (dataset via `ReportingReadPort`/platform);
- Redis shared cache hanya melalui `ReportingReadPort`;
- **LLM provider** melalui `AiProviderPort`, dengan timeout + circuit breaker `cockatiel`.

---

### 3.8 Aplikasi (deployable) — `apps/api` & `apps/worker`

Bukan modul bisnis, melainkan **entrypoint** yang me-*wiring* modul di atas. Dicatat agar dependency aplikasi-level (HTTP, docs, metrics, scheduler) tidak tersebar di modul.

| Library | Versi | Kategori | Fungsi | Scope |
|---|---|---|---|---|
| `@nestjs/platform-express` | ^11.0.1 | Core | Server HTTP `apps/api` (semua *Controller*) | runtime |
| `@nestjs/swagger` + `swagger-ui-express` | ^11.4.6 + ^5.0.1 | Utility | OpenAPI UI di `apps/api` | runtime |
| `@willsoto/nestjs-prometheus` | ^6.1.0 | Utility | Endpoint `/metrics` di `apps/api` & `apps/worker` | runtime |
| `@nestjs/schedule` | ^6.1.3 | Utility | Cron runner di `apps/worker` — polling `AiAnalysisJob` (via `libs/insight`) | runtime |
| `nestjs-pino` | ^4.6.1 | Utility | Logging request HTTP (api) & proses worker | runtime |
| `supertest` | ^7.0.0 | Testing | E2E kontrak API (`apps/api`) | test |

**Infrastructure dependency:** `apps/api` → PostgreSQL primary + read replica (reporting) + Redis + Prometheus scrape; `apps/worker` → PostgreSQL primary + read replica + Redis + Prometheus scrape.

---

## 4. Cross-Module Communication Matrix

Memetakan **pemanggil → dipanggil → mekanisme** untuk membuktikan bahwa komunikasi lintas modul terstruktur (siap di-extract), bukan akses langsung ke tabel/implementasi modul lain.

| Modul Pemanggil | Modul Dipanggil | Mekanisme | Alasan |
|---|---|---|---|
| `tenant` | `identity` | Direct method call via interface publik (`AuthService`/`StaffService`) | Validasi akses owner/aktor saat kelola merchant/outlet |
| `catalog` | `tenant` | Direct method call via interface publik (`TenantAuthorizationService`) | Isolasi tenant (FR-TEN-010) |
| `inventory` | `catalog` | Direct method call via interface publik (`ProductReadPort`) | Nama/harga produk aktif untuk katalog & adjustment |
| `sales` | `catalog` | Direct method call via interface publik (`ProductReadPort`) | Harga efektif per outlet saat checkout (BR-012) |
| `sales` | `inventory` | Direct method call via interface publik (`StockReservationPort`) | Atomic decrement stok dalam transaksi checkout yang sama |
| `sales` | `tenant` | Direct method call via interface publik (`TenantAuthorizationService`) | Outlet milik merchant (FR-TEN-010) |
| `reporting` | `catalog` | Direct method call via interface publik (`CatalogReportingReadPort`) | Current catalog untuk melengkapi least-selling dashboard |
| `reporting` | `tenant` | Direct method call via interface publik (`TenantReportingReadPort`) | Timezone + label outlet untuk agregasi & dashboard |
| `reporting` | `sales` | Direct method call via interface publik (`SalesReportingReadPort`) + cache-aside via `ReportingCacheService` (platform) | Data penjualan dibangun di jalur dashboard dari fakta penjualan bounded; tidak membaca tabel modul bisnis lain langsung (`05` §3) |
| `insight` | `reporting` | Direct method call via interface publik (`ReportingReadPort`) | Hanya baca dataset hasil agregasi (bukan tabel mentah) |
| `insight` | `platform` | Direct method call via interface publik (`PrismaWriteService`) + job internal worker | Generate insight async; retry/backoff pada state `AiAnalysisJob` |
| semua modul bisnis | `platform` | Direct method call via interface publik (guards, `PrismaWrite/ReadService`, cache, money, pagination, error) | Shared kernel yang diizinkan |

> **Catatan mekanisme async:** satu-satunya jalur async pada Iterasi 1 adalah **`AiAnalysisJob` (tabel DB) + `@nestjs/schedule` polling di `apps/worker`** — **bukan outbox, RabbitMQ, maupun Redis/BullMQ** (05 §0: sengaja didefer). Karena semua komunikasi lewat **interface/port**, bila nanti modul di-split menjadi service, jalur ini tinggal mengganti implementasi (mis. ke broker) tanpa mengubah pemanggil.

---

## 5. Kontrak Port Antar Modul

> Bagian ini menetapkan **signature minimum** untuk setiap port yang menjadi jalur komunikasi lintas modul pada §4. Interface publik **layanan** (mis. `CheckoutService`, `DashboardQueryService`) dikonsumsi `apps/*` dan kontraknya ditetapkan di `07` (endpoint + DTO + error), sehingga tidak diulang di sini.
>
> Lokasi kode mengikuti pola yang sudah dipakai `catalog` & `tenant`: `libs/<modul>/src/application/ports/`. Implementasi konkret (pola `*repository.ts`/`*service.ts`) berada di `libs/<modul>/src/infrastructure/` dan **dilarang diimpor** pemanggil (06 §1.2).

### 5.1 Konvensi kontrak port

| # | Aturan |
|---|---|
| 1 | Naming: interface berakhiran `Port`/`Service`; implementasi konkret di `infrastructure/` memakai pola `*repository.ts` (mis. `product.repository.ts`, `ai-analysis-job.repository.ts`) atau `*service.ts` (mis. `tenant-reporting-read.service.ts`) dan tidak boleh diimpor lintas modul. |
| 2 | Semua port diekspor dari barrel `libs/<modul>/src/index.ts`; pemanggil hanya `import { X } from '@app/<modul>'`. |
| 3 | DTO port memakai **camelCase** (internal TS); pemetaan ke payload API **snake_case** terjadi di application/web layer (07). |
| 4 | Anti-corruption: DTO port tidak boleh membocorkan entitas Prisma modul lain (06 §1.2). |
| 5 | Error: port melempar exception domain (mis. `TenantViolationError`) yang dipetakan ke **HTTP status + envelope error** (`message`/`errors[]`) sesuai `07` §0–0.1. Port read-only **tidak melempar** untuk data yang tidak ditemukan, kecuali dinyatakan. |
| 6 | Transaksi: port yang menulis menerima `Prisma.TransactionClient` dari pemanggil — port tidak membuka/menutup transaksi sendiri; atomicity milik orchestrator (05 §6.1). |
| 7 | Versioning: perubahan signature yang tidak kompatibel → versi kontrak baru, kontrak lama deprecated (06 §7 poin 4). |

### 5.2 `ProductReadPort` — catalog (dikonsumsi `inventory`, `sales`)

| Aspek | Kontrak |
|---|---|
| Method | `getProductsForSaleValidation(request: ProductReadRequest): Promise<ProductForSale[]>` |
| Param `ProductReadRequest` | `{ merchantId: string; outletId: string; productIds: string[] }` |
| Return `ProductForSale` | `{ id; merchantId; categoryId; name; isActive; isCategoryActive; effectivePrice: string }` — harga efektif Outlet bila ada, selainnya harga master (BR-012) |
| Error | `TenantViolationError` bila Outlet bukan milik Merchant / tidak aktif. ID yang tidak ditemukan **tidak dikembalikan** (bukan throw). |
| Aturan | Catalog memvalidasi Outlet & kepemilikan tenant; output mengikuti urutan ID unik input; pemanggil **wajib** memeriksa kelengkapan hasil, `isActive`, `isCategoryActive`; port tidak mengelola stok. |

Referensi: 07 §3.3 & §5.3; FR-CAT-006/011–012; sudah terimplementasi di `libs/catalog/src/application/ports/product-read.port.ts`.

### 5.3 `CatalogReportingReadPort` — catalog (dikonsumsi `reporting`)

| Aspek | Kontrak |
|---|---|
| Method | `getSellableProducts(merchantId: string): Promise<CatalogReportingProduct[]>` |
| Return `CatalogReportingProduct` | `{ id: string; name: string }` |
| Error | `TenantViolationError` bila Merchant tidak valid. |
| Aturan | Hanya Product aktif dengan Category aktif milik Merchant; dipakai dashboard `least-selling` untuk melengkapi produk tanpa penjualan pada periode; **tidak** membocorkan harga/stok. |

Referensi: kode `libs/catalog/src/application/ports/catalog-reporting-read.port.ts`; 07 §6 (dashboard).

### 5.4 `StockReservationPort` — inventory (dikonsumsi `sales`)

| Aspek | Kontrak |
|---|---|
| Method | `reserveForSale(ctx: StockReservationContext): Promise<StockReservationResult>` |
| Param `StockReservationContext` | `{ merchantId: string; outletId: string; transactionId: string; actorUserId: string; tx: Prisma.TransactionClient; lines: [{ productId: string; quantity: number }] }` — `actorUserId` dicatat ke `stock_movement.actor_user_id` |
| Return `StockReservationResult` | `{ ok: true }` \| `{ ok: false; insufficient: [{ productId: string; requested: number; available: number }] }` |
| Error | Tidak melempar untuk kekurangan stok — hasil dikembalikan lewat `ok: false` agar orchestrator memutuskan rollback. |
| Aturan | Dipanggil **di dalam transaksi checkout** (`tx` dari pemanggil) — port tidak commit/rollback. Decrement stok **conditional atomic** (hanya bila `quantity >= requested`); menulis `stock_movement` `type=SALE` dengan `transaction_id` pada `tx` yang sama; kekurangan stok → caller mengembalikan HTTP `409` dengan kondisi `INSUFFICIENT_STOCK` (07 §0.1). |

Referensi: 07 §5.3/§5.6; FR-INV-001–008; 05 §6.1.

### 5.4A `SalesReportingReadPort` — sales (dikonsumsi `reporting`)

| Aspek | Kontrak |
|---|---|
| Method | `listCompletedTransactionFacts(request: SalesReportingQuery): Promise<CompletedTransactionFact[]>` |
| Param `SalesReportingQuery` | `{ merchantId: string; outletId?: string \| null; dateFrom: string; dateTo: string; timezone: string }` |
| Return `CompletedTransactionFact` | Fakta read-only yang diperlukan agregasi: waktu transaksi, Outlet, Product snapshot, kuantitas, subtotal, dan total. |
| Error | `TenantViolationError` bila Merchant/Outlet di luar scope; error dependency bila read replica tidak tersedia. |
| Aturan | Port ini dimiliki Sales. Implementasinya membaca hanya `Transaction` `COMPLETED` dan item-nya dari read replica secara bounded; Reporting tidak mengimpor repository atau tabel Sales secara langsung. |

Referensi: FR-REP-001/008/009; 05 §3; 07 §6.

### 5.5 `TenantAuthorizationService` — tenant (dikonsumsi `catalog`, `inventory`, `sales`)

| Aspek | Kontrak |
|---|---|
| Methods | `assertUserBelongsToMerchant(userId: string, merchantId: string): Promise<void>`<br/>`assertOutletOwnedByMerchant(outletId: string, merchantId: string, options?: { requireActive?: boolean }): Promise<Outlet>` — Outlet milik Merchant; `requireActive: true` saat checkout/adjustment (FR-TEN-004)<br/>`assertOutletOwnedByActor(actor: AuthenticatedUser, outletId: string): Promise<void>` — memuat rule role: OWNER → Outlet aktif pilihan dalam Merchant; CASHIER → `outlet_id` klaim JWT; ADMIN → ditolak (OD-010) |
| Error | `TenantViolationError` → HTTP `403` (kondisi `FORBIDDEN`, 07 §0.1). |
| Aturan | Dua lapis: `RolesGuard` memvalidasi klaim JWT, service memvalidasi scope lewat port ini (05 §6.3, SRS §7.2) — ID dari input tidak boleh dipercaya tanpa dicocokkan ke field User. |

Referensi: 07 §3.2; FR-TEN-010; BR-011B/OD-010.

### 5.6 `TenantReportingReadPort` — tenant (dikonsumsi `reporting`)

| Aspek | Kontrak |
|---|---|
| Method | `getContext(merchantId: string, outletId?: string): Promise<TenantReportingContext>` |
| Return `TenantReportingContext` | `{ timezone: string; outlets: [{ id: string; name: string }] }` |
| Error | `TenantViolationError` bila Merchant tidak valid. |
| Aturan | Baca **current state** (read replica); termasuk Outlet nonaktif agar histori Owner tidak hilang; hanya data minimal yang dibutuhkan reporting (timezone + label), bukan seluruh data tenant; tanpa outlet-changed event pada iterasi ini. |

Referensi: kode `libs/tenant/src/application/ports/tenant-reporting-read.port.ts`; BR-018; 07 §6.

### 5.7 `ReportingReadPort` — reporting (dikonsumsi `insight`)

| Aspek | Kontrak |
|---|---|
| Method | `getDataset(request: ReportingDatasetRequest): Promise<ReportingDataset>` |
| Param `ReportingDatasetRequest` | `{ merchantId: string; outletId?: string \| null; dateFrom: string; dateTo: string; timezone: string; granularity: 'HOUR' \| 'DAY'; dimensions?: ('outlet' \| 'product' \| 'hour')[] }` |
| Return `ReportingDataset` | `{ summary: { totalOmzet: string; transactionCount: number; averageTransactionValue: string }; series: [{ bucketStart: string; omzet: string; transactionCount: number; averageTransactionValue?: string }]; byOutlet?: [{ outletId: string; outletName: string; omzet: string; transactionCount: number }]; byProduct?: [{ productId: string; name: string; unitsSold: number; omzet: string }]; byHour?: [{ hourOfDay: number; omzet: string; transactionCount: number }]; dataVersion: string; dataUpdatedAt: string }` |
| Error | Tidak melempar untuk cache miss/expire — agregasi ulang bounded dijalankan; data terakhir tetap dikembalikan (FR-REP-004). |
| Aturan | Sumber = cache-aside Redis (TTL 30 menit) atau agregasi bounded fakta `Transaction` `COMPLETED` melalui `SalesReportingReadPort` saat miss, dengan single-flight per key (FR-REP-008/009); checkout tidak membangun/menginvalidasi cache (FR-REP-002); agregat dalam string desimal; waktu sesuai timezone Merchant (BR-018). Bentuk breakdown mengikuti 07 §6.4 (`TrendPoint`/`TimePatternPoint`/`TopProductsResult`/`OutletComparisonItem`). |

Referensi: 07 §3.6/§6.4; FR-REP-001–010; FR-AI-002; 05 §3/§6.2.

### 5.8 `AiProviderPort` — insight (outbound; dipakai `apps/worker`)

| Aspek | Kontrak |
|---|---|
| Method | `generate(request: AiGenerationRequest): Promise<AiGeneratedInsight[]>` |
| Param `AiGenerationRequest` | `{ merchantId: string; periodStart: string; periodEnd: string; dataVersion: string; dataset: ReportingDataset }` |
| Return `AiGeneratedInsight` | `{ type: 'SALES_TREND' \| 'OUTLET_COMPARISON' \| 'TOP_PRODUCTS' \| 'TIME_PATTERN' \| 'AOV_TREND'; title: string; content: string; evidenceSummary: Record<string, unknown> }` |
| Error | Adapter LLM wajib timeout + circuit breaker `cockatiel`; kegagalan → state job `RETRY_SCHEDULED`/`FAILED` (FR-AI-006/007). |
| Aturan | Implementasi `LlmInsightAdapter` menggunakan LLM melalui `AiProviderPort`; output tetap berbasis evidence terstruktur (FR-AI-004/005) dan harus aman di-retry (idempotent per `AiAnalysisJob`). |

Referensi: 07 §3.7/§7; DG-006; EXT-AI-003; FR-AI-001–012.

### 5.9 `AiAnalysisJobRepository` — insight internal (dipakai worker)

| Aspek | Kontrak |
|---|---|
| Method | `claimNextDue(): Promise<ClaimedAiAnalysisJob \| null>` |
| Return | `ClaimedAiAnalysisJob` = DTO read-only `{ id; merchantId; analysisDate; attempts; nextRetryAt; errorCategory }` untuk satu job yang sudah berubah ke `PROCESSING`, atau `null` bila tidak ada job due. |
| Aturan | Implementasi menggunakan satu operasi atomik pada primary (`$queryRaw`): hanya `PENDING` dengan `next_retry_at IS NULL` atau `RETRY_SCHEDULED` dengan `next_retry_at <= now()` yang eligible. Gunakan `FOR UPDATE SKIP LOCKED` atau conditional update setara agar dua Worker tidak mengklaim job yang sama. Ini **repository internal** untuk `insight` (pola `*repository.ts` di `infrastructure/`), bukan port lintas modul — karena itu tidak tercantum di §5.10. Return memakai DTO (`ClaimedAiAnalysisJob`), bukan entitas Prisma (anti-corruption, §5.1 aturan 4). |

Referensi: 05 §6.2; 07 §7.6; FR-AI-006.

### 5.10 Ringkasan port

| Port | Provider | Konsumen | Method utama |
|---|---|---|---|
| `ProductReadPort` | catalog | inventory, sales | `getProductsForSaleValidation` |
| `CatalogReportingReadPort` | catalog | reporting | `getSellableProducts` |
| `SalesReportingReadPort` | sales | reporting | `listCompletedTransactionFacts` |
| `StockReservationPort` | inventory | sales | `reserveForSale` |
| `TenantAuthorizationService` | tenant | catalog, inventory, sales | `assertUserBelongsToMerchant` / `assertOutletOwnedByMerchant` / `assertOutletOwnedByActor` |
| `TenantReportingReadPort` | tenant | reporting | `getContext` |
| `ReportingReadPort` | reporting | insight | `getDataset` |
| `AiProviderPort` | insight | apps/worker | `generate` |

> Kontrak ini adalah acuan implementasi. Perubahan signature wajib mengikuti alur versioning kontrak (06 §7) dan ditautkan ke `AT-*` terkait (07 §9).

---

## 6. Dependency Graph

### 6.1 Graf ketergantungan modul

```
                              ┌──────────────┐
                              │   reporting  │   (cache-aside: platform + read replica)
                              └──────┬───────┘
                                     │ ReportingReadPort
                                     ▼
                              ┌──────────────┐
                              │    insight   │   (worker: AiAnalysisJob)
                              └──────────────┘

 identity──► tenant──► catalog──► inventory──► sales   (tidak ada jalur sales → reporting)
   semua modul ─────────────► platform (shared kernel)
```

### 6.2 Tabel dependensi (X depends on Y)

| Modul | Bergantung pada | Mekanisme |
|---|---|---|
| `platform` | — | (lapisan dasar) |
| `identity` | `platform` | interface |
| `tenant` | `identity`, `platform` | interface |
| `catalog` | `tenant`, `platform` | interface |
| `inventory` | `catalog`, `tenant`, `platform` | interface (`ProductReadPort`) |
| `sales` | `catalog`, `inventory`, `tenant`, `identity`, `platform` | interface (`ProductReadPort`, `StockReservationPort`, `TenantAuthorizationService`) |
| `reporting` | `sales`, `catalog`, `tenant`, `platform` | interface (`SalesReportingReadPort`, `CatalogReportingReadPort`, `TenantReportingReadPort`, `ReportingCacheService`) |
| `insight` | `reporting`, `platform` | interface (`ReportingReadPort`, `PrismaWriteService`) |

**Hasil analisis circular dependency:** **tidak ada** — graf membentuk DAG (directed acyclic graph). Hal ini **dijamin otomatis** oleh `dependency-cruiser` di CI (05 §7, 06 §6). Titik rawan yang sengaja dihindari:
- `catalog` **tidak** depend ke `inventory` (route `GET /products/catalog` dipegang Inventory — 06 §3.3);
- `reporting`/`insight` **tidak** depend ke `infrastructure` milik `sales`/`inventory`/`catalog` (`05` §3);

---

## 7. Versioning & Update Policy

1. **Shared dependency = versi tunggal.** Framework dan library lintas modul (`@nestjs/*`, Prisma, class-validator, pino, prometheus, testing) dideklarasikan di root workspace; semua modul memakai versi identik. Update hanya melalui **satu PR terkoordinasi**; divergensi versi antar modul dilarang (lockfile sebagai bukti).
2. **Modul-specific dependency boleh update independen.** `argon2` (identity), `axios` + `cockatiel` (insight), `@nestjs/throttler` (identity & sales) bisa naik versi sendiri karena scopenya terisolasi per `libs/*` — cocok dengan target split-readiness (tiap `libs/*` siap punya `package.json` sendiri).
3. **Sinkronisasi wajib dalam satu ekosistem:**
   - seluruh `@nestjs/*` inti (`core`, `common`, `platform-express`, `swagger`, `passport`, `jwt`) harus berbagi **versi major yang sama** (saat ini **11**) karena saling tergantung pada runtime yang sama;
   - `@nestjs/schedule` (^6) dan `@nestjs/throttler` (^6) adalah pengecualian: keduanya versi major **6** dan tidak mengikuti major inti Nest (11) — jangan di-*upgrade* ke major 11 bila Nest rilis major tersebut; kecocokan dijamin oleh range `^` yang disetujui, bukan penyamaan major;
   - `prisma` (CLI) dan `@prisma/client` **wajib versi identik** — urutan update: `prisma migrate` → `prisma generate`.
4. **Kontrak antar modul di-versioned, bukan hanya library.** Perubahan signature interface publik/port yang tidak kompatibel → versi kontrak baru dengan kontrak lama ditandai deprecated (06 §1.2); seluruh consumer wajib menangani sesuai versi kontrak. Ini melindungi update library lintas modul dari *breaking change* runtime.
5. **CI sebagai gate:** eslint → `prisma validate` → jest → `dependency-cruiser` → build → deploy. Update dependency yang melanggar boundary modul **gagal build**.
6. **Otomasi:** disarankan Renovate/Dependabot dengan grouping per ekosistem (`@nestjs/*`, prisma, testing) + *semantic version range* ketat (`^` di dalam major yang disepakati).
7. **Versi mengikuti `package.json`.** Kolom Versi di dokumen ini mencerminkan root `package.json` saat bootstrap. Dua pengecualian: `@nestjs/cache-manager` (store Redis) dan `ioredis` belum terpasang dan harus ditambahkan saat implementasi cache (lihat §3.0). Bila `package.json` berubah (naik versi / tambah library), perbarui dokumen ini — nama library bisa dipangkas/ditambah sesuai hasil install — dan naikkan `Version` dokumen ke minor berikutnya.

---

*Dokumen disusun dari turunan `05` §1/§7, `06` (interface contract), dan `07` (API contract). Perubahan pemetaan library pasca-bootstrap harus memperbarui dokumen ini dan diverifikasi `dependency-cruiser`.*
