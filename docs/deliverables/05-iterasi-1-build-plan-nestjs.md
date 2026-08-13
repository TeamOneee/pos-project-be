# Iterasi 1 — Rencana Pembangunan Aplikasi K (NestJS Modular Monolith)

> Dokumen ini **menggantikan sepenuhnya** `05-iterasi-1-build-plan-modular-monolith.md` (versi Spring Boot) dan `06-iterasi-1-build-plan-nestjs-adjustment.md` (adendum). Stack final: **NestJS + Prisma + PostgreSQL (Neon) + React**. Sumber kebenaran requirement tetap di `01`–`04` (business flow, URS, SRS, FRD) — dokumen ini murni turunan implementasi. Bila ada konflik, SRS menang.

---

## 0. Keputusan arsitektur inti

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Gaya arsitektur | **Modular monolith** dalam **Nest monorepo** (bukan microservices dari awal) | Tim kecil, biaya harus rendah, tapi tetap butuh isolasi *workload* (checkout vs reporting vs AI) — microservices di awal menambah biaya operasional tanpa bukti kebutuhan (StudyCase §5: *architectural improvement, bukan sekadar infra*) |
| Batas modul | Per **bounded context bisnis** (Identity, Tenant, Catalog, Inventory, Sales, Reporting, Insight, Audit), masing-masing jadi `libs/*` di Nest monorepo | Supaya tiap modul bisa diekstrak jadi service sendiri nanti tanpa refactor besar |
| Komunikasi antar modul | In-process, hanya lewat **barrel export** (`index.ts`) tiap `lib`, tidak pernah import file internal modul lain | Ini yang membuat monolith bisa dipecah nanti tanpa "distributed ball of mud" |
| Penegakan batas modul | **`dependency-cruiser`** dijalankan di CI (Nest tidak punya *module boundary checker* bawaan seperti Spring Modulith) | Build gagal kalau ada modul yang melanggar batas — bukti konkret untuk "Architectural Justification" |
| Isolasi checkout vs reporting/AI | **2 deployable dari 1 codebase**: `apps/api` (HTTP, melayani checkout/CRUD) dan `apps/worker` (proses terpisah, jalankan outbox relay + job AI), plus **2 datasource Postgres** (primary utk write, read replica utk reporting/AI) | Checkout tidak pernah menunggu/berbagi resource dengan reporting/AI, tanpa perlu microservice terpisah dulu |
| Database | 1 Postgres (Neon), 1 schema, banyak modul, diakses lewat **Prisma** | Modular monolith tidak butuh DB-per-modul; yang wajib adalah tidak ada modul lain yang query tabel modul lain secara langsung |
| Job queue | **Outbox table + `@nestjs/schedule` polling**, bukan Redis/BullMQ dari awal | Cukup untuk skala target (500 merchant); upgrade ke broker kalau backlog terbukti jadi bottleneck |

---

## 1. Tech stack

