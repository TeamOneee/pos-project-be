# Iterasi 1 — Rencana Pembangunan Aplikasi K (NestJS Modular Monolith)

> Dokumen ini adalah baseline implementasi Iterasi 1 dengan stack final **NestJS + Prisma + PostgreSQL (Neon) + React**. Sumber kebenaran requirement tetap di `01`–`04` (business flow, URS, SRS, FRD); data model acuan adalah [`05b-iterasi-1-datamodel.md`](./05b-iterasi-1-datamodel.md). Bila ada konflik, SRS dan ERD menang.

> **Revisi linearitas:** versi ini sudah diselaraskan dengan seluruh keputusan `Locked` pada Iterasi 1 dan ERD 05b:
> - `OD-001`/`DG-001` — atribut pembayaran disimpan langsung pada `Transaction` (`payment_method`, `payment_status = CONFIRMED`, `paid_at`); **tidak ada tabel `Payment`**.
> - `OD-012`/`DG-012` — idempotency checkout memakai `Transaction.checkout_request_id` + `Transaction.request_hash`; **tidak ada tabel `IdempotencyRecord`**.
> - `OD-011`/`DG-011` — satu JWT access token 900 detik; **tanpa refresh token dan tanpa revocation/logout server-side**.
> - `OD-010`/`DG-009` — **Owner juga dapat checkout** pada Outlet aktif yang dipilih dalam Merchant-nya; `OWNER` mewarisi seluruh permission `ADMIN` dan `CASHIER`.
> - `ASM-009`/`DG-005` — reporting memakai **cache-aside shared cache** TTL 30 menit (agregasi dari `Transaction` `COMPLETED` saat miss); **tidak ada `ReportingProjection`/outbox** dan **worker hanya untuk pekerjaan AI**.
> - `FR-AI-006/007` — job AI memakai **`AiAnalysisJob`** khusus harian Merchant (`merchant_id + analysis_date`), **bukan `JobRecord` generik**.
> - ERD 05b — `Transaction.operator_user_id` (bukan `cashier_user_id`), `TransactionItem` (bukan `TransactionLine`), `StockMovement.transaction_id` (bukan `reference_id`), relasi FK `merchant_id`/`outlet_id` konsisten.

---

## 0. Keputusan arsitektur inti

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Gaya arsitektur | **Modular monolith** dalam **Nest monorepo** (bukan microservices dari awal) | Tim kecil, biaya harus rendah, tapi tetap butuh isolasi *workload* (checkout vs reporting vs AI) — microservices di awal menambah biaya operasional tanpa bukti kebutuhan (StudyCase §5: *architectural improvement, bukan sekadar infra*) |
| Batas modul | Per **bounded context bisnis** (Identity, Tenant, Catalog, Inventory, Sales, Reporting, Insight), masing-masing jadi `libs/*` di Nest monorepo | Supaya tiap modul bisa diekstrak jadi service sendiri nanti tanpa refactor besar |
| Komunikasi antar modul | In-process, hanya lewat **barrel export** (`index.ts`) tiap `lib`, tidak pernah import file internal modul lain | Ini yang membuat monolith bisa dipecah nanti tanpa "distributed ball of mud" |
| Penegakan batas modul | **`dependency-cruiser`** dijalankan di CI (Nest tidak punya *module boundary checker* bawaan seperti Spring Modulith) | Build gagal kalau ada modul yang melanggar batas — bukti konkret untuk "Architectural Justification" |
| Isolasi checkout vs reporting/AI | **2 deployable dari 1 codebase**: `apps/api` (HTTP, melayani checkout/CRUD) dan `apps/worker` (proses terpisah khusus **pekerjaan AI**), plus **2 datasource Postgres** (primary utk write, read replica utk reporting/AI) | Checkout tidak pernah menunggu/berbagi resource dengan reporting/AI, tanpa perlu microservice terpisah dulu |
| Reporting | **Cache-aside** dengan **shared cache** (Redis) TTL 30 menit; cache miss meminta fakta `Transaction` `COMPLETED` ke `SalesReportingReadPort` secara bounded + single-flight; implementasi port membaca read replica; **bukan projection persisten** | `ASM-009`/`DG-005`/`FR-REP-001`: cache bukan source of truth, bisa dihapus/expire dan dibangun ulang; checkout tidak menginvalidasi cache (`FR-REP-002`) |
| Job AI | **`AiAnalysisJob`** (tabel di Postgres) + `@nestjs/schedule` polling di `apps/worker`; bukan Redis/BullMQ dari awal | Cukup untuk skala target (500 merchant); upgrade ke broker kalau backlog AI terbukti jadi bottleneck |

---

## 1. Tech stack

| Layer | Pilihan | Catatan |
|---|---|---|
| Backend | **NestJS (TypeScript), Nest monorepo mode** | `apps/api`, `apps/worker`, `libs/*` per modul |
| ORM & migration | **Prisma** | 1 `schema.prisma`, migration via `prisma migrate` (DR-009: versioned & reproducible) |
| Database | **PostgreSQL (Neon)** — primary + read replica | Primary: write path (identity, tenant, catalog, inventory, sales, ai job). Replica: implementasi `SalesReportingReadPort` untuk fakta penjualan; dataset Insight selalu lewat Reporting |
| Shared reporting cache | **Redis** (mis. `@nestjs/cache-manager` + store Redis, `ioredis` untuk single-flight lock) | Cache-aside TTL 30 menit, shared lintas instance API (`ASM-009`, `FR-REP-008`, `NFR-SCALE-004`); bukan source of truth |
| Auth | `@nestjs/passport` + `@nestjs/jwt` + `passport-jwt` | **Satu JWT access token berumur 900 detik, tanpa refresh token/revocation server-side** (`OD-011`, `FR-AUTH-007/008`) |
| Password hashing | **`argon2`** | NFR-SEC-001 |
| Validasi | **`class-validator` + `class-transformer`** via global `ValidationPipe` | Backend tetap validator final (NFR-MNT-002) |
| Rate limiting | **`@nestjs/throttler`** | Login & checkout (FR-AUTH-010, NFR-SEC-008) |
| Correlation ID | **`nestjs-cls`** + middleware | NFR-OBS-001/005 |
| Background job | **`AiAnalysisJob` (Prisma) + `@nestjs/schedule`** di `apps/worker` | Insight generation saja (worker tidak memproses reporting) |
| Circuit breaker LLM provider | **`cockatiel`** | EXT-AI-003 |
| Observability | **`nestjs-pino`** (structured JSON log) + `@willsoto/nestjs-prometheus` (endpoint `/metrics` yang di-scrape **Prometheus**) + dashboard **Grafana** | NFR-OBS-001–005 |
| API docs | **`@nestjs/swagger`** | API-007 |
| Test | **Jest** + `supertest` (e2e) + **`testcontainers`** (Postgres asli utk integration test) | NFR-MNT-008 |
| Frontend | **React + Vite + TypeScript**, `@tanstack/react-query`, `react-hook-form` + `zod`, `recharts` | |
| Deployment | **Railway**: 2 service (`apps/api`, `apps/worker`) dari 1 repo, **Neon** primary+replica, **Redis**; observability: **Prometheus** (scrape `/metrics` pada `apps/api` & `apps/worker`) + **Grafana** | |
| CI/CD | **GitHub Actions**: eslint → `prisma validate` → jest → `dependency-cruiser` → build → deploy | |

