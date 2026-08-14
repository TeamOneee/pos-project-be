# Iterasi 1 — Library & Dependency per Modul (NestJS Modular Monolith)

**Version:** 1.0.0
**Last Updated:** Agustus 2026

> Dokumen ini **melengkapi** `05-iterasi-1-build-plan-nestjs.md` §1 (tech stack) dan §7 (boundary), serta `07-iterasi-1-api-contract.md` (kontrak API) — khusus mendokumentasikan **library/dependency, boundary, dan interface publik setiap modul** secara eksplisit.
>
> Sumber kebenaran requirement tetap di `01`–`04`. Bila ada perbedaan detail, dokumen `05`/`06`/`07` yang lebih detail berlaku sebagai acuan implementasi.
>
> **Status versi library:** seluruh nilai kolom Versi bertanda `TBD` karena `package.json` belum dibootstrap. Nilai akan diisi dari package.json saat setup project (lihat §6). Nama library, peran, dan penempatannya per modul **diturunkan dari `05` §1 dan `07`** — validasi final dilakukan saat package.json dibuat.
>
> **Cakupan:** backend saja (8 modul `libs/*` + 2 deployable `apps/api`, `apps/worker`). Frontend (React/Vite) tidak dibahas.

---

## Daftar Isi

1. [Overview](#1-overview)
2. [Shared/Common Dependencies](#2-sharedcommon-dependencies)
3. [Dependency per Modul](#3-dependency-per-modul)
4. [Cross-Module Communication Matrix](#4-cross-module-communication-matrix)
5. [Dependency Graph](#5-dependency-graph)
6. [Versioning & Update Policy](#6-versioning--update-policy)

---

## 1. Overview

### 1.1 Arsitektur modular monolith

- Satu codebase **Nest monorepo** yang menghasilkan **2 deployable**: `apps/api` (HTTP, melayani checkout/CRUD) dan `apps/worker` (proses terpisah untuk outbox relay + job AI) — 05 §0.
- Setiap **bounded context bisnis** menjadi `libs/*` tersendiri: `platform`, `identity`, `tenant`, `catalog`, `inventory`, `sales`, `reporting`, dan `insight` (05 §2).
- Satu database **PostgreSQL (Neon)** dengan **2 datasource**: primary (write path: identity, tenant, catalog, inventory, sales) dan read replica (reporting, insight) — diakses lewat Prisma (05 §1).
- Modul dibatasi per bounded context supaya tiap modul bisa diekstrak menjadi service sendiri nanti tanpa refactor besar (roadmap 05 §10).

### 1.2 Prinsip boundary antar modul

1. **Barrel-only import.** Modul lain hanya boleh `import { CheckoutService } from '@app/sales'` (path alias ke `libs/sales/src/index.ts`), **tidak pernah** ke file internal (`05` §2).
2. **Interface-first, bukan implementasi.** Pemanggil lintas modul hanya melihat nama interface (mis. `ProductReadPort`, `StockReservationPort`); implementasi berakhiran `Impl` dilarang diimpor. Anti-corruption: interface tidak pernah membocorkan entitas Prisma modul lain (§1.2).
3. **Anti-corruption boundary.** Modul lain **tidak boleh query tabel modul lain** secara langsung; read lintas modul hanya lewat port yang diekspos pemilik data (`05` §3).
4. **Shared kernel tunggal.** Satu-satunya shared kernel yang boleh dipakai semua modul adalah **`libs/platform`** — primitif infrastruktur (Prisma, outbox, job, money, pagination, security, error, observability). Platform bukan tempat logic bisnis (§3.0).
5. **Komunikasi antar modul** dilakukan dengan 3 mekanisme terstruktur (bukan import bebas):
   - **direct method call** lewat interface publik (in-process) — untuk jalur sinkron yang memang wajib (mis. checkout → harga/stok);
   - **outbox event** via tabel DB, dikonsumsi worker (async) — untuk reporting (`05` §0).
6. **Penegakan otomatis:** `dependency-cruiser` di CI membuat build gagal bila ada modul yang melanggar batas (05 §7, 06 §5).

### 1.3 Strategi dependency management

- **Satu build tool:** npm workspaces + Nest monorepo. Satu root `package.json` + `lockfile` sebagai sumber kebenaran versi shared dependency (06 §6).
- **Target split-readiness:** tiap `libs/*` siap memiliki `package.json` sendiri (didukung mode monorepo Nest), sehingga dependency list tiap modul **eksplisit dan bisa di-split** tanpa memilah shared/global secara manual.
- **Aturan dasar:**
  - library lintas modul (framework, ORM, observability, testing) → deklarasi di root, versi tunggal;
  - library khusus modul (mis. `argon2` untuk identity, `axios`/`cockatiel` untuk insight) → deklarasi per modul;
  - boundary ditegakkan oleh `dependency-cruiser` agar update dependency tidak pernah menembus batas modul.
- **CI gate:** eslint → `prisma validate` → jest → `dependency-cruiser` → build → deploy (05 §1).

---

## 2. Shared/Common Dependencies

Library berikut dipakai **lintas modul** dan dideklarasikan di root workspace dengan versi tunggal.

| Nama Library | Versi | Fungsi | Alasan Pemilihan |
|---|---|---|---|
| `@nestjs/common` | TBD | DI, decorator, guard, pipe, exception filter | Framework inti; seluruh modul `libs/*` dan `apps/*` berdiri di atasnya |
| `@nestjs/core` | TBD | Runtime/container Nest | Fondasi aplikasi Nest |
| `@nestjs/platform-express` | TBD | Adapter HTTP (dipakai `apps/api`) | Server HTTP default Nest, ekosistem luas |
| `@nestjs/swagger` + `swagger-ui-express` | TBD | Generasi OpenAPI + UI docs (API-007) | Dokumentasi kontrak API otomatis dari decorator (05 §1) |
| `class-validator` | TBD | Validasi DTO/body di seluruh modul | Backend sebagai validator final (NFR-MNT-002) lewat global `ValidationPipe` (05 §1) |
| `class-transformer` | TBD | Transform/typing DTO, konversi tipe body | Pasangan `class-validator`; dipakai global |
| `@nestjs/jwt` | TBD | Signing & verifikasi access/refresh token | Backbone auth: identity *issue*, platform *verify* (05 §1) |
| `@nestjs/passport` + `passport-jwt` | TBD | Strategi autentikasi JWT | Integrasi passport ke Nest untuk `JwtAuthGuard` (05 §1) |
| `nestjs-pino` + `pino` | TBD | Structured JSON logging + correlation id | NFR-OBS-001–005; log terstruktur untuk observability (05 §1) |
| `nestjs-cls` | TBD | Async local storage (correlation ID lintas request/worker) | Menyebarkan trace id tanpa melewatkan parameter (NFR-OBS, 05 §1) |
| `@willsoto/nestjs-prometheus` | TBD | Endpoint `/metrics` (di-scrape Prometheus) | NFR-OBS; dipasang di `apps/api` & `apps/worker` (05 §1) |
| `prisma` (CLI) | TBD | Migrate, generate client | Satu `schema.prisma` sebagai sumber kebenaran skema (DR-009) |
| `@prisma/client` | TBD | Runtime ORM (instansiasi dimiliki `libs/platform`) | Akses DB via platform; modul bisnis tidak instansiasi `PrismaClient` sendiri |
| `jest` + `ts-jest` + `@types/jest` | TBD | Unit test seluruh modul | Standar testing Nest (NFR-MNT-008) |
| `supertest` | TBD | E2E test HTTP (`apps/api`) | Test kontrak API nyata (NFR-MNT-008) |
| `testcontainers` | TBD | Integration test dengan Postgres asli | Validasi behavior DB yang akurat, bukan mock (05 §8) |
| `typescript`, `eslint`, `@typescript-eslint/*`, `prettier` | TBD | Compiler & tooling pengembangan | Standar toolchain TypeScript |
| `dependency-cruiser` | TBD | Validasi batas modul (CI) | Nest tidak punya module boundary checker bawaan; ini pengganti Spring Modulith (05 §0) |

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
- **Dependency ke modul lain (internal)** — mekanisme (langsung via interface = good practice, atau event = good practice; import file internal = dilarang);
- **Infrastructure dependency** — resource eksternal yang spesifik dipakai modul.

> **Kategori:** `Core` / `Persistence` / `Messaging` / `Security` / `Testing` / `Utility`. **Scope:** `compile` / `runtime` / `test`.

---

### 3.0 Platform — `libs/platform`

**Tanggung jawab:** shared kernel infrastruktur (Prisma, outbox, job, money, pagination, security, error, observability) yang dipakai semua modul — bukan tempat logic bisnis (06 §3.0).

| Library | Versi | Kategori | Fungsi di modul ini | Scope |
|---|---|---|---|---|
| `@nestjs/common` / `@nestjs/core` | TBD | Core | Guard, pipe, exception filter, DI | compile, runtime |
| `@prisma/client` | TBD | Persistence | `PrismaWriteService` (primary) & `PrismaReadService` (read replica) — 2 instance manual (`05` §4) | runtime |
| `@nestjs/schedule` | TBD | Utility | `OutboxRelayService.@Cron` (polling outbox) dan job runner (polling `job_record`) | runtime |
| `nestjs-cls` | TBD | Utility | `CorrelationIdMiddleware` — inject correlation id lintas proses | runtime |
| `nestjs-pino` | TBD | Utility | Structured log untuk error/platform service | runtime |
| `@nestjs/jwt` + `@nestjs/passport` + `passport-jwt` | TBD | Security | `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()` — verifikasi token | runtime |
| `class-validator` / `class-transformer` | TBD | Core | `PageRequestDto` / `PageResponseDto<T>` validasi & transformasi | compile, runtime |
| `jest` + `ts-jest` | TBD | Testing | Unit test primitif platform (money, error, guard, outbox service) | test |
| `testcontainers` | TBD | Testing | Integration test Prisma client (primary + replica behavior) | test |

**Dependency ke modul lain:** tidak ada — platform adalah lapisan dasar. Semua modul bergantung kepadanya (bukan sebaliknya).

**Infrastructure dependency:**
- PostgreSQL primary (via `PrismaWriteService`);
- PostgreSQL read replica (via `PrismaReadService`);
- Prometheus (endpoint `/metrics` di-scrape — dipasang lewat `apps/api` & `apps/worker`);
- Healthcheck DB untuk `GET /health` (`07` §8.2).

---

### 3.1 Identity — `libs/identity`

**Tanggung jawab:** autentikasi (register owner, login, refresh, logout) dan manajemen staff (07 §1).

| Library | Versi | Kategori | Fungsi di modul ini | Scope |
|---|---|---|---|---|
| `@nestjs/jwt` + `@nestjs/passport` + `passport-jwt` | TBD | Security | `AuthService` — issue access/refresh token, login, refresh (FR-AUTH-007/008) | runtime |
| `argon2` | TBD | Security | Hash & verifikasi password (NFR-SEC-001) | runtime |
| `@nestjs/throttler` | TBD | Security | Rate-limit login (FR-AUTH-010) | runtime |
| `class-validator` / `class-transformer` | TBD | Core | Validasi DTO `LoginDto`, `CreateStaffDto`, dll. | compile, runtime |
| `@prisma/client` | TBD | Persistence | **via platform** — tulis user/staff lewat `PrismaWriteService` | runtime |
| `jest` + `ts-jest` | TBD | Testing | Unit test auth flow (hash, token) | test |

**Dependency ke modul lain:**
- `platform` — via interface publik (guards, `PrismaWriteService`). **Good practice.**
- Tidak ada dependency langsung ke modul bisnis lain.

**Infrastructure dependency:** PostgreSQL primary (lewat platform). Tidak ada resource eksternal lain.

---

### 3.2 Tenant — `libs/tenant`

**Tanggung jawab:** manajemen merchant & outlet plus `TenantAuthorizationService` untuk isolasi tenant (FR-TEN-004/010).

| Library | Versi | Kategori | Fungsi di modul ini | Scope |
|---|---|---|---|---|
| `class-validator` / `class-transformer` | TBD | Core | Validasi `CreateOutletDto`, `UpdateMerchantDto`, dll. | compile, runtime |
| `@prisma/client` | TBD | Persistence | **via platform** — tulis merchant/outlet lewat `PrismaWriteService` | runtime |
| `jest` + `ts-jest` | TBD | Testing | Unit test outlet/merchant + `TenantAuthorizationService` | test |

**Dependency ke modul lain:**
- `identity` — **langsung via interface publik** (`AuthService`/`StaffService` untuk validasi akses owner/aktor). Ini *good practice* untuk modular monolith: pemanggilan melalui barrel interface, bukan implementasi internal.
- `platform` — via interface publik. **Good practice.**

**Infrastructure dependency:** PostgreSQL primary (lewat platform). Tidak ada resource eksternal lain.

---

### 3.3 Catalog — `libs/catalog`

**Tanggung jawab:** master data kategori, produk, threshold dasar stok rendah, dan harga override per outlet (`ProductReadPort` untuk konsumen harga efektif — FR-CAT-001–012).

| Library | Versi | Kategori | Fungsi di modul ini | Scope |
|---|---|---|---|---|
| `class-validator` / `class-transformer` | TBD | Core | Validasi `CreateProductDto`, `CreateCategoryDto`, dll. | compile, runtime |
| `@prisma/client` | TBD | Persistence | **via platform** — tulis product/category/`product_outlet_price` lewat `PrismaWriteService` | runtime |
| `jest` + `ts-jest` | TBD | Testing | Unit test harga efektif (override ?: master, BR-012) | test |

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
| `class-validator` / `class-transformer` | TBD | Core | Validasi `AdjustStockDto`, `StockQuery`, dll. | compile, runtime |
| `@prisma/client` | TBD | Persistence | **via platform** — tulis inventory/`stock_movement`; `StockReservationPort` memakai `Prisma.TransactionClient` (atomic conditional update; `05` §6.1) | runtime |
| `jest` + `ts-jest` | TBD | Testing | Unit test reservasi stok (concurrency, insuff. stock) | test |

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
| `@nestjs/throttler` | TBD | Security | Rate-limit checkout (NFR-SEC-008) | runtime |
| `class-validator` / `class-transformer` | TBD | Core | Validasi `CheckoutDto` (items, payment), `IdempotencyService` status lookup | compile, runtime |
| `@prisma/client` | TBD | Persistence | **via platform** — satu transaksi Prisma: idempotency guard → tulis `transaction`/`transaction_line`/`payment` → publish outbox (`05` §6.1) | runtime |
| `jest` + `ts-jest` | TBD | Testing | Unit test perhitungan total (`total = subtotal`), idempotency, race stok | test |

**Dependency ke modul lain:**
- `catalog` — **langsung via interface publik** (`ProductReadPort.getActiveByIds` untuk harga efektif checkout). **Good practice.**
- `inventory` — **langsung via interface publik** (`StockReservationPort.reserveForSale` — atomic decrement dalam transaksi yang sama). **Good practice.**
- `tenant` — **langsung via interface publik** (`TenantAuthorizationService` — cek outlet milik merchant). **Good practice.**
- `identity` — **langsung via interface publik** (data konteks kasir untuk receipt). **Good practice.**
- `reporting` — **TIDAK dipanggil langsung**: output lewat **outbox event** `TransactionCompletedEvent` (async, dikonsumsi worker) supaya checkout tidak pernah menunggu reporting (FR-CHK-014/015). **Good practice.**

**Infrastructure dependency:** PostgreSQL primary (lewat platform). Tidak ada Redis/RabbitMQ — antrian async memakai outbox table (05 §0).

---

### 3.6 Reporting — `libs/reporting`

**Tanggung jawab:** proyeksi data penjualan (`ReportingProjection`) + query dashboard bisnis Owner (FR-REP-001–010). Route dashboard operasional Admin mengomposisikan read port Catalog/Inventory pada application/API layer dan tidak membaca `ReportingProjection` penjualan.

| Library | Versi | Kategori | Fungsi di modul ini | Scope |
|---|---|---|---|---|
| `class-validator` / `class-transformer` | TBD | Core | Validasi `DashboardQuery`, `LowStockQuery` | compile, runtime |
| `@prisma/client` | TBD | Persistence | **via platform** — baca `ReportingProjection` lewat `PrismaReadService` (read replica), tulis proyeksi lewat `PrismaWriteService` (worker) | runtime |
| `jest` + `ts-jest` | TBD | Testing | Unit test agregasi dashboard (freshness status) | test |

**Dependency ke modul lain:**
- `platform` — via interface publik (`PrismaReadService`, outbox). **Good practice.**
- **TIDAK depend ke `sales`/`inventory`/`catalog`** (anti-corruption; `05` §3). Data masuk lewat **outbox event** `TransactionCompletedEvent` yang diproses `ProjectionUpdateService` di worker (idempotent, FR-REP-008). **Good practice.**

**Infrastructure dependency:** PostgreSQL **read replica** (untuk query dashboard, via `PrismaReadService`); **primary** hanya untuk tulis proyeksi dari worker.

---

### 3.7 Insight (BI) — `libs/insight`

**Tanggung jawab:** generate insight BI (SALES_TREND, OUTLET_COMPARISON, TOP_PRODUCTS, TIME_PATTERN, AOV_TREND) via `AiProviderPort` — rule-based default, opsional provider eksternal (FR-AI-001–012).

| Library | Versi | Kategori | Fungsi di modul ini | Scope |
|---|---|---|---|---|
| `axios` | TBD | Utility | `ExternalAiAdapter` — panggilan HTTP ke provider AI eksternal (opsional, EXT-AI-003) | runtime |
| `cockatiel` | TBD | Utility | Circuit breaker + retry + timeout untuk provider eksternal agar worker tidak tersumbat (EXT-AI-003; `07` §7) | runtime |
| `class-validator` / `class-transformer` | TBD | Core | Validasi `TriggerInsightDto`, query `InsightQueryService` | compile, runtime |
| `@prisma/client` | TBD | Persistence | **via platform** — baca proyeksi lewat `PrismaReadService` (read replica); tulis hasil insight | runtime |
| `jest` + `ts-jest` | TBD | Testing | Unit test `RuleBasedInsightAdapter` + job processor | test |

**Dependency ke modul lain:**
- `reporting` — **langsung via interface publik** (`ReportingReadPort.getProjection` — baca proyeksi, bukan tabel mentah transaksi). **Good practice.**
- `platform` — **langsung via interface publik** (`JobRecordService.enqueue` + retry/backoff/dead-letter; `PrismaReadService`). **Good practice.**
- Proses generate berjalan di `apps/worker` sebagai **job internal** (bukan endpoint sinkron) — user menerima `jobId` lalu polling status (07 §7).

**Infrastructure dependency:**
- PostgreSQL **read replica** (via platform);
- **External AI API** (hanya bila `ExternalAiAdapter` dipakai) — dengan timeout + circuit breaker `cockatiel`. `RuleBasedInsightAdapter` (default) berjalan tanpa resource eksternal (`05` §12).

---

### 3.8 Aplikasi (deployable) — `apps/api` & `apps/worker`

Bukan modul bisnis, melainkan **entrypoint** yang me-*wiring* modul di atas. Dicatat agar dependency aplikasi-level (HTTP, docs, metrics, scheduler) tidak tersebar di modul.

| Library | Versi | Kategori | Fungsi | Scope |
|---|---|---|---|---|
| `@nestjs/platform-express` | TBD | Core | Server HTTP `apps/api` (semua *Controller*) | runtime |
| `@nestjs/swagger` + `swagger-ui-express` | TBD | Utility | OpenAPI UI di `apps/api` | runtime |
| `@willsoto/nestjs-prometheus` | TBD | Utility | Endpoint `/metrics` di `apps/api` & `apps/worker` | runtime |
| `@nestjs/schedule` | TBD | Utility | Cron job runner di `apps/worker` (relay outbox + job AI, via `libs/platform`) | runtime |
| `nestjs-pino` | TBD | Utility | Logging request HTTP (api) & proses worker | runtime |
| `supertest` | TBD | Testing | E2E kontrak API (`apps/api`) | test |

**Infrastructure dependency:** `apps/api` → PostgreSQL primary + Prometheus scrape; `apps/worker` → PostgreSQL primary + read replica + Prometheus scrape.

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
| `sales` | `reporting` | **Outbox event** `TransactionCompletedEvent` (async via DB, diproses worker) | Checkout tidak boleh menunggu reporting (FR-CHK-014/015) |
| `reporting` | — | Konsumsi outbox (worker) | Proyeksi dibangun dari event, bukan query tabel `sales` (`05` §3) |
| `insight` | `reporting` | Direct method call via interface publik (`ReportingReadPort`) | Hanya baca proyeksi (bukan tabel mentah) |
| `insight` | `platform` | Direct method call via interface publik (`JobRecordService`) + job internal worker | Generate insight async dengan retry/backoff/dead-letter |
| semua modul bisnis | `platform` | Direct method call via interface publik (guards, `PrismaWrite/ReadService`, money, pagination, error) | Shared kernel yang diizinkan |

> **Catatan mekanisme async:** jalur async saat ini memakai **outbox table (DB) + `@nestjs/schedule` polling** — **bukan RabbitMQ** (05 §0: sengaja didefer; Redis/BullMQ juga tidak dipakai di Iterasi 1). Karena semua komunikasi lewat **interface/port**, bila nanti modul di-split menjadi service, jalur ini tinggal mengganti implementasi (mis. ke broker) tanpa mengubah pemanggil.

---

## 5. Dependency Graph

### 5.1 Graf ketergantungan modul

```
                         ┌──────────────┐
        ┌────────────────►   reporting  ◄──── outbox ────┐
        │ (outbox event)  └──────┬──────┘                │
        │                        │ ReportingReadPort     │
        │                        ▼                       │
identity──► tenant──► catalog──► inventory──► sales──────┘
   semua modul ─────────────► platform (shared kernel)
```

### 5.2 Tabel dependensi (X depends on Y)

| Modul | Bergantung pada | Mekanisme |
|---|---|---|
| `platform` | — | (lapisan dasar) |
| `identity` | `platform` | interface |
| `tenant` | `identity`, `platform` | interface |
| `catalog` | `tenant`, `platform` | interface |
| `inventory` | `catalog`, `tenant`, `platform` | interface (`ProductReadPort`) |
| `sales` | `catalog`, `inventory`, `tenant`, `identity`, `platform` | interface (`ProductReadPort`, `StockReservationPort`, `TenantAuthorizationService`) |
| `reporting` | `platform` | interface + outbox event |
| `insight` | `reporting`, `platform` | interface (`ReportingReadPort`, `JobRecordService`) |

**Hasil analisis circular dependency:** **tidak ada** — graf membentuk DAG (directed acyclic graph). Hal ini **dijamin otomatis** oleh `dependency-cruiser` di CI (05 §7, 06 §5). Titik rawan yang sengaja dihindari:
- `catalog` **tidak** depend ke `inventory` (route `GET /products/catalog` dipegang Inventory — 06 §3.3);
- `reporting`/`insight` **tidak** depend ke `infrastructure` milik `sales`/`inventory`/`catalog` (`05` §3);

---

## 6. Versioning & Update Policy

1. **Shared dependency = versi tunggal.** Framework dan library lintas modul (`@nestjs/*`, Prisma, class-validator, pino, prometheus, testing) dideklarasikan di root workspace; semua modul memakai versi identik. Update hanya melalui **satu PR terkoordinasi**; divergensi versi antar modul dilarang (lockfile sebagai bukti).
2. **Modul-specific dependency boleh update independen.** `argon2` (identity), `axios` + `cockatiel` (insight), `@nestjs/throttler` (identity & sales) bisa naik versi sendiri karena scopenya terisolasi per `libs/*` — cocok dengan target split-readiness (tiap `libs/*` siap punya `package.json` sendiri).
3. **Sinkronisasi wajib dalam satu ekosistem:**
   - seluruh `@nestjs/*` (`core`, `common`, `platform-express`, `swagger`, `schedule`, `throttler`, `passport`, `jwt`) harus berbagi **versi major yang sama** karena saling tergantung;
   - `prisma` (CLI) dan `@prisma/client` **wajib versi identik** — urutan update: `prisma migrate` → `prisma generate`.
4. **Kontrak antar modul di-versioned, bukan hanya library.** Perubahan payload event (outbox/domain) yang tidak kompatibel → `schemaVersion` baru atau `eventType` baru (06 §1.2); consumer wajib menangani sesuai version field. Ini melindungi update library lintas modul dari *breaking change* runtime.
5. **CI sebagai gate:** eslint → `prisma validate` → jest → `dependency-cruiser` → build → deploy. Update dependency yang melanggar boundary modul **gagal build**.
6. **Otomasi:** disarankan Renovate/Dependabot dengan grouping per ekosistem (`@nestjs/*`, prisma, testing) + *semantic version range* ketat (`^` di dalam major yang disepakati).
7. **Status `TBD`:** karena `package.json` belum dibootstrap, seluruh kolom Versi di dokumen ini adalah placeholder. Saat project di-setup, isi dokumen ini dari package.json (nama library bisa dipangkas/ditambah sesuai hasil install) dan naikkan `Version` dokumen ke `1.1.0`.

---

*Dokumen disusun dari turunan `05` §1/§7, `06` (interface contract), dan `07` (API contract). Perubahan pemetaan library pasca-bootstrap harus memperbarui dokumen ini dan diverifikasi `dependency-cruiser`.*