| Layer | Pilihan | Catatan |
|---|---|---|
| Backend | **NestJS (TypeScript), Nest monorepo mode** | `apps/api`, `apps/worker`, `libs/*` per modul |
| ORM & migration | **Prisma** | 1 `schema.prisma`, migration via `prisma migrate` (DR-009: versioned & reproducible) |
| Database | **PostgreSQL (Neon)** — primary + read replica | Primary: write path (identity, tenant, catalog, inventory, sales). Replica: reporting, insight |
| Auth | `@nestjs/passport` + `@nestjs/jwt` + `passport-jwt` | Access token pendek + refresh token (FR-AUTH-007/008) |
| Password hashing | **`argon2`** | NFR-SEC-001 |
| Validasi | **`class-validator` + `class-transformer`** via global `ValidationPipe` | Backend tetap validator final (NFR-MNT-002) |
| Rate limiting | **`@nestjs/throttler`** | Login & checkout (FR-AUTH-010, NFR-SEC-008) |
| Correlation ID | **`nestjs-cls`** + middleware | NFR-OBS-001/005 |
| Background job | **Outbox table (Prisma) + `@nestjs/schedule`** di `apps/worker` | Reporting projection + AI insight generation |
| Circuit breaker (AI provider eksternal, opsional) | **`cockatiel`** | EXT-AI-003 |
| Observability | **`nestjs-pino`** (structured JSON log) + `@willsoto/nestjs-prometheus` | NFR-OBS-001–005 |
| API docs | **`@nestjs/swagger`** | API-007 |
| Test | **Jest** + `supertest` (e2e) + **`testcontainers`** (Postgres asli utk integration test) | NFR-MNT-008 |
| Frontend | **React + Vite + TypeScript**, `@tanstack/react-query`, `react-hook-form` + `zod`, `recharts` | |
| Deployment | **Railway**: 2 service (`apps/api`, `apps/worker`) dari 1 repo, **Neon** primary+replica | |
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
│   │   └── app.module.ts           # import: Identity, Tenant, Catalog, Inventory, Sales, Reporting, Insight, Audit Module
│   └── worker/src/
│       ├── main.ts                 # NestFactory.createApplicationContext (tanpa HTTP, atau HTTP minimal utk healthcheck)
│       └── worker.module.ts        # import: OutboxRelayModule, JobRunnerModule, Reporting(Projection)Module, InsightModule
│
├── libs/
│   ├── platform/src/
│   │   ├── error/                   ApiError, ErrorCode enum, AllExceptionsFilter
│   │   ├── security/                 CorrelationIdMiddleware, JwtAuthGuard, RolesGuard, CurrentUser decorator
│   │   ├── money/                    Money helper (Prisma.Decimal wrapper)
│   │   ├── outbox/                   OutboxService, OutboxRelayService
│   │   ├── job/                      JobRecordService (retry+backoff+dead-letter)
│   │   ├── prisma/                   PrismaWriteService, PrismaReadService
│   │   └── index.ts                  # satu-satunya pintu masuk modul lain
│   │
│   ├── identity/src/{application,infrastructure,web}/  + index.ts    # AuthService, StaffService
│   ├── tenant/src/{...}/                                + index.ts    # MerchantService, OutletService, TenantAuthorizationService
│   ├── catalog/src/{...}/                               + index.ts    # CategoryService, ProductService
│   ├── inventory/src/{...}/                             + index.ts    # InventoryService, StockMovementService
│   ├── sales/src/{...}/                                 + index.ts    # CartService, CheckoutService, ReceiptService, IdempotencyService
│   ├── reporting/src/{...}/                             + index.ts    # ProjectionUpdateService (worker), DashboardQueryService (api)
│   ├── insight/src/{...}/                                + index.ts    # InsightTriggerService, InsightGenerationJob, AiProviderPort
│   └── audit/src/{...}/                                  + index.ts    # AuditListener (@OnEvent), AuditQueryService
│
└── test/                             # e2e (supertest) + testcontainers setup
```

`tsconfig.json` path alias: `@app/platform`, `@app/identity`, `@app/tenant`, `@app/catalog`, `@app/inventory`, `@app/sales`, `@app/reporting`, `@app/insight`, `@app/audit` — masing-masing menunjuk ke `libs/<nama>/src/index.ts`. Modul lain **hanya** boleh `import { CheckoutService } from '@app/sales'`, tidak pernah ke file internal.

---

## 3. Aturan ketergantungan antar modul (wajib)

```
identity   -> platform
tenant     -> identity, platform
catalog    -> tenant, platform
inventory  -> catalog, tenant, platform
sales      -> catalog, inventory, tenant, identity, platform
reporting  -> platform            (baca lewat outbox event / ReportingProjection, TIDAK query tabel sales langsung)
insight    -> reporting, platform (baca lewat ReportingProjection, bukan tabel Transaction mentah)
audit      -> platform            (didengarkan semua modul via @OnEvent, bukan dipanggil langsung)
```

Ditegakkan oleh `dependency-cruiser` di CI (lihat §7). Aturan keras yang sama seperti rencana sebelumnya: `reporting`/`insight` tidak boleh depend ke `infrastructure` milik `sales`/`inventory`/`catalog` — ini yang membuat modul-modul itu bisa diekstrak ke service terpisah nanti tanpa migrasi skema besar.

---

## 4. Skema database — `prisma/schema.prisma` (sudah dikoreksi dari ERD kamu)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")       // primary, dipakai apps/api utk write
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
  FAILED
  REJECTED
}

enum PaymentMethod {
  CASH
  CASHLESS_MANUAL
}

enum StockMovementType {
  ADJUSTMENT
  SALE
}

enum InsightStatus {
  PENDING
  PROCESSING
  READY
  RETRY_SCHEDULED
  FAILED
  STALE
}

model Merchant {
  id                 String   @id @default(uuid())
  ownerUserId        String   @unique @map("owner_user_id")
  name               String
  timezone           String   @default("Asia/Jakarta")          // BR-018: batas hari laporan
  currency           String   @default("IDR")
  lowStockThreshold  Int      @default(5) @map("low_stock_threshold")  // FR-INV-008, DR-011A: harus >= 0 (app-level check)
  status             AccountStatus @default(ACTIVE)
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  outlets    Outlet[]
  users      User[]
  categories Category[]
  products   Product[]

  @@map("merchant")
}

model Outlet {
  id         String   @id @default(uuid())
  merchantId String   @map("merchant_id")
  name       String
  address    String?
  status     AccountStatus @default(ACTIVE)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  merchant Merchant @relation(fields: [merchantId], references: [id])
  users    User[]

  @@index([merchantId])
  @@map("outlet")
}

model User {
  id               String        @id @default(uuid())
  merchantId       String        @map("merchant_id")
  outletId         String?       @map("outlet_id")     // null utk OWNER/ADMIN, wajib utk CASHIER (CHECK constraint via raw SQL migration)
  emailNormalized  String        @unique @map("email_normalized")
  emailOriginal    String        @map("email_original")
  passwordHash     String        @map("password_hash")
  fullName         String        @map("full_name")
  role             UserRole
  status           AccountStatus @default(ACTIVE)
  createdBy        String?       @map("created_by")
  createdAt        DateTime      @default(now()) @map("created_at")
  updatedAt        DateTime      @updatedAt @map("updated_at")

  merchant Merchant @relation(fields: [merchantId], references: [id])
  outlet   Outlet?  @relation(fields: [outletId], references: [id])

  @@index([merchantId, role])
  @@map("users")
}
// migration tambahan (raw SQL) setelah prisma migrate:
// ALTER TABLE users ADD CONSTRAINT chk_cashier_outlet CHECK (
//   (role = 'CASHIER' AND outlet_id IS NOT NULL) OR (role IN ('OWNER','ADMIN') AND outlet_id IS NULL)
// );

model Category {
  id         String   @id @default(uuid())
  merchantId String   @map("merchant_id")
  name       String
  isActive   Boolean  @default(true) @map("is_active")   // <-- FIX: field ini hilang di ERD kamu (BR-019)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  merchant Merchant  @relation(fields: [merchantId], references: [id])
  products Product[]

  @@unique([merchantId, name])   // DR-010
  @@map("category")
}

model Product {
  id         String   @id @default(uuid())
  merchantId String   @map("merchant_id")
  categoryId String   @map("category_id")
  name       String
  price      Decimal  @db.Decimal(14, 2)                  // BR-001
  isActive   Boolean  @default(true) @map("is_active")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  merchant  Merchant    @relation(fields: [merchantId], references: [id])
  category  Category    @relation(fields: [categoryId], references: [id])
  inventory Inventory[]

  @@index([merchantId, isActive])
  @@map("product")
}

model Inventory {
  id         String   @id @default(uuid())
  merchantId String   @map("merchant_id")     // <-- FIX: tidak ada di ERD kamu, wajib (DR-007)
  outletId   String   @map("outlet_id")
  productId  String   @map("product_id")
  quantity   Int      @default(0)             // CHECK quantity >= 0 (raw SQL migration)
  updatedAt  DateTime @updatedAt @map("updated_at")

  product Product @relation(fields: [productId], references: [id])

  @@unique([outletId, productId])
  @@index([merchantId])
  @@map("inventory")
}

model StockMovement {
  id             String             @id @default(uuid())
  merchantId     String             @map("merchant_id")   // <-- FIX: tabel ini hilang total di ERD kamu (FR-INV-003)
  outletId       String             @map("outlet_id")
  productId      String             @map("product_id")
  type           StockMovementType
  delta          Int
  quantityBefore Int                @map("quantity_before")
  quantityAfter  Int                @map("quantity_after")
  reason         String?                                   // wajib diisi utk ADJUSTMENT (app-level validation)
  referenceId    String?            @map("reference_id")   // transaction_id kalau type = SALE
  actorUserId    String             @map("actor_user_id")
  createdAt      DateTime           @default(now()) @map("created_at")

  @@index([outletId, productId, createdAt])
  @@map("stock_movement")
}

model Cart {
  id         String   @id @default(uuid())
  merchantId String   @map("merchant_id")
  outletId   String   @map("outlet_id")
  userId     String   @map("user_id")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  items CartItem[]

  @@map("cart")
}

model CartItem {
  id        String  @id @default(uuid())
  cartId    String  @map("cart_id")
  productId String  @map("product_id")
  quantity  Int
  unitPrice Decimal @map("unit_price") @db.Decimal(14, 2)   // HANYA display; checkout WAJIB hitung ulang dari Product.price (BR-012)

  cart Cart @relation(fields: [cartId], references: [id])

  @@map("cart_item")
}

model Transaction {
  id              String             @id @default(uuid())
  merchantId      String             @map("merchant_id")     // <-- FIX: tidak ada di ERD kamu (DR-007)
  outletId        String             @map("outlet_id")
  cashierUserId   String             @map("cashier_user_id")
  receiptNumber   String             @map("receipt_number")
  status          TransactionStatus                          // <-- FIX: field ini hilang di ERD kamu (FR-CHK-010/011)
  subtotal        Decimal            @db.Decimal(14, 2)
  total           Decimal            @db.Decimal(14, 2)
  createdAt       DateTime           @default(now()) @map("created_at")

  lines   TransactionLine[]
  payment Payment?

  @@unique([merchantId, receiptNumber])   // <-- FIX: DR-003 unique per-merchant, bukan global
  @@index([merchantId, outletId, createdAt])
  @@map("transaction")
}

model TransactionLine {
  id                   String  @id @default(uuid())
  transactionId        String  @map("transaction_id")
  productId            String  @map("product_id")
  productNameSnapshot  String  @map("product_name_snapshot")  // <-- FIX: hilang di ERD kamu (BR-006)
  unitPriceSnapshot    Decimal @map("unit_price_snapshot") @db.Decimal(14, 2)
  quantity             Int
  subtotal             Decimal @db.Decimal(14, 2)

  transaction Transaction @relation(fields: [transactionId], references: [id])

  @@index([transactionId])
  @@map("transaction_line")
}

model Payment {
  id            String        @id @default(uuid())
  transactionId String        @unique @map("transaction_id")   // <-- FIX: tabel ini hilang total di ERD kamu (FR-PAY-001–007)
  method        PaymentMethod
  amount        Decimal       @db.Decimal(14, 2)
  status        String        @default("CONFIRMED")
  confirmedBy   String        @map("confirmed_by")
  confirmedAt   DateTime      @default(now()) @map("confirmed_at")

  transaction Transaction @relation(fields: [transactionId], references: [id])

  @@map("payment")
}

model IdempotencyRecord {
  id                  String   @id @default(uuid())
  merchantId          String   @map("merchant_id")     // <-- FIX: tabel ini hilang total di ERD kamu — PALING KRITIS (FR-CHK-001–004)
  outletId            String   @map("outlet_id")
  actorUserId         String   @map("actor_user_id")
  idempotencyKey      String   @map("idempotency_key")
  payloadFingerprint  String   @map("payload_fingerprint")   // sha256(payload)
  state               String                                  // PROCESSING | COMPLETED | FAILED
  transactionId       String?  @map("transaction_id")
  expiresAt           DateTime @map("expires_at")
  createdAt           DateTime @default(now()) @map("created_at")

  @@unique([merchantId, outletId, idempotencyKey])   // BR-008
  @@map("idempotency_record")
}

model OutboxEvent {
  id             String   @id @default(uuid())
  aggregateType  String   @map("aggregate_type")     // 'TRANSACTION'
  aggregateId    String   @map("aggregate_id")
  eventType      String   @map("event_type")          // 'TransactionCompletedEvent'
  payload        Json
  status         String   @default("PENDING")         // PENDING | PROCESSED | FAILED
  attempts       Int      @default(0)
  nextAttemptAt  DateTime @default(now()) @map("next_attempt_at")
  createdAt      DateTime @default(now()) @map("created_at")

  @@index([status, nextAttemptAt])
  @@map("outbox_event")
}

model JobRecord {
  id               String   @id @default(uuid())
  type             String                              // 'REPORTING_PROJECTION' | 'AI_INSIGHT'
  tenantMerchantId String   @map("tenant_merchant_id")
  dedupeKey        String   @map("dedupe_key")
  state            String                              // PENDING | PROCESSING | READY | RETRY_SCHEDULED | FAILED
  attempts         Int      @default(0)
  nextRetryAt      DateTime? @map("next_retry_at")
  errorCategory    String?  @map("error_category")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@unique([type, dedupeKey])   // FR-AI-007 idempotent job
  @@map("job_record")
}

model ReportingProjection {
  id               String   @id @default(uuid())
  merchantId       String   @map("merchant_id")
  outletId         String?  @map("outlet_id")          // null = agregat seluruh merchant
  periodStart      DateTime @map("period_start")
  periodEnd        DateTime @map("period_end")
  granularity      String                               // 'HOUR' | 'DAY'
  grossSales       Decimal  @map("gross_sales") @db.Decimal(16, 2)
  transactionCount BigInt   @map("transaction_count")
  unitsSold        Decimal  @map("units_sold") @db.Decimal(16, 0)
  metrics          Json                                  // top_products, least_selling, outlet_comparison, dll
  sourceWatermark  DateTime @map("source_watermark")
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@unique([merchantId, outletId, periodStart, granularity])
  @@index([merchantId, periodStart])
  @@map("reporting_projection")
}

model Insight {
  id           String        @id @default(uuid())
  merchantId   String        @map("merchant_id")
  outletId     String?       @map("outlet_id")
  type         String                                    // 'SALES_TREND' | 'OUTLET_COMPARISON' | ...
  periodStart  DateTime      @map("period_start")          // <-- FIX: hilang di ERD kamu (FR-AI-004)
  periodEnd    DateTime      @map("period_end")
  dataVersion  String        @map("data_version")
  title        String
  explanation  String?       @db.Text
  evidence     Json?
  status       InsightStatus                              // <-- FIX: hilang di ERD kamu — insight WAJIB punya status job
  generatedAt  DateTime?     @map("generated_at")
  createdAt    DateTime      @default(now()) @map("created_at")

  @@index([merchantId, createdAt])
  @@map("insight")
}

model AuditEvent {
  id            String   @id @default(uuid())   // <-- FIX: tabel ini hilang total di ERD kamu (FR-AUD-001–006)
  merchantId    String   @map("merchant_id")
  outletId      String?  @map("outlet_id")
  actorUserId   String   @map("actor_user_id")
  action        String                            // 'STAFF_CREATED', 'PRICE_CHANGED', 'STOCK_ADJUSTED', 'CHECKOUT_COMPLETED', dll
  targetType    String   @map("target_type")
  targetId      String   @map("target_id")
  beforeJson    Json?    @map("before_json")
  afterJson     Json?    @map("after_json")
  correlationId String   @map("correlation_id")
  result        String                             // SUCCESS | DENIED | ERROR
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([merchantId, createdAt])
  @@map("audit_event")
}
```

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
  constructor() { super({ datasources: { db: { url: process.env.DATABASE_URL_READ_REPLICA } } }); }
}
```
`ReportingModule` dan `InsightModule` inject `PrismaReadService`; modul lain inject `PrismaWriteService`. Ini yang mewujudkan isolasi workload di §0.

---

## 5. API contract

Konvensi global (berlaku semua endpoint):
- Base path `/api/v1`. Auth via `Authorization: Bearer <jwt>`; `merchantId`/`role`/`outletId` selalu diambil dari klaim JWT tervalidasi, **tidak pernah** dari body request (FR-TEN-010).
- Uang dikirim sebagai string desimal (`"total": "125000.00"`), waktu ISO-8601 dengan offset (API-005/006).
- Pagination: `?page=0&size=20` (maks `size=100`).
- Format error konsisten (semua non-2xx):
```json
{ "code": "INSUFFICIENT_STOCK", "message": "Stok tidak mencukupi.", "correlationId": "c-9f2a...",
  "details": [{ "field": "items[1].productId", "reason": "stock=1, requested=3" }] }