---

## 2. Struktur project (Nest monorepo)

```
aplikasi-k/
├── nest-cli.json
├── .dependency-cruiser.cjs        # aturan boundary antar libs, lihat §7
├── prisma/
│   ├── schema.prisma               # 1 sumber kebenaran skema, lihat §4
│   └── migrations/
├── apps/
│   ├── api/src/
│   │   ├── main.ts                 # bootstrap HTTP (semua *Controller*)
│   │   └── app.module.ts           # import: Identity, Tenant, Catalog, Inventory, Sales, Reporting, Insight Module
│   └── worker/src/
│       ├── main.ts                 # NestFactory.createApplicationContext (tanpa HTTP, atau HTTP minimal utk healthcheck)
│       └── worker.module.ts        # import: InsightModule (AiAnalysisJob poller) + PlatformModule
│
├── libs/
│   ├── platform/src/
│   │   ├── error/                   ApiError, ErrorCode enum, AllExceptionsFilter
│   │   ├── security/                 CorrelationIdMiddleware, JwtAuthGuard, RolesGuard, CurrentUser decorator
│   │   ├── money/                    Money helper (Prisma.Decimal wrapper)
│   │   ├── cache/                    ReportingCacheService (cache-aside + single-flight + TTL), Redis client
│   │   ├── prisma/                   PrismaWriteService, PrismaReadService
│   │   └── index.ts                  # satu-satunya pintu masuk modul lain
│   │
│   ├── identity/src/{application,infrastructure,web}/  + index.ts    # AuthService, StaffService
│   ├── tenant/src/{...}/                                + index.ts    # MerchantService, OutletService, TenantAuthorizationService
│   ├── catalog/src/{...}/                               + index.ts    # CategoryService, ProductService, OutletPriceService
│   ├── inventory/src/{...}/                             + index.ts    # InventoryService, StockMovementService
│   ├── sales/src/{...}/                                 + index.ts    # CheckoutService, ReceiptService
│   ├── reporting/src/{...}/                             + index.ts    # DashboardQueryService (api), ReportingCacheService, ReportingReadPort (utk AI)
│   ├── insight/src/{...}/                               + index.ts    # InsightTriggerService, AiAnalysisJobService (worker), InsightGenerationJob, AiProviderPort
│
└── test/                             # e2e (supertest) + testcontainers setup
```

`tsconfig.json` path alias: `@app/platform`, `@app/identity`, `@app/tenant`, `@app/catalog`, `@app/inventory`, `@app/sales`, `@app/reporting`, dan `@app/insight` — masing-masing menunjuk ke `libs/<nama>/src/index.ts`. Modul lain **hanya** boleh `import { CheckoutService } from '@app/sales'`, tidak pernah ke file internal.

> Boundary, dependency, dan interface publik antar-modul dirangkum pada `06-iterasi-1-module-library.md`; kontrak HTTP dan payload normatif dijelaskan pada `07-iterasi-1-api-contract.md`.

---

## 3. Aturan ketergantungan antar modul (wajib)

```
identity   -> platform
tenant     -> identity, platform
catalog    -> tenant, platform
inventory  -> catalog, tenant, platform
sales      -> catalog, inventory, tenant, identity, platform
reporting  -> sales, catalog, tenant, platform
             (membaca fakta Transaction COMPLETED hanya lewat SalesReportingReadPort; cache-aside tetap di reporting)
insight    -> reporting, platform (baca dataset lewat ReportingReadPort, bukan tabel Transaction mentah)
```

Ditegakkan oleh `dependency-cruiser` di CI (lihat §7). Aturan keras yang sama seperti rencana sebelumnya: `reporting`/`insight` tidak boleh depend ke `infrastructure` milik `sales`/`inventory`/`catalog` — ini yang membuat modul-modul itu bisa diekstrak ke service terpisah nanti tanpa migrasi skema besar.

---

## 4. Skema database — `prisma/schema.prisma` (selaras ERD 05b)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL_WRITE")  // primary, dipakai CLI Prisma & PrismaWriteService
}

enum UserRole {
  OWNER
  ADMIN
  CASHIER
}

enum AccountStatus {
  ACTIVE
  INACTIVE
}

enum TransactionStatus {
  COMPLETED
}

enum PaymentMethod {
  CASH
  QRIS
  TRANSFER
}

enum StockMovementType {
  ADJUSTMENT
  SALE
}

enum InsightStatus {
  READY
  STALE
}

enum AiAnalysisJobState {
  PENDING
  PROCESSING
  READY
  RETRY_SCHEDULED
  FAILED
}

model Merchant {
  id          String        @id @default(uuid())
  ownerUserId String        @unique @map("owner_user_id")   // FR-TEN-002
  name        String
  timezone    String        @default("Asia/Jakarta")          // BR-018: batas hari laporan
  status      AccountStatus @default(ACTIVE)
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  owner             User              @relation("MerchantOwner", fields: [ownerUserId], references: [id], onDelete: Restrict, onUpdate: Cascade, map: "merchant_owner_user_id_fkey")
  outlets           Outlet[]
  users             User[]            @relation("MerchantUsers")
  categories        Category[]
  products          Product[]
  inventories       Inventory[]
  productOutletPrices ProductOutletPrice[]
  transactions      Transaction[]
  stockMovements    StockMovement[]
  aiAnalysisJobs    AiAnalysisJob[]
  aiInsights        AiInsight[]

  @@map("merchant")
}

model Outlet {
  id         String        @id @default(uuid())
  merchantId String        @map("merchant_id")
  name       String
  address    String?
  status     AccountStatus @default(ACTIVE)                  // FR-TEN-004: nonaktif read-only
  createdAt  DateTime      @default(now()) @map("created_at")
  updatedAt  DateTime      @updatedAt @map("updated_at")

  merchant          Merchant           @relation(fields: [merchantId], references: [id])
  users             User[]
  inventories       Inventory[]
  productOutletPrices ProductOutletPrice[]
  transactions      Transaction[]
  stockMovements    StockMovement[]

  @@index([merchantId])
  @@map("outlet")
}

model User {
  id           String        @id @default(uuid())
  merchantId   String        @map("merchant_id")
  outletId     String?       @map("outlet_id")   // null utk OWNER/ADMIN, wajib utk CASHIER (CHECK constraint via raw SQL migration)
  name         String
  email        String        @unique // DR-001
  passwordHash String        @map("password_hash") // FR-AUTH-004: hanya hash
  role         UserRole                           // DR-011
  status       AccountStatus @default(ACTIVE)
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")

  merchant       Merchant         @relation("MerchantUsers", fields: [merchantId], references: [id], map: "user_merchant_id_fkey")
  ownedMerchant  Merchant?        @relation("MerchantOwner")
  outlet         Outlet?          @relation(fields: [outletId], references: [id], onDelete: SetNull)
  transactions   Transaction[]    @relation("OperatorTransactions")
  stockMovements StockMovement[]  @relation("ActorStockMovements")

  @@index([merchantId, role])
  @@index([merchantId, outletId])
  @@map("user")
}
// migration tambahan (raw SQL) — sudah diterapkan pada `20260816132316_init/migration.sql`:
// ALTER TABLE "user" ADD CONSTRAINT "chk_cashier_outlet" CHECK (
//   (role = 'CASHIER' AND outlet_id IS NOT NULL) OR (role IN ('OWNER','ADMIN') AND outlet_id IS NULL)
// );

model Category {
  id         String    @id @default(uuid())
  merchantId String    @map("merchant_id")
  name       String
  isActive   Boolean   @default(true) @map("is_active")        // BR-019: soft-deactivate

  merchant Merchant  @relation(fields: [merchantId], references: [id])
  products Product[]

  @@unique([merchantId, name])   // FR-CAT-009, DR-007
  @@map("category")
}

model Product {
  id                String    @id @default(uuid())
  merchantId        String    @map("merchant_id")
  categoryId        String    @map("category_id")
  name              String
  price             Decimal   @db.Decimal(14, 2)               // BR-001
  lowStockThreshold Int       @map("low_stock_threshold")       // FR-CAT-002, DR-011A: wajib >= 0
  isActive          Boolean   @default(true) @map("is_active")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  merchant          Merchant              @relation(fields: [merchantId], references: [id])
  category          Category              @relation(fields: [categoryId], references: [id])
  inventories       Inventory[]
  productOutletPrices ProductOutletPrice[]
  stockMovements    StockMovement[]
  transactionItems  TransactionItem[]

  @@index([merchantId, isActive])
  @@map("product")
}

model ProductOutletPrice {                       // FR-CAT-010, DG-002 (menutup OD-002): harga override per Outlet
  id         String   @id @default(uuid())
  merchantId String   @map("merchant_id")
  outletId   String   @map("outlet_id")
  productId  String   @map("product_id")
  price      Decimal  @db.Decimal(14, 2)          // harga efektif untuk Outlet ini; fallback Product.price bila tidak ada baris (DR-012)
  updatedAt  DateTime @updatedAt @map("updated_at")

  merchant Merchant @relation(fields: [merchantId], references: [id])
  outlet   Outlet   @relation(fields: [outletId], references: [id])
  product  Product  @relation(fields: [productId], references: [id])

  @@unique([outletId, productId])
  @@index([merchantId])
  @@map("outlet_product_price")
}

model Inventory {
  id                        String   @id @default(uuid())
  merchantId                String   @map("merchant_id")     // DR-007
  outletId                  String   @map("outlet_id")
  productId                 String   @map("product_id")
  quantity                  Int      @default(0)             // CHECK quantity >= 0 (raw SQL migration), BR-011A
  lowStockThresholdOverride Int?     @map("low_stock_threshold_override") // null = fallback Product.lowStockThreshold (DR-011A)
  updatedAt                 DateTime @updatedAt @map("updated_at")

  product Product @relation(fields: [productId], references: [id])
  outlet  Outlet  @relation(fields: [outletId], references: [id])
  merchant Merchant @relation(fields: [merchantId], references: [id])

  @@unique([outletId, productId])   // FR-INV-001: satu saldo per Product + Outlet
  @@index([merchantId])
  @@map("inventory")
}

model StockMovement {                        // FR-INV-003
  id             String             @id @default(uuid())
  merchantId     String             @map("merchant_id")
  outletId       String             @map("outlet_id")
  productId      String             @map("product_id")
  type           StockMovementType
  delta          Int
  quantityBefore Int                @map("quantity_before")
  quantityAfter  Int                @map("quantity_after")
  reason         String?                          // wajib diisi utk ADJUSTMENT (app-level validation)
  transactionId  String?            @map("transaction_id")  // FK ke transaction, hanya terisi untuk SALE (ERD 05b)
  actorUserId    String             @map("actor_user_id")
  createdAt      DateTime           @default(now()) @map("created_at")

  merchant    Merchant    @relation(fields: [merchantId], references: [id])
  outlet      Outlet      @relation(fields: [outletId], references: [id])
  product     Product     @relation(fields: [productId], references: [id])
  transaction Transaction? @relation(fields: [transactionId], references: [id], onDelete: SetNull)
  actor       User        @relation("ActorStockMovements", fields: [actorUserId], references: [id])

  @@index([outletId, productId, createdAt])
  @@map("stock_movement")
}

// Cart = client-side only (Iterasi 1): keranjang dikelola frontend, checkout menerima items inline.
// Tidak ada model/tabel cart di skema — tidak dipakai layanan mana pun (YAGNI).

model Transaction {
  id                String            @id @default(uuid())
  merchantId        String            @map("merchant_id")        // DR-007
  outletId          String            @map("outlet_id")
  operatorUserId    String            @map("operator_user_id")   // FR-CHK-010: Kasir atau Owner
  transactionNumber String            @map("transaction_number")
  status            TransactionStatus                            // FR-CHK-010/011
  paymentMethod     PaymentMethod     @map("payment_method")     // OD-001: atribut pembayaran langsung di Transaction
  paymentStatus     String            @default("CONFIRMED") @map("payment_status") // selalu CONFIRMED (FR-PAY-002)
  paidAt            DateTime          @default(now()) @map("paid_at")
  checkoutRequestId String            @map("checkout_request_id") // OD-012, FR-CHK-001-016
  requestHash       String            @map("request_hash")        // sha256 payload ternormalisasi
  subtotal          Decimal           @db.Decimal(14, 2)
  total             Decimal           @db.Decimal(14, 2)          // = subtotal (DR-013)
  createdAt         DateTime          @default(now()) @map("created_at")

  merchant       Merchant           @relation(fields: [merchantId], references: [id])
  outlet         Outlet             @relation(fields: [outletId], references: [id])
  operator       User               @relation("OperatorTransactions", fields: [operatorUserId], references: [id])
  items          TransactionItem[]
  stockMovements StockMovement[]

  @@unique([merchantId, checkoutRequestId])   // DR-014, BR-008
  @@unique([merchantId, transactionNumber])   // DR-003
  @@index([merchantId, outletId, createdAt])
  @@map("transaction")
}

model TransactionItem {
  id                  String  @id @default(uuid())
  transactionId       String  @map("transaction_id")
  productId           String  @map("product_id")
  productNameSnapshot String  @map("product_name_snapshot")  // BR-006/007: snapshot
  unitPriceSnapshot   Decimal @map("unit_price_snapshot") @db.Decimal(14, 2)
  quantity            Int
  subtotal            Decimal @db.Decimal(14, 2)              // unitPriceSnapshot × quantity (BR-003)

  transaction Transaction @relation(fields: [transactionId], references: [id])
  product     Product     @relation(fields: [productId], references: [id])

  @@index([transactionId])
  @@map("transaction_item")
}