```

### 5.1 Identity — `/auth`, `/staff`
| Method & Path | Role | Deskripsi |
|---|---|---|
| `POST /auth/register` | publik | Registrasi Owner + buat Merchant |
| `POST /auth/login` | publik | Login → `{accessToken, refreshToken, expiresIn, role}` |
| `POST /auth/logout` | authenticated | Revoke session |
| `POST /auth/refresh` | authenticated | Refresh access token |
| `POST /staff` | OWNER | Buat staf `{name,email,password,role,outletId?}` |
| `GET /staff` | OWNER | List staf (paginated) |
| `PATCH /staff/:userId` | OWNER | Ubah role/outlet/status/reset password |

### 5.2 Tenant — `/merchant`, `/outlets`
| Method & Path | Role | Deskripsi |
|---|---|---|
| `GET /merchant` | semua role | Detail merchant sendiri |
| `PATCH /merchant` | OWNER | Ubah setting termasuk `lowStockThreshold` |
| `POST /outlets` | OWNER | Buat outlet |
| `GET /outlets` | OWNER, ADMIN | List outlet |
| `PATCH /outlets/:id` | OWNER | Ubah/nonaktifkan outlet |

### 5.3 Catalog — `/categories`, `/products`
| Method & Path | Role | Deskripsi |
|---|---|---|
| `POST /categories` | OWNER, ADMIN | Buat category |
| `GET /categories` | semua role | List (Kasir hanya lihat aktif) |
| `PATCH /categories/:id` | OWNER, ADMIN | Ubah nama / nonaktifkan (soft) |
| `POST /products` | OWNER, ADMIN | `{name, price, categoryId, isActive}` |
| `GET /products?search=&categoryId=&page=` | OWNER, ADMIN | List/search seluruh produk |
| `GET /products/catalog?outletId=` | CASHIER | Produk aktif yang punya inventory row di outlet tugasnya |
| `PATCH /products/:id` | OWNER, ADMIN | Ubah nama/harga/category/status |

### 5.4 Inventory — `/inventory`
| Method & Path | Role | Deskripsi |
|---|---|---|
| `GET /inventory?outletId=&productId=&page=` | OWNER, ADMIN | Lihat stok |
| `POST /inventory/adjustments` | OWNER, ADMIN | `{outletId, productId, delta, reason}` |
| `GET /inventory/movements?outletId=&productId=&page=` | OWNER, ADMIN | Riwayat stock movement |

### 5.5 Sales — `/cart`, `/checkout`, `/transactions`, `/receipts`

**`POST /checkout`** — CASHIER only

Request:
```json
{
  "idempotencyKey": "a3f5c9d2-client-generated",
  "outletId": "uuid",
  "items": [{ "productId": "uuid", "quantity": 2, "expectedUnitPrice": "15000.00" }],
  "payment": { "method": "CASH", "amount": "30000.00" }
}
```
`expectedUnitPrice` hanya untuk deteksi `PRICE_CHANGED` yang ramah UX — server selalu hitung ulang dari `Product.price` (BR-012).

Response `200 COMPLETED`:
```json
{
  "transactionId": "uuid", "receiptNumber": "INV-2026-000123", "status": "COMPLETED",
  "outletId": "uuid", "cashier": {"id":"uuid","name":"..."},
  "items": [{"productId":"uuid","name":"...","unitPrice":"15000.00","quantity":2,"subtotal":"30000.00"}],
  "total": "30000.00", "payment": {"method":"CASH","amount":"30000.00","status":"CONFIRMED"},
  "createdAt": "2026-08-13T10:00:00+07:00"
}
```

| Method & Path | Role | Deskripsi |
|---|---|---|
| `GET /transactions/status?idempotencyKey=` | CASHIER | Lookup status checkout |
| `GET /transactions?dateFrom=&dateTo=&status=&page=` | OWNER, ADMIN, CASHIER (scope `OD-003`) | List riwayat |
| `GET /transactions/:id` | sesuai scope | Detail transaksi |
| `GET /transactions/search?receiptNumber=` | sesuai scope | Cari exact by receipt number |
| `GET /receipts/:transactionId` | sesuai scope | Receipt dari snapshot, bukan re-query katalog saat ini |

### 5.6 Reporting — `/dashboard`
| Method & Path | Role |
|---|---|
| `GET /dashboard/summary?dateFrom=&dateTo=&outletId=` | OWNER, ADMIN(operasional) |
| `GET /dashboard/sales-trend?dateFrom=&dateTo=&bucket=DAY` | OWNER |
| `GET /dashboard/aov-trend?dateFrom=&dateTo=&bucket=DAY` | OWNER |
| `GET /dashboard/time-pattern?dateFrom=&dateTo=` | OWNER |
| `GET /dashboard/top-products?dateFrom=&dateTo=&limit=10` | OWNER |
| `GET /dashboard/outlet-comparison?dateFrom=&dateTo=` | OWNER |
| `GET /dashboard/low-stock?threshold=` | OWNER, ADMIN |

Semua response menyertakan `dataUpdatedAt` dan `freshnessStatus: "FRESH"|"STALE"`.

### 5.7 Insight BI — `/insights`

> **Notifikasi:** Modul `insight` mengimplementasikan fitur "AI Insight" sebagai **Business Intelligence (BI)** — menghasilkan beberapa tipe insight analitik (bukan satu tipe), dengan AI sebagai mesin pengerja/penjelas.

| Method & Path | Role |
|---|---|
| `POST /insights/trigger` | OWNER only — `{type, dateFrom, dateTo, outletId?}` → `202 {jobId, status:"PENDING"}` (maks. 1x/hari/merchant; tipe: SALES_TREND, OUTLET_COMPARISON, TOP_PRODUCTS, TIME_PATTERN, AOV_TREND) |
| `GET /insights` | OWNER only — hasil insight terbaru per tipe (beberapa tipe BI; tanpa histori) |

### 5.8 Audit — `/audit`
| Method & Path | Role |
|---|---|
| `GET /audit?actorId=&action=&dateFrom=&dateTo=&page=` | OWNER |

---

## 6. Pola implementasi kritis

### 6.1 Checkout atomik + idempotency (`libs/sales/application/checkout.service.ts`)

```ts
@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly outbox: OutboxService,
  ) {}

  async checkout(actor: AuthenticatedUser, dto: CheckoutDto) {
    const fingerprint = sha256(canonicalJson({
      outletId: dto.outletId, items: dto.items, payment: dto.payment,
    }));

    return this.prisma.$transaction(async (tx) => {
      // 1) idempotency guard (BR-008/009)
      const existing = await tx.idempotencyRecord.findUnique({
        where: { merchantId_outletId_idempotencyKey: {
          merchantId: actor.merchantId, outletId: dto.outletId, idempotencyKey: dto.idempotencyKey,
        }},
      });
      if (existing) {
        if (existing.payloadFingerprint !== fingerprint) throw new IdempotencyConflictException();
        if (existing.state === 'COMPLETED') return this.loadReceipt(tx, existing.transactionId);
        if (existing.state === 'PROCESSING') throw new CheckoutProcessingException();
      } else {
        await tx.idempotencyRecord.create({ data: {
          merchantId: actor.merchantId, outletId: dto.outletId, actorUserId: actor.userId,
          idempotencyKey: dto.idempotencyKey, payloadFingerprint: fingerprint,
          state: 'PROCESSING', expiresAt: addHours(new Date(), 24),
        }});
      }

      // 2) validasi produk aktif + harga server (BR-012, FR-CART-005/006/007)
      const priced = await this.priceAndValidate(tx, actor.merchantId, dto.items);

      // 3) kurangi stok atomik — conditional update, bukan pessimistic lock (FR-INV-004, AT-004)
      for (const line of priced.lines) {
        const result = await tx.inventory.updateMany({
          where: { outletId: dto.outletId, productId: line.productId, quantity: { gte: line.quantity } },
          data: { quantity: { decrement: line.quantity } },
        });
        if (result.count === 0) throw new InsufficientStockException(line.productId);
        await tx.stockMovement.create({ data: {
          merchantId: actor.merchantId, outletId: dto.outletId, productId: line.productId,
          type: 'SALE', delta: -line.quantity,
          quantityBefore: line.stockBefore, quantityAfter: line.stockBefore - line.quantity,
          actorUserId: actor.userId,
        }});
      }

      // 4) commit transaction + lines + payment
      const transaction = await tx.transaction.create({ data: {
        merchantId: actor.merchantId, outletId: dto.outletId, cashierUserId: actor.userId,
        receiptNumber: await this.nextReceiptNumber(tx, actor.merchantId),
        status: 'COMPLETED', subtotal: priced.subtotal, total: priced.total,
        lines: { create: priced.lines.map(l => ({
          productId: l.productId, productNameSnapshot: l.name,
          unitPriceSnapshot: l.unitPrice, quantity: l.quantity, subtotal: l.subtotal,
        })) },
        payment: { create: {
          method: dto.payment.method, amount: dto.payment.amount,
          status: 'CONFIRMED', confirmedBy: actor.userId,
        }},
      }});

      // 5) outbox event — transaksi Prisma yang sama, checkout tidak menunggu worker (FR-CHK-014)
      await this.outbox.publish(tx, 'TransactionCompletedEvent', { transactionId: transaction.id });

      // 6) tandai idempotency record selesai
      await tx.idempotencyRecord.update({
        where: { merchantId_outletId_idempotencyKey: {
          merchantId: actor.merchantId, outletId: dto.outletId, idempotencyKey: dto.idempotencyKey,
        }}, data: { state: 'COMPLETED', transactionId: transaction.id },
      });

      return this.loadReceipt(tx, transaction.id);
    }, { isolationLevel: 'ReadCommitted' });
  }
}
```

Pengurangan stok memakai **conditional atomic update** (`updateMany` + `WHERE quantity >= x`, cek `result.count`) karena Prisma tidak expose `SELECT ... FOR UPDATE` secara native. Postgres menjamin atomicity per-statement, jadi AT-004 (dua Kasir rebutan stok terakhir → tepat satu berhasil) tetap terpenuhi tanpa pessimistic lock eksplisit.

### 6.2 Worker: outbox relay (`apps/worker`, via `libs/platform/outbox`)

```ts
@Injectable()
export class OutboxRelayService {
  constructor(
    private readonly prisma: PrismaWriteService,   // baca outbox dari primary (data terbaru)
    private readonly projection: ProjectionUpdateService,
  ) {}