model AiInsight {                                // FR-AI-004/005/008; ERD 05b `ai_insight`
  id          String         @id @default(uuid())
  merchantId  String         @map("merchant_id")
  type        String                               // 'SALES_TREND' | 'OUTLET_COMPARISON' | ...
  periodStart DateTime       @map("period_start")
  periodEnd   DateTime       @map("period_end")
  dataVersion String         @map("data_version")
  title       String
  content     String         @db.Text
  evidenceSummary Json @map("evidence_summary")   // hasil lengkap saja (FR-AI-005)
  status      InsightStatus                         // READY | STALE; proses ada di AiAnalysisJob
  generatedAt DateTime       @map("generated_at")

  merchant Merchant @relation(fields: [merchantId], references: [id])

  @@unique([merchantId, type])                     // hasil terbaru satu tipe per Merchant
  @@map("ai_insight")
}

model AiAnalysisJob {                            // FR-AI-006/007; ERD 05b `ai_analysis_job`
  id            String    @id @default(uuid())
  merchantId    String    @map("merchant_id")
  analysisDate  DateTime  @map("analysis_date") @db.Date   // tanggal lokal Merchant (BR-018)
  state         AiAnalysisJobState
  attempts      Int       @default(0)
  nextRetryAt   DateTime? @map("next_retry_at")
  errorCategory String?   @map("error_category")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  merchant Merchant @relation(fields: [merchantId], references: [id])

  @@unique([merchantId, analysisDate])            // FR-AI-007: satu analisis per Merchant per hari
  @@map("ai_analysis_job")
}
```

**Integrity hardening:** migration `20260816223000_harden_database_integrity` menegakkan threshold nonnegatif, `payment_status = CONFIRMED`, serta relasi Merchant-safe untuk Product–Category dan stok/harga per Outlet. CHECK quantity nonnegatif serta kombinasi role–Outlet User telah ada pada migration awal dan tetap berlaku. `transaction_number_seq` tetap dikelola Sales dan tidak diubah migration ini.

**Datasource kedua (read replica)** tidak didefinisikan lewat Prisma schema kedua (Prisma 1 schema = 1 datasource per client), melainkan lewat **2 instance `PrismaClient`** yang di-construct manual di `libs/platform/prisma`:

```ts
// libs/platform/src/prisma/prisma-write.service.ts
@Injectable()
export class PrismaWriteService extends PrismaClient {
  constructor() { super({ datasources: { db: { url: process.env.DATABASE_URL_WRITE } } }); }
}

// libs/platform/src/prisma/prisma-read.service.ts
@Injectable()
export class PrismaReadService extends PrismaClient {
  constructor() { super({ datasources: { db: { url: process.env.DATABASE_URL_READ } } }); }
}
```
`SalesModule` menyediakan `SalesReportingReadPort`; implementasinya membaca fakta `Transaction` `COMPLETED` dari read replica secara bounded. `ReportingModule` mengagregasi fakta tersebut saat cache miss dan tidak mengakses persistence Sales secara langsung. `InsightModule` memperoleh dataset hanya melalui `ReportingReadPort`, lalu worker menulis `AiAnalysisJob` dan `AiInsight` melalui `PrismaWriteService`. Ini menjaga setiap consumer hanya mengenal kontrak publik modul lain.

**Pembuatan Owner + Merchant:** `Merchant.owner` dan `User.ownedMerchant` dimodelkan sebagai relasi Prisma satu-ke-satu, sementara `User.merchant` tetap relasi keanggotaan Merchant. Registrasi membuat kedua UUID lebih dahulu lalu menyimpan keduanya dalam satu transaksi; FK Owner tetap `DEFERRABLE INITIALLY DEFERRED` agar relasi silang dapat tervalidasi saat commit, bukan sebelum User Owner dibuat.

**Catatan penyesuaian dari versi lama:**
- Tidak ada model `Payment`, `IdempotencyRecord`, `OutboxEvent`, `JobRecord`, `ReportingProjection`, maupun `RefreshToken` — seluruhnya kontradiktif dengan keputusan `Locked` Iterasi 1.
- `Transaction.paymentMethod/paymentStatus/paidAt` menggantikan tabel `Payment`.
- `Transaction.checkoutRequestId/requestHash` menggantikan tabel `IdempotencyRecord`.
- `AiAnalysisJob` menggantikan `JobRecord`; periode Merchant-wide 30 hari lokal diturunkan dari `analysis_date`, sehingga job hanya menyimpan state dan retry.
- `AiInsight` menggantikan `Insight`; `merchant_id + type` unik sehingga hasil terbaru dapat di-upsert tanpa histori per tipe.
- `operator_user_id` menggantikan `cashier_user_id`; `stock_movement.transaction_id` menggantikan `reference_id`.
- Relasi FK ditambahkan mengikuti ERD 05b (mis. `Inventory.merchant_id`, `ProductOutletPrice` ke Merchant/Outlet/Product, `StockMovement.transaction_id`).

---

## 5. API contract

Konvensi global (berlaku semua endpoint):
- Base path `/api/v1`. Auth via `Authorization: Bearer <jwt>`; `merchantId` dan `role` selalu berasal dari klaim JWT tervalidasi. Outlet Kasir berasal dari klaim JWT; selector Outlet milik Owner/Admin pada path/body/query wajib divalidasi berada dalam Merchant dari JWT (FR-TEN-010).
- Uang dikirim sebagai string desimal (`"total": "125000.00"`), waktu ISO-8601 dengan offset (API-005/006).
- Pagination: `?page=0&size=20` (maks `size=100`).
- Semua response dibungkus **response/error envelope** (detail di `07` §0), kecuali operasi `DELETE` yang berhasil dan secara eksplisit memakai `204 No Content` tanpa body:
  - sukses (2xx): `{ "success": true, "statusCode": 200, "message": "<deskripsi>", "data": { ... } }` — payload berada di `data`;
  - error (non-2xx): `{ "success": false, "statusCode": 400, "path": "/api/v1/...", "message": "<pesan>", "errors": [{ "field": "...", "message": "..." }], "timestamp": "..." }` — `errors` opsional (hanya untuk detail per field). `X-Correlation-Id` disertakan via header, bukan body.
- Implementasi response sukses berada pada `SuccessResponseInterceptor` global di `platform`; controller hanya mengembalikan DTO bisnis. `@SuccessMessage()` menetapkan `message` endpoint, sedangkan default yang aman dipakai bila metadata belum ditetapkan. Interceptor melewati `204` agar Express tidak mengirim body yang melanggar HTTP.
- Contoh error:
```json
{ "success": false, "statusCode": 409, "path": "/api/v1/checkout", "message": "Stok tidak mencukupi",
  "errors": [{ "field": "items[1].productId", "message": "stock=1, requested=3" }],
  "timestamp": "2026-08-13T14:30:00.000Z" }