  @Cron('*/5 * * * * *')   // proses Node terpisah dari yang melayani HTTP checkout
  async relay() {
    const pending = await this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING', nextAttemptAt: { lte: new Date() } },
      orderBy: { createdAt: 'asc' }, take: 50,
    });
    for (const event of pending) {
      try {
        await this.projection.applyEvent(event);
        await this.prisma.outboxEvent.update({ where: { id: event.id }, data: { status: 'PROCESSED' } });
      } catch (err) {
        await this.markRetry(event, err);   // backoff, max attempts -> FAILED (FR-OPS-005)
      }
    }
  }
}
```

### 6.3 Guard otorisasi

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CASHIER')
@Post('checkout')
async checkout(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CheckoutDto) { ... }
```
`RolesGuard` cek klaim JWT; service layer tetap cek scope eksplisit lewat `TenantAuthorizationService.assertOutletOwnedByActor(...)` — dua lapis, sesuai SRS §7.2 (ID dari input tidak boleh dipercaya tanpa dicocokkan ke field User).

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
| Category/Product | Full | Full | Read aktif (scope outlet) |
| Inventory adjustment | Full | Full | - |
| Cart/Checkout | - | - | Full (outlet sendiri) |
| Transaction history | Full merchant | Full merchant | Sesuai `OD-003` (default: outlet sendiri) |
| Dashboard | Full | Operasional + low-stock | - |
| Insight BI | Full | - | - |
| Audit | Full | - | - |

---

## 9. Isolasi workload checkout vs reporting/AI

1. **Connection terpisah** — `PrismaWriteService` (primary) dipakai identity/tenant/catalog/inventory/sales; `PrismaReadService` (read replica) dipakai reporting/insight. Burst baca dashboard tidak bisa menghabiskan koneksi yang dibutuhkan checkout.
2. **Outbox pattern** — checkout menulis `outbox_event` dalam transaksi yang sama, lalu selesai; worker baca belakangan. Checkout tidak pernah menunggu reporting/AI (FR-CHK-014/015).
3. **Proses terpisah** — `apps/worker` dijalankan sebagai service Railway kedua dari image yang sama, sehingga beban CPU/koneksi worker tidak berbagi resource dengan proses yang melayani checkout, dan bisa di-scale independen (NFR-SCALE-004).
4. **Degradation order** (SRS §15) — worker selalu memprioritaskan `outbox_event` (reporting) di atas `job_record type=AI_INSIGHT`, karena AI paling toleran telat.
5. **Trigger pindah ke message broker**: hanya kalau backlog `outbox_event`/`job_record` (diukur via NFR-OBS-002/FR-OPS-003) konsisten melebihi target freshness (5 menit) meski worker sudah di-scale up.

---

## 10. Roadmap ekstraksi ke microservices (pasca-MVP, kalau terbukti perlu)