```

### 5.1 Identity — `/auth`, `/staff`
| Method & Path | Role | Deskripsi |
|---|---|---|
| `POST /auth/register` | publik | Registrasi Owner + buat Merchant |
| `POST /auth/login` | publik | Login → `{accessToken, expiresIn, role, merchantId, outletId}` |

> Tidak ada endpoint `POST /auth/refresh` dan `POST /auth/logout` pada MVP. Logout dilakukan client dengan menghapus token (`OD-011`, `FR-AUTH-008`).

| Method & Path | Role | Deskripsi |
|---|---|---|
| `POST /staff` | OWNER | Buat staf `{name,email,password,role,outletId?}` |
| `GET /staff` | OWNER | List staf (paginated) |
| `PATCH /staff/:userId` | OWNER | Ubah role/outlet/status/reset password |

### 5.2 Tenant — `/merchant`, `/outlets`
| Method & Path | Role | Deskripsi |
|---|---|---|
| `GET /merchant` | semua role | Detail merchant sendiri |
| `PATCH /merchant` | OWNER | Ubah profil Merchant; tidak ada konfigurasi low-stock global |
| `POST /outlets` | OWNER | Buat outlet |
| `GET /outlets` | OWNER, ADMIN | List outlet |
| `PATCH /outlets/:id` | OWNER | Ubah/nonaktifkan outlet |

### 5.3 Catalog — `/categories`, `/products`
| Method & Path | Role | Deskripsi |
|---|---|---|
| `POST /categories` | OWNER, ADMIN | Buat category |
| `GET /categories` | semua role | List (Kasir hanya lihat aktif) |
| `PATCH /categories/:id` | OWNER, ADMIN | Ubah nama / nonaktifkan (soft) |
| `POST /products` | OWNER, ADMIN | `{name, price, categoryId, lowStockThreshold, isActive}`; threshold dasar wajib |
| `GET /products?search=&categoryId=&page=` | OWNER, ADMIN | List/search seluruh produk |
| `GET /products/catalog?search=&categoryId=&page=&outletId=` | CASHIER, OWNER | Produk aktif yang punya inventory row di Outlet POS yang sah (Kasir: Outlet tugasnya; Owner: Outlet aktif yang dipilih); pencarian/filter dilakukan server dan UI dapat memfilter hasil yang sudah dimuat |
| `PATCH /products/:id` | OWNER, ADMIN | Ubah nama/harga master/category/status |
| `PUT /products/:id/outlet-prices/:outletId` | OWNER, ADMIN | Set harga override per Outlet (`outlet_product_price`) (FR-CAT-010) |
| `DELETE /products/:id/outlet-prices/:outletId` | OWNER, ADMIN | Hapus override; harga efektif kembali ke harga master |

> `OWNER` mewarisi seluruh permission `ADMIN` (`BR-011B`, `UR-OWN-005B`), sehingga mampu menulis Category/Product/harga, bukan read-only.

### 5.4 Inventory — `/inventory`
| Method & Path | Role | Deskripsi |
|---|---|---|
| `GET /inventory?outletId=&productId=&page=` | OWNER, ADMIN | Lihat stok seluruh Merchant; `outletId` adalah filter opsional |
| `POST /inventory/adjustments` | OWNER, ADMIN | `{outletId, productId, delta, reason}` |
| `PUT /inventory/:productId/outlets/:outletId/low-stock-threshold` | OWNER, ADMIN | Set threshold override Product–Outlet; `DELETE` menghapus override dan fallback ke threshold Product (FR-INV-007A) |
| `GET /inventory/movements?outletId=&productId=&page=` | OWNER, ADMIN | Riwayat StockMovement seluruh Merchant; `outletId` adalah filter opsional |

### 5.5 Sales — `/checkout`, `/transactions`, `/receipts`

**`POST /checkout`** — CASHIER (Outlet tugasnya) atau OWNER (Outlet aktif yang dipilih dalam Merchant). Admin ditolak (`OD-010`, `BR-011B`).

> Cart Iterasi 1 = **client-side only**: keranjang dikelola di frontend, tidak ada endpoint `/cart/*` di REST. Checkout menerima `items` inline seperti di bawah. Tidak ada tabel `cart`/`cart_item` di skema (YAGNI).

Request:
```json
{
  "checkoutRequestId": "a3f5c9d2-4b7e-4f3a-9c1d-8e6f2a1b3c4d",
  "outletId": "uuid",
  "items": [{ "productId": "uuid", "quantity": 2, "expectedUnitPrice": "15000.00" }],
  "paymentMethod": "CASH"
}
```
`expectedUnitPrice` hanya untuk deteksi `PRICE_CHANGED` yang ramah UX — server selalu hitung ulang dari **harga efektif** (`ProductOutletPrice` bila ada, fallback `Product.price`, FR-CAT-011/BR-012). Pada MVP, tidak ada diskon, pajak, atau service charge sehingga `total = subtotal` (`OD-004`, `DR-013`); client tidak mengirim `amount` karena server yang menghitung total final (`FR-CART-005/006`).

Response `200 COMPLETED`:
```json
{
  "success": true, "statusCode": 200, "message": "Checkout berhasil",
  "data": {
    "transactionId": "uuid", "transactionNumber": "INV-2026-000123", "status": "COMPLETED",
    "outletId": "uuid", "operator": {"id":"uuid","role":"CASHIER","name":"..."},
    "items": [{"productId":"uuid","name":"...","unitPrice":"15000.00","quantity":2,"subtotal":"30000.00"}],
    "subtotal": "30000.00",
    "total": "30000.00",
    "payment": {"method":"CASH","status":"CONFIRMED","paidAt":"2026-08-13T10:00:00+07:00"},
    "createdAt": "2026-08-13T10:00:00+07:00"
  }
}
```

| Method & Path | Role | Deskripsi |
|---|---|---|
| `GET /transactions/status?checkoutRequestId=` | CASHIER, OWNER | Lookup status checkout sesuai scope (Kasir: transaksi miliknya; Owner: seluruh Merchant) |
| `GET /transactions?dateFrom=&dateTo=&page=&outletId=` | OWNER, CASHIER (hanya transaksi sendiri — `OD-003`) | List riwayat; seluruh hasil berstatus `COMPLETED` pada MVP |
| `GET /transactions/:id` | sesuai scope | Detail transaksi |
| `GET /transactions/search?transactionNumber=` | sesuai scope | Cari exact by transaction number |
| `GET /receipts/:transactionId` | sesuai scope | Receipt dari snapshot, bukan re-query katalog saat ini |

> Admin tidak memiliki akses ke `GET /transactions*` dan `GET /receipts*`; lihat transaksi hanya untuk Owner (seluruh Merchant) dan Kasir (riwayat dirinya di Outlet tugasnya).

### 5.6 Reporting — `/dashboard`
| Method & Path | Role |
|---|---|
| `GET /dashboard/summary?dateFrom=&dateTo=&outletId=` | OWNER |
| `GET /dashboard/operations?outletId=` | ADMIN, OWNER (inventory summary, low-stock, dan kondisi katalog; tanpa metrik penjualan) |
| `GET /dashboard/sales-trend?dateFrom=&dateTo=&bucket=DAY` | OWNER |
| `GET /dashboard/aov-trend?dateFrom=&dateTo=&bucket=DAY` | OWNER |
| `GET /dashboard/time-pattern?dateFrom=&dateTo=` | OWNER |
| `GET /dashboard/top-products?dateFrom=&dateTo=&limit=10` | OWNER |
| `GET /dashboard/outlet-comparison?dateFrom=&dateTo=` | OWNER |
| `GET /dashboard/low-stock?outletId=` | OWNER (inventory read-only), ADMIN (`outletId` opsional dalam Merchant) |

Semua endpoint bisnis Owner membaca lewat **cache-aside**: cache hit (umur ≤30 menit) mengembalikan cached aggregate; cache miss meminta fakta `Transaction` `COMPLETED` secara bounded melalui `SalesReportingReadPort` (yang membaca read replica), lalu menyimpan hasil bersama `data_updated_at` (TTL 30 menit, single-flight per key). Semua respons dashboard membawa `DashboardMeta` seragam: `data_updated_at`, `freshness_status`, dan `timezone`; endpoint bisnis Owner juga menyertakan periode analisis. Endpoint `operations` dan `low-stock` membaca current state melalui read port Catalog/Inventory, bukan aggregate penjualan, sehingga tidak membuka metrik bisnis kepada Admin.

### 5.7 Insight BI — `/insights`

> **Notifikasi:** Modul `insight` mengimplementasikan fitur "AI Insight" sebagai **Business Intelligence (BI)** — menghasilkan beberapa tipe insight analitik (bukan satu tipe), dengan LLM sebagai mesin pengerja/penjelas melalui `AiProviderPort`.

| Method & Path | Role |
|---|---|
| `POST /insights/trigger` | OWNER only — tanpa body; temukan atau buat `AiAnalysisJob` dengan dedupe `merchant_id + analysis_date` (tanggal lokal Merchant). Worker menganalisis seluruh Merchant untuk 30 hari kalender lokal yang diturunkan dari `analysis_date`. |
| `GET /insights` | OWNER only — hasil insight terbaru per tipe (beberapa tipe BI; tanpa histori) |

## 6. Pola implementasi kritis

### 6.1 Checkout atomik + idempotency (`libs/sales/application/checkout.service.ts`)

```ts
@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly tenant: TenantAuthorizationService,
    private readonly inventory: StockReservationPort,
  ) {}

  async checkout(actor: AuthenticatedUser, dto: CheckoutDto) {
    // OD-010: Kasir => outlet tugasnya; Owner => outlet aktif yang dipilih; Admin ditolak oleh RolesGuard.
    if (actor.role === 'CASHIER' && dto.outletId !== actor.outletId) {
      throw new ForbiddenException();
    }
    if (actor.role === 'OWNER') {
      await this.tenant.assertActiveOutletInMerchant(actor.merchantId, dto.outletId);
    }

    // request_hash deterministik dari payload ternormalisasi + scope (FR-CHK-002)
    const normalizedItems = normalizeCheckoutItems(dto.items); // gabung Product sama + urut Product ID
    const requestHash = sha256(canonicalJson({
      merchantId: actor.merchantId,
      outletId: dto.outletId,
      operatorUserId: actor.userId,
      items: normalizedItems,
      paymentMethod: dto.paymentMethod,
    }));

    return this.prisma.$transaction(async (tx) => {
      // 1) idempotency: unique (merchant_id, checkout_request_id) — BR-008/009, DR-014
      const existing = await tx.transaction.findUnique({
        where: { merchantId_checkoutRequestId: {
          merchantId: actor.merchantId, checkoutRequestId: dto.checkoutRequestId,
        }},
      });
      if (existing) {
        if (existing.requestHash !== requestHash) throw new IdempotencyConflictException();
        return this.loadReceipt(tx, existing.id);   // FR-CHK-003: kembalikan transaksi yang sama
      }

      // 2) validasi produk aktif + harga efektif server (master atau override per Outlet)
      const priced = await this.priceAndValidate(tx, actor.merchantId, dto.outletId, normalizedItems);

      // 3) buat Transaction beserta atribut pembayaran CONFIRMED + lines snapshot (OD-001, OD-004)
      const transaction = await tx.transaction.create({
        data: {
          merchantId: actor.merchantId, outletId: dto.outletId,
          operatorUserId: actor.userId,               // ERD 05b: operator (Kasir atau Owner)
          transactionNumber: await this.nextTransactionNumber(tx),   // sequence, bukan tabel (poin 4)
          status: 'COMPLETED',
          paymentMethod: dto.paymentMethod,
          paymentStatus: 'CONFIRMED',
          paidAt: new Date(),
          checkoutRequestId: dto.checkoutRequestId,
          requestHash,
          subtotal: priced.subtotal,
          total: priced.subtotal,                     // total = subtotal (DR-013)
          items: { create: priced.lines.map(l => ({
            productId: l.productId, productNameSnapshot: l.name,
            unitPriceSnapshot: l.unitPrice, quantity: l.quantity, subtotal: l.subtotal,
          })) },
        },
      });

      // 4) port inventory mengurangi stok dan menulis StockMovement dengan before/after aktual.
      const reservation = await this.inventory.reserveForSale({
        merchantId: actor.merchantId, outletId: dto.outletId, transactionId: transaction.id,
        actorUserId: actor.userId, tx,
        lines: priced.lines.map(({ productId, quantity }) => ({ productId, quantity })),
      });
      if (!reservation.ok) throw new InsufficientStockException(reservation.insufficient);

      return this.loadReceipt(tx, transaction.id);
    }, { isolationLevel: 'ReadCommitted' });
  }
}
```

- Semua perubahan (Transaction + payment attributes + lines + stock + StockMovement) commit sebagai **satu unit atomik** (`FR-CHK-006/007`, `NFR-REL-003`); kegagalan stok di langkah 4 membuat seluruh transaksi rollback.
- `normalizeCheckoutItems` menggabungkan Product duplikat dan mengurutkan Product ID sebelum hash serta reservasi. Hash juga mengikat `operator_user_id`, sehingga request ID yang dipakai ulang oleh operator atau payload berbeda selalu menjadi `IDEMPOTENCY_CONFLICT`.
- `StockReservationPort` (implementasi `PrismaStockReservationRepository` di `libs/inventory`) melakukan conditional atomic update per Product dalam urutan Product ID terurut (anti-deadlock), memakai `UPDATE ... RETURNING`; `quantity_before/after` diambil dari nilai aktual hasil update, bukan pembacaan sebelumnya. Jika satu item tidak cukup, seluruh transaksi checkout rollback (`FR-INV-006`). SQL konkret:
  ```sql
  UPDATE "inventory"
  SET quantity = quantity - $qty, updated_at = NOW()
  WHERE outlet_id = $outlet AND product_id = $product AND quantity >= $qty
  RETURNING quantity AS quantity_after;
  ```
- **Idempotency** dijamin oleh unique constraint `(merchant_id, checkout_request_id)`. Pada submit bersamaan, hanya satu yang berhasil `create`; request lain yang kena unique violation (`P2002`) harus menangkap error, membaca ulang Transaction yang sama, membandingkan `request_hash`, lalu mengembalikan receipt yang sama atau `IDEMPOTENCY_CONFLICT` (`FR-CHK-003/004`). Tidak ada tabel `IdempotencyRecord` (`OD-012`).
- **`transaction_number`** berbentuk `INV-{YYYY}-{seq}` (`BR-018`, `DR-003`). Nilai `seq` diambil atomik lewat **Postgres sequence** `transaction_number_seq` (`SELECT nextval('transaction_number_seq')`) di dalam transaksi checkout — **bukan tabel counter** (keputusan Iterasi 1). Sequence dibuat oleh migration raw SQL `20260816210000_add_transaction_number_sequence`; unik global sehingga otomatis unik per Merchant. `YYYY` dihitung dari `created_at` dalam timezone Merchant (`merchant.timezone`); contoh `INV-2026-000123`. SQL:
  ```sql
  SELECT 'INV-' || to_char(NOW(), 'YYYY') || '-' || lpad(nextval('transaction_number_seq')::text, 6, '0');
  ```
- Checkout **tidak** menulis outbox dan **tidak** membangun/menginvalidasi cache reporting (`FR-CHK-014/015`). Report dibangun saat dashboard dibuka.

### 6.2 Worker: pemrosesan `AiAnalysisJob` (`apps/worker`, via `libs/insight`)

```ts
@Injectable()
export class AiAnalysisJobService {
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly jobRepository: AiAnalysisJobRepository,
    private readonly generation: InsightGenerationJob,   // baca dataset lewat ReportingReadPort
  ) {}

  @Cron('*/30 * * * * *')   // proses Node terpisah dari yang melayani HTTP checkout
  async processDue() {
    // claimNextDue atomik: PENDING tanpa nextRetryAt, atau RETRY_SCHEDULED yang sudah due.
    // Implementasi di libs/insight/.../ai-analysis-job.repository.ts memakai satu
    // statement $queryRaw (SELECT ... FOR UPDATE SKIP LOCKED -> UPDATE ke PROCESSING
    // -> RETURNING) agar beberapa instance Worker tidak memproses job yang sama.
    const job = await this.jobRepository.claimNextDue();
    if (!job) return;
    try {
      const result = await this.generation.generate(job);   // tenant-safe; update AiInsight per tipe (FR-AI-007)
      await this.prisma.aiAnalysisJob.update({
        where: { id: job.id },
        data: { state: 'READY', updatedAt: new Date() },
      });
    } catch (err) {
      await this.markRetry(job, err);   // backoff, max attempts -> FAILED (FR-AI-006, FR-OPS-005)
    }
  }
}
```

- Satu `AiAnalysisJob` per `(merchant_id, analysis_date)` dipastikan oleh unique constraint (`FR-AI-007`); trigger ulang memakai job yang sama. Worker menurunkan periode Merchant-wide 30 hari lokal secara deterministik dari `analysis_date` dan timezone Merchant.
- Claim job bersifat atomik dan aman untuk banyak Worker. Job `PENDING` tidak membutuhkan `next_retry_at`; hanya `RETRY_SCHEDULED` yang membandingkan waktu retry. SQL:
  ```sql
  WITH claimed AS (
    SELECT id FROM "ai_analysis_job"
    WHERE state IN ('PENDING', 'RETRY_SCHEDULED')
      AND (
        (state = 'PENDING' AND next_retry_at IS NULL)
        OR (state = 'RETRY_SCHEDULED' AND next_retry_at <= NOW())
      )
    ORDER BY created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE "ai_analysis_job"
  SET state = 'PROCESSING', updated_at = NOW()
  FROM claimed
  WHERE "ai_analysis_job".id = claimed.id
  RETURNING "ai_analysis_job".*;
  ```
- Insight generation membaca dataset lewat `ReportingReadPort` (cached aggregate atau agregasi bounded saat miss), **bukan** membaca tabel Transaction mentah dari modul insight.
- Worker **tidak** menangani reporting; dashboard memakai cache-aside (`FR-REP-001`).

### 6.3 Guard otorisasi

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CASHIER', 'OWNER')           // OD-010: Admin tidak memiliki permission checkout
@Post('checkout')
async checkout(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CheckoutDto) { ... }
```
`RolesGuard` cek klaim JWT; service layer tetap cek scope eksplisit lewat `TenantAuthorizationService.assertOutletOwnedByActor(...)` — dua lapis, sesuai SRS §7.2 (ID dari input tidak boleh dipercaya tanpa dicocokkan ke field User). `owner` memilih `outletId` aktif dalam Merchant; Kasir wajib memakai `User.outlet_id`-nya.

---

## 7. Penegakan batas modul — `.dependency-cruiser.cjs`

```js
module.exports = {
  forbidden: [
    {
      name: 'no-cross-module-internal-import',
      comment: 'Modul lain hanya boleh import lewat barrel index.ts',
      severity: 'error',
      from: { path: '^libs/(?!platform)([^/]+)/src' },
      to: { path: '^libs/(?!platform)([^/]+)/src/(?!index\\.ts)', pathNot: '^libs/$1/src' },
    },
    {
      name: 'reporting-insight-no-direct-sales-table-access',
      comment: 'reporting & insight tidak boleh depend ke infrastructure sales/inventory/catalog langsung',
      severity: 'error',
      from: { path: '^libs/(reporting|insight)/src' },
      to: { path: '^libs/(sales|inventory|catalog)/src/infrastructure' },
    },
  ],
};
```
Dijalankan wajib di CI: `npx depcruise --config .dependency-cruiser.cjs --validate libs apps`.

---

## 8. Matriks otorisasi (ringkas)

| Domain | OWNER | ADMIN | CASHIER |
|---|---|---|---|
| Merchant/Outlet CRUD | Full | Read outlet | - |
| Staff lifecycle | Full | - | - |
| Category/Product | Full (warisi Admin) | Full | Read aktif (scope outlet) |
| Inventory adjustment | Full (warisi Admin) | Full | - |
| Cart/Checkout | Full pada Outlet aktif yang dipilih | - | Full (Outlet tugasnya) |
| Transaction history | Full merchant | - | Hanya transaksi sendiri (`OD-003` locked) |
| Dashboard | Bisnis lengkap + operasional | Operasional: inventory summary, low-stock, kondisi katalog | - |
| Insight BI | Full | - | - |

> `OWNER` mewarisi seluruh permission `ADMIN` dan `CASHIER` (`BR-011B`); kolom di atas mencerminkan warisan tersebut, bukan matriks lama yang membatasi Owner hanya read-only di katalog/inventory.

---

## 9. Isolasi workload checkout vs reporting/AI

1. **Connection terpisah** — `PrismaWriteService` (primary) dipakai identity/tenant/catalog/inventory/sales/ai-job; implementasi `SalesReportingReadPort` memakai `PrismaReadService` (read replica). Insight memperoleh dataset melalui Reporting. Burst baca dashboard tidak bisa menghabiskan koneksi yang dibutuhkan checkout.

   **Read replica lag diterima (keputusan Iterasi 1, poin 5):** replikasi asinkron Neon bisa tertinggal hingga beberapa detik, dan itu **tidak** memicu fallback/retry. Konsumen baca (dashboard via cache-aside, dataset AI) sudah toleran — freshness diukur dari umur cache (`data_updated_at`), bukan dari sinkronisasi replika. `GET /health` hanya mengecek primary + proses worker, tidak mengecek replika (lihat `07` §8.2).
2. **Cache-aside reporting** — dashboard dan AI memakai shared cache Redis TTL 30 menit; cache miss meminta fakta `Transaction` `COMPLETED` melalui `SalesReportingReadPort` yang membaca read replica secara bounded dan dilindungi single-flight per key (`FR-REP-001/008`, `FR-REP-009`). Checkout tidak menyentuh cache/agregasi (`FR-CHK-014/015`).
3. **Proses terpisah** — `apps/worker` khusus `AiAnalysisJob` dijalankan sebagai service Railway kedua dari image yang sama, sehingga beban CPU/koneksi worker AI tidak berbagi resource dengan proses yang melayani checkout, dan bisa di-scale independen (NFR-SCALE-004).
4. **Degradation order** (SRS §15) — tunda insight generation lebih dulu; batasi concurrency cache miss/agregasi; layani dashboard dari data terakhir berstatus stale; pertahankan product lookup dan checkout selama dependency inti sehat; jika transaksi tidak dapat dijamin benar, tolak checkout dengan jelas.
5. **Trigger pindah ke message broker**: hanya kalau backlog `ai_analysis_job` (diukur via NFR-OBS-002/FR-OPS-003) konsisten melebihi target meski worker sudah di-scale up.

---

## 10. Roadmap ekstraksi ke microservices (pasca-MVP, kalau terbukti perlu)

| Tahap | Yang diekstrak | Prasyarat | Alasan urutan |
|---|---|---|---|
| 0 (sekarang) | Modular monolith, 2 deployable (`api`, `worker`) | Modul dipisah bersih via `libs/*` + dependency-cruiser | Baseline murah, sudah punya isolasi resource |
| 1 | `insight` → service terpisah | Sudah 100% baca dari `ReportingReadPort`, tidak query tabel Transaction mentah | Paling CPU/network-intensive, paling toleran gagal |
| 2 | `reporting` → service/queue sendiri (bila perlu) | Kontrak `ReportingReadPort` dan cache-aside stabil | Read-heavy; cache-aside sudah memisahkan beban agregasi dari checkout |
| 3 | `sales`/checkout → service terpisah (opsional) | Hanya kalau load test tunjukkan bottleneck nyata | Paling mahal & berisiko — checkout adalah jalur uang |

---

## 11. Test plan

| Level | Fokus | Tools |
|---|---|---|
| Unit | Perhitungan total, formula metrik, keputusan retry job AI | Jest |
| Integration | Checkout end-to-end, tenant scope negative test | Jest + `testcontainers` Postgres |
| Concurrency | AT-004 (2 kasir rebutan stok terakhir), AT-005/006 (submit `checkout_request_id` sama berurutan/bersamaan), dan AT-031 (2 Worker mengklaim satu `AiAnalysisJob`) | Jest + `Promise.all` + Postgres integration test |
| Insight status API | AT-032 (`GET /insights` mengembalikan `analysis_job` meski hasil belum tersedia) | Supertest + Postgres integration test |
| Security | Matrix role × endpoint (termasuk Owner checkout & Owner tulis katalog), cross-tenant ID | `supertest` |
| Performance | Checkout p95 ≤500ms baseline; mixed workload reporting/AI | k6 |
| Fault injection | DB gagal di tengah commit → rollback penuh; AI worker mati → checkout tetap sukses; cache gagal → dashboard `STALE` | `testcontainers` + fault injection manual |
| Cache | Cache hit/miss/TTL/fallback `STALE`, single-flight per key, cache expire/rebuild | Integration + Redis test |
| Architecture | `dependency-cruiser` gagal build kalau modul melanggar batas | CI step |

---

## 12. Urutan implementasi (sprint order)

1. **Platform + Identity + Tenant** — Prisma schema awal, JWT auth (access token 900 detik, tanpa refresh token), Owner registration, staff lifecycle, error format global, correlation-id middleware, shared cache (Redis) setup.
2. **Catalog + Inventory** — Category/Product CRUD, harga override per Outlet, inventory per outlet, stock adjustment + StockMovement, threshold override.
3. **Sales (Checkout + Receipt)** — modul paling kritis; cart client-side (frontend) lalu checkout kirim `items` inline; idempotency via `checkout_request_id` + `request_hash` pada Transaction; termasuk concurrency test stok terakhir dan dukungan Owner checkout.
4. **Reporting (cache-aside) + dashboard read API** — aggregator bounded dari fakta `Transaction` `COMPLETED` melalui `SalesReportingReadPort`, cache Redis TTL 30 menit, single-flight, freshness `FRESH`/`STALE`.
5. **Insight/AI** — `AiAnalysisJob` + worker poller + adapter LLM melalui `AiProviderPort`; dataset selalu berasal dari `ReportingReadPort`.
6. **NFR hardening** — rate limiting, load test, security test matrix, observability (**Prometheus scrape `/metrics` + dashboard Grafana**), backup/restore test.
7. **DevOps** — CI/CD, deployment Railway (`api` + `worker` + Neon primary/replica + Redis), setup **Prometheus + Grafana** (scrape `/metrics`, dashboard operasional, alert), README setup lokal.

---

## 13. Dampak decision gate

| Decision gate | Dampak ke desain ini |
|---|---|
| `DG-001` / `OD-001` | **Locked**: atribut pembayaran `payment_method`/`payment_status = CONFIRMED`/`paid_at` langsung pada `Transaction`; **tidak ada tabel `Payment`** dan tidak ada field `amount` pembayaran terpisah (`DR-013`) |
| `DG-002` / `OD-002` | **Locked**: harga master global + override per Outlet. Tabel `outlet_product_price`; `CheckoutService` ambil dari situ dulu, fallback ke `Product.price` |
| `DG-005` / `OD-006` | **Locked**: cache-aside shared cache TTL 30 menit; cache miss mengagregasi `Transaction` `COMPLETED`; checkout tidak menginvalidasi cache; data lebih lama hanya fallback `STALE` |
| `DG-009` / `OD-010` | **Locked**: `OWNER` mewarisi seluruh permission `ADMIN` dan `CASHIER`; Owner checkout pada Outlet aktif yang dipilih, Kasir hanya pada Outlet tugasnya, Admin tidak checkout. `@Roles('CASHIER', 'OWNER')` + validasi scope di service |
| `DG-010` / `OD-003` | **Locked**: scope riwayat Kasir = transaksi sendiri; query `GET /transactions` untuk CASHIER difilter `operatorUserId = actor.userId` — tidak mengubah skema |
| `DG-011` / `OD-011` | **Locked**: satu JWT access token 900 detik; tanpa refresh token/revocation server-side; logout menghapus token dari client; setiap request memvalidasi signature, expiry, dan status akun saat ini |
| `DG-012` / `OD-012` | **Locked**: `checkout_request_id` (UUID dari client) dan `request_hash` disimpan pada `Transaction`; unique `merchant_id + checkout_request_id`; `request_hash` tidak harus unik; tanpa tabel `IdempotencyRecord` |
| `DG-006` provider AI | **Locked**: insight memakai LLM melalui `AiProviderPort`; implementasi provider tidak mengubah `InsightTriggerService`. |

Dokumen ini tidak mengasumsikan decision gate yang masih `Open` sebagai final, mengikuti hierarki pada `00-iterasi-1-document-guide.md` §3. Keputusan yang sudah `Locked` menjadi dasar implementasi.