| Tahap | Yang diekstrak | Prasyarat | Alasan urutan |
|---|---|---|---|
| 0 (sekarang) | Modular monolith, 2 deployable (`api`, `worker`) | Modul dipisah bersih via `libs/*` + dependency-cruiser | Baseline murah, sudah punya isolasi resource |
| 1 | `insight` → service terpisah | Sudah 100% baca dari `ReportingProjection`, tidak query tabel sales langsung | Paling CPU/network-intensive, paling toleran gagal |
| 2 | `reporting` worker → service dengan read-model sendiri | Event contract (`TransactionCompletedEvent`) stabil & versioned | Read-heavy, sudah terpisah lewat outbox |
| 3 | `sales`/checkout → service terpisah (opsional) | Hanya kalau load test tunjukkan bottleneck nyata | Paling mahal & berisiko — checkout adalah jalur uang |

---

## 11. Test plan

| Level | Fokus | Tools |
|---|---|---|
| Unit | Perhitungan total, formula metrik, keputusan retry job | Jest |
| Integration | Checkout end-to-end, tenant scope negative test | Jest + `testcontainers` Postgres |
| Concurrency | AT-004 (2 kasir rebutan stok terakhir) — 2 request paralel | Jest + `Promise.all` |
| Security | Matrix role × endpoint, cross-tenant ID | `supertest` |
| Performance | Checkout p95 ≤500ms baseline; mixed workload | k6 |
| Fault injection | DB gagal di tengah commit → rollback penuh; worker mati → checkout tetap sukses | `testcontainers` + fault injection manual |
| Architecture | `dependency-cruiser` gagal build kalau modul melanggar batas | CI step |

---

## 12. Urutan implementasi (sprint order)

1. **Platform + Identity + Tenant** — Prisma schema awal, JWT auth, Owner registration, staff lifecycle, error format global, correlation-id middleware.
2. **Catalog + Inventory** — Category/Product CRUD, inventory per outlet, stock adjustment + StockMovement.
3. **Sales (Cart + Checkout + Payment + Receipt + Idempotency)** — modul paling kritis; termasuk concurrency test stok terakhir.
4. **Outbox + Reporting projection + Dashboard read API** — `apps/worker` pertama kali dijalankan di sini.
5. **Audit trail** — `@OnEvent` listener lintas modul (bisa paralel dengan 2–4).
6. **Insight/AI** — mulai dari `RuleBasedInsightAdapter` (analitik dari `ReportingProjection`, tanpa provider eksternal) supaya demo tidak bergantung API pihak ketiga.
7. **NFR hardening** — rate limiting, load test, security test matrix, observability, backup/restore test.
8. **DevOps** — CI/CD, deployment Railway (`api` + `worker` + Neon primary/replica), README setup lokal.

---

## 13. Dampak decision gate yang masih `Open`

| Decision gate | Dampak ke desain ini kalau berubah |
|---|---|
| `DG-002` harga global vs override per Outlet | Tambah tabel `product_outlet_price`; `CheckoutService` ambil dari situ dulu, fallback ke `Product.price` |
| `DG-009`/`OD-010` checkout Owner/Admin | **Locked**: hanya Kasir yang checkout. `@Roles(CASHIER)` + validasi `outletId` dari klaim JWT; tidak ada perluasan role |
| `OD-003` scope riwayat Kasir | Query `GET /transactions` untuk CASHIER tinggal tambah/hapus filter `cashierUserId = actor.userId` — tidak mengubah skema |
| `DG-006` provider AI eksternal | Sudah diantisipasi lewat `AiProviderPort` interface — tinggal tambah adapter baru tanpa ubah `InsightTriggerService` |

Dokumen ini tidak mengasumsikan decision gate yang masih `Open` sebagai final, mengikuti aturan §8 `00-document-guide.md`. Keputusan yang sudah `Locked` (mis. `OD-007` multi-tipe BI dan `OD-010` checkout hanya Kasir) menjadi dasar implementasi.
