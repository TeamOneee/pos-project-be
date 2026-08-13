# SYSTEM FLOW — KESELURUHAN MODULE (Multi-Outlet POS + BI/AI)

Dokumen ini memetakan **alur sistem secara keseluruhan** — dari setup merchant sampai keputusan
bisnis Owner — berdasarkan `module-implementation-guide.md` dan deliverables (URS/SRS/FRD).

Berisi diagram berjenjang:
- **Bagian A** — Gambaran besar (context) & arsitektur.
- **Bagian B** — Alur utama (end-to-end): Register → Setup → Operasional → Reporting → AI.
- **Bagian C** — Alur detail per-module (13 module).
- **Bagian D** — Matriks alur & referensi silang.

> Teknis detail per endpoint: lihat `module-implementation-guide.md`. Detail AI analyze (DB baseline → BullMQ): lihat `ai-analyze-flow.md`.

---

## A. Gambaran Besar

### A.1 Konteks Sistem

```mermaid
flowchart LR
    subgraph Actor
        O[Owner] 
        A[Admin]
        K[Kasir / CASHIER]
        P[AI Provider]
    end
    subgraph System[Backend - POS SaaS]
        API[API Server]
        W[Workers: Reporting / AI]
    end
    subgraph Storage
        DB[(PostgreSQL - data operasional)]
        REDIS[(Redis - queue L2 / cache)]
    end

    O --> API
    A --> API
    K --> API
    API --> DB
    API --> REDIS
    API --> W
    W --> DB
    W --> P
```

### A.2 Jalur Prioritas (dari Business Flow)

```mermaid
flowchart LR
    A[Checkout - jalur uang]:::ops --> B[Stok & riwayat diperbarui]:::ops
    C[Reporting/Dashboard]:::info --> D[Owner membaca kondisi]:::info
    E[AI Insight - manual]:::ai --> F[Owner mengambil keputusan]:::ai

    classDef ops fill:#d9ead3,stroke:#38761d
    classDef info fill:#fff2cc,stroke:#bf9000
    classDef ai fill:#d9d2e9,stroke:#674ea7

    A -. "harus langsung & pasti" .-> B
    C -. "boleh tertinggal beberapa menit" .-> D
    E -. "boleh selesai belakangan" .-> F
```

**Prioritas: Operasional (checkout) > Informasi (reporting) > Insight (AI).** Reporting & AI tidak boleh
memperlambat checkout (FR-AI-001, business flow §3).

### A.3 End-to-End (Ringkas)

```mermaid
flowchart TD
    R[Register - Merchant + Owner] --> S[Setup]
    subgraph Setup
        O1[Buat Outlet] --> O2[Buat User: Admin & Kasir]
        O2 --> O3[Buat Category & Product]
        O3 --> O4[Isi Stock per Outlet]
    end
    S --> OP[Operasional Harian]
    subgraph Op[Operasional Harian]
        C1[Kasir menyusun Cart] --> C2[Checkout - Payment]
        C2 --> C3[Stok menurun + riwayat transaksi]
    end
    OP --> RP[Reporting / Dashboard]
    RP --> AI[AI Insight - manual]
    AI --> D[Owner mengambil keputusan]
    D -.->|perbaiki cara jual| S
```

---

## B. Alur Utama (End-to-End)

### B.1 Onboarding & Setup (Register → Stock)

```mermaid
sequenceDiagram
    actor Owner
    participant API as Auth/Merchant
    participant UoW as UnitOfWork
    participant DB as PostgreSQL

    Owner->>API: POST /auth/register (merchant.name, user)
    API->>API: ensureEmailAvailable(email)
    API->>UoW: run(tx)
    UoW->>DB: create merchant (MerchantPort)
    UoW->>DB: create user role=OWNER (UserPort)
    UoW-->>API: commit (atau rollback bila gagal)
    API-->>Owner: { merchant, user, accessToken }

    Note over Owner,DB: Setup berikutnya (OWNER)
    Owner->>API: POST /outlets (name, address)
    API->>DB: create outlet
    Owner->>API: POST /users (role=ADMIN|CASHIER)
    API->>DB: validasi email unik + aturan role
    Owner->>API: Admin: POST /categories → POST /products
    Admin->>API: PUT /inventory (quantity, reason) + POST /inventory/transfer
```

### B.2 Operasional: Cart → Checkout (Jalur Prioritas Tertinggi)

```mermaid
sequenceDiagram
    actor K as Kasir
    participant UI as POS Web
    participant C as Cart Module
    participant P as Product Port
    participant I as Inventory Port
    participant T as Transaction Module
    participant UoW as UnitOfWork
    participant DB as PostgreSQL

    K->>UI: Cari & pilih produk
    UI->>C: POST /cart/items (product_id, quantity)
    C->>P: ensureActive(product_id)
    C->>I: getStock(outlet_id, product_id)
    C-->>UI: cart + snapshot unit_price

    K->>UI: Konfirmasi pembayaran
    UI->>T: POST /transactions { idempotency_key, payment_method, cart_id }
    T->>DB: cek idempotency (Payment.idempotency_key)
    alt sudah pernah checkout (idempotent)
        T-->>UI: 200 transaksi yang sama (tanpa proses ulang)
    else baru
        T->>T: validasi ulang product/stock/harga
        T->>UoW: run(tx)
        UoW->>DB: create transaction + items + Payment (CONFIRMED)
        UoW->>I: decreaseStock(tiap item, tx)
        UoW->>C: clearAfterCheckout(tx)
        UoW-->>T: commit (atau rollback penuh)
        T-->>UI: transaction + items + payment + receipt
    end
```

> Jika salah satu gagal (stok habis, harga berubah) → **rollback semua**, tidak ada transaksi parsial
> (FR-CHK-003, ASM-003).

### B.3 Reporting & Dashboard (Jalur Informasi)

```mermaid
sequenceDiagram
    participant DB as PostgreSQL
    participant D as Dashboard Module
    participant An as Analytics Module
    participant Owner

    Note over DB,Owner: Data transaksi COMPLETED sudah tersimpan
    Owner->>D: GET /dashboard/owner (period, outlet_id?)
    D->>DB: agregasi (read-only, scope merchant)
    D-->>Owner: summary, sales_trend, outlet_performance, top_products, stock_alerts, dll

    Owner->>An: GET /analytics/sales-trend?start&end
    An->>DB: group transaksi COMPLETED per interval
    An-->>Owner: trend + summary

    Owner->>An: GET /analytics/product-performance
    An->>DB: agregasi transaction_item
    An-->>Owner: top_sellers + underperformers
```

### B.4 AI Insight (Jalur Insight, Manual & Async)

```mermaid
sequenceDiagram
    actor Owner
    participant A as AI Insight Module
    participant Q as Job Queue (DB L1 / BullMQ L2)
    participant W as AI Worker
    participant An as Analytics Port
    participant P as AI Provider
    participant DB as PostgreSQL

    Owner->>A: POST /ai-insights/analyze
    A->>A: check job aktif (idempotent)
    A->>Q: enqueue job
    A-->>Owner: 202 { job_id, status: PROCESSING }

    Q-->>W: claim job
    W->>An: ambil analytics (read-only)
    W->>P: request insight (timeout)
    alt sukses
        P-->>W: title, content, type
        W->>W: validasi output
        W->>DB: upsert AiInsight 1:1 + job COMPLETED
    else gagal (retry habis)
        W->>DB: AiInsight FAILED + fallback
    end
    Owner->>A: GET /ai-insights
    A-->>Owner: insight + status (READY/PROCESSING/STALE/FAILED)
```

> Detail lengkap tier L1/L2: [`ai-analyze-flow.md`](./ai-analyze-flow.md).

---

## C. Alur Detail Per-Module

### C.1 AUTH MODULE

```mermaid
flowchart TD
    REG[POST /auth/register - public] --> EMAIL[ensureEmailAvailable?]
    EMAIL -->|sudah ada| C409[409 Conflict]
    EMAIL -->|belum ada| UOW[UnitOfWork run tx]
    UOW --> M[createMerchant]
    UOW --> U[createUser role=OWNER]
    UOW -->|commit| JWT[Buat JWT]
    UOW -->|gagal| RB[Rollback - tidak ada merchant yatim]
    JWT --> RES[Return merchant + user + accessToken]

    LOGIN[POST /auth/login] --> FE[findByEmail]
    FE -->|null| 401[401]
    FE -->|ada| COMP[compare password]
    COMP -->|salah| 401
    COMP -->|benar| TOKEN[Return accessToken + user]

    ME[GET /auth/me - auth] --> JWTG[JwtStrategy: findById + cek ACTIVE]
    OUT[POST /auth/logout - auth] --> OK[Stateless - return sukses]
```

### C.2 MERCHANT MODULE

```mermaid
flowchart TD
    GET[GET /merchants - OWNER] --> BYID[findById merchantId dari JWT]
    BYID -->|null| 404[404]
    BYID -->|ada| RET[Return merchant]

    PUT[PUT /merchants - OWNER] --> BODY[Body name, low_stock_threshold?]
    BODY --> UPD[update merchantId]
    UPD --> RET2[Return merchant terbaru]

    NOTE[createMerchant tidak punya endpoint - dipanggil internal oleh AuthService.register]
```

### C.3 OUTLET MODULE

```mermaid
flowchart TD
    LIST[GET /outlets - OWNER] --> FILTER[Filter status?] --> L[listByMerchant]
    CREATE[POST /outlets - OWNER] --> CO[createOutlet merchantId]
    ONE[GET /outlets/{id} - OWNER] --> OW[Pastikan milik merchant]
    UPD[PUT /outlets/{id} - OWNER] --> UO[updateOutlet]
    DEL[DELETE /outlets/{id} - OWNER] --> SOFT[Soft delete: status=INACTIVE]

    OW -->|bukan milik / tak ada| N404[404]
```

### C.4 USER MODULE

```mermaid
flowchart TD
    LIST[GET /users - OWNER] --> FILTER[Filter role/outlet/status, scope merchant]
    CREATE[POST /users - OWNER] --> VALID[Validasi role & email unik]
    VALID -->|CASHIER| W1[outlet_id wajib - outlet aktif merchant]
    VALID -->|ADMIN| W2[outlet_id harus null]
    VALID -->|OWNER| X[409 - owner hanya lewat register]
    VALID --> C[createUser + hash password]
    UPD[PUT /users/{id} - OWNER] --> U1[Update role/status/outlet]
    DEL[DELETE /users/{id} - OWNER] --> D1[Nonaktifkan - riwayat transaksi tetap]
```

### C.5 CATEGORY MODULE

```mermaid
flowchart TD
    GET[GET /categories - OWNER,ADMIN] --> L[listByMerchant]
    CREATE[POST /categories - OWNER,ADMIN] --> C1[cek unik nama dalam merchant]
    UPD[PUT /categories/{id} - OWNER,ADMIN] --> O[ensureMerchantOwnership]
    DEL[DELETE /categories/{id} - OWNER,ADMIN] --> SOFT[Soft delete: status=INACTIVE]

    C1 -->|duplikat| C409[409]
    O -->|bukan milik| N404[404]
    SOFT --> NOTE[Product & riwayat tetap utuh - URB-016/BR-019]
```

### C.6 PRODUCT MODULE

```mermaid
flowchart TD
    GET[GET /products - semua] --> Q[Filter category/status/search + pagination]
    CREATE[POST /products - OWNER,ADMIN] --> V[Validasi category aktif & milik merchant]
    V -->|tidak valid| B400[400]
    V --> CP[createProduct + audit harga/status]
    ONE[GET /products/{id} - semua] --> OW[Pastikan milik merchant]
    UPD[PUT /products/{id} - OWNER,ADMIN] --> U1[Update + audit before/after]
    DEL[DELETE /products/{id} - OWNER,ADMIN] --> SOFT[Soft delete: status=INACTIVE]

    NOTE[Product TIDAK punya stock - stock di Inventory]
```

### C.7 INVENTORY MODULE

```mermaid
flowchart TD
    GET[GET /inventory - semua] --> L[Stock per outlet + product]
    ONE[GET /inventory/outlet/o/product/p - semua] --> S[getStock]
    ADJ[PUT /inventory/{id} - OWNER,ADMIN] --> R[Body quantity + reason - wajib]
    ADJ --> UOW[UnitOfWork: update + StockMovement ADJUSTMENT]
    BULK[POST /inventory/bulk - OWNER,ADMIN] --> UOW2[UnitOfWork: semua item + StockMovement]
    TR[POST /inventory/transfer - OWNER,ADMIN] --> CK[cek stock from_outlet cukup]
    CK -->|kurang| B400[400]
    CK --> TR1[UnitOfWork: decrease from + increase to + StockMovement kedua sisi]
    LOW[GET /inventory/low-stock - OWNER,ADMIN] --> T[stock <= Merchant.low_stock_threshold]

    UOW --> AUDIT[before/after/delta/reason/actor/timestamp]
    NOTE2[Stock tidak boleh negatif - FR-INV-002/BR-011A]
```

### C.8 CART MODULE

```mermaid
flowchart TD
    GET[GET /cart - CASHIER] --> L[cari cart user+outlet]
    L -->|belum ada| 404[404]
    ADD[POST /cart/items - CASHIER] --> P[ensureActive product]
    P -->|tidak aktif| B400[400]
    P --> ST[getStock outlet]
    ST --> ADD1[upsert item - quantity baru <= stock?]
    ADD1 -->|melebihi| B400[400]
    ADD1 --> SNAP[simpan snapshot unit_price]
    UPD[PUT /cart/items/{id} - CASHIER] --> OW[ownership check] --> Q[quantity=0 hapus / cek stock]
    DEL[DELETE /cart/items/{id} - CASHIER] --> D[hapus item]
    CLR[DELETE /cart/clear - CASHIER] --> CL[hapus semua item]

    NOTE[Cart per kasir per outlet - lazily dibuat]
    NOTE2[Stock hanya dicek saat add/update - decrement saat checkout]
```

### C.9 TRANSACTION MODULE (Checkout)

```mermaid
flowchart TD
    GET[GET /transactions - semua] --> F[Filter outlet/date/cashier + pagination]
    F -->|CASHIER| P[outlet dipaksa milik kasir]

    POST[POST /transactions - semua] --> IDEM[cek idempotency_key]
    IDEM -->|sudah ada| SAME[200 transaksi sama - tanpa proses ulang]
    IDEM -->|baru| ITEM[cart_id ATAU items]
    ITEM --> VALID[validasi ulang product/stock/harga]
    VALID -->|gagal| B400[400 + info product/requested/available]
    VALID --> UOW[UnitOfWork run tx]
    UOW --> T1[create transaction + items + Payment CONFIRMED]
    UOW --> T2[decreaseStock tiap item]
    UOW --> T3[clearAfterCheckout]
    UOW -->|commit| REC[Return + receipt]
    UOW -->|gagal| RB[Rollback penuh - tanpa transaksi parsial]

    ONE[GET /transactions/{id} - semua] --> G[getById + scope outlet]
    CANC[POST /transactions/{id}/cancel] --> FUT[FUTURE - di luar scope MVP]
```

### C.10 DASHBOARD MODULE

```mermaid
flowchart TD
    OWN[GET /dashboard/owner - OWNER] --> P[period + outlet_id?]
    P --> AGG[Agregasi read-only scope merchant]
    AGG --> R[summary + sales_trend + outlet_performance + top_products + time_pattern + stock_alerts + aov_trend + recent_transactions]
    ADM[GET /dashboard/admin - ADMIN] --> A2[Ringkasan operasional - tanpa AI/AOV mendalam]

    NOTE[Read-only aggregator - tidak punya tabel sendiri]
```

### C.11 ANALYTICS MODULE

```mermaid
flowchart TD
    ST[GET /analytics/sales-trend - OWNER,ADMIN] --> G1[group COMPLETED per interval]
    TP[GET /analytics/time-pattern - OWNER,ADMIN] --> G2[group per jam + peak hours]
    AOV[GET /analytics/aov-trend - OWNER,ADMIN] --> G3[AOV per periode + perubahan]
    PP[GET /analytics/product-performance - OWNER,ADMIN] --> G4[top_sellers + underperformers]

    NOTE[Read-heavy aggregator dari Transaction/TransactionItem]
```

### C.12 AI INSIGHT MODULE

```mermaid
flowchart TD
    ANA[POST /ai-insights/analyze - OWNER] --> CK[cek job aktif - idempotent]
    CK -->|ada job aktif| 202[202 PROCESSING - jangan tumpuk]
    CK -->|tidak ada| ENQ[Enqueue job - L1 DB / L2 BullMQ]
    ENQ --> R[202 job_id PROCESSING]

    W[AI Worker async] --> DA[ambil data via AnalyticsPort]
    DA --> CALL[panggil AI provider - timeout]
    CALL -->|sukses| VAL[validasi output]
    VAL --> UPS[upsert AiInsight 1:1 + job COMPLETED]
    CALL -->|gagal| RETRY[retry terbatas - backoff]
    RETRY -->|habis| FAIL[AiInsight FAILED + fallback]

    GET[GET /ai-insights - OWNER] --> S[return insight + status READY/PROCESSING/STALE/FAILED]

    NOTE[Tanpa histori 1:1 - no list/dismiss]
    NOTE2[Insight hanya saran - tidak bisa mengubah data]
```

---

## D. Matriks Alur & Referensi Silang

### D.1 Role vs Endpoint (Ringkas)

| Module | OWNER | ADMIN | CASHIER | Public |
|---|---|---|---|---|
| Auth | register/login/logout/me | login/logout/me | login/logout/me | register, login |
| Merchant | GET,PUT | – | – | – |
| Outlet | GET,POST,GET/PUT/DELETE /{id} | – | – | – |
| User | GET,POST,GET/PUT/DELETE /{id} | – | – | – |
| Category | CRUD | CRUD | – | – |
| Product | CRUD | CRUD | GET | – |
| Inventory | PUT /{id}, bulk, transfer, low-stock | PUT /{id}, bulk, transfer, low-stock | GET | – |
| Cart | – | – | semua | – |
| Transaction | GET,POST,GET /{id} | GET,POST,GET /{id} | GET,POST (outlet sendiri),GET /{id} | – |
| Dashboard | /dashboard/owner | /dashboard/admin | – | – |
| Analytics | semua | semua | – | – |
| AI Insight | POST analyze, GET | – | – | – |

> CASHIER dibatasi outlet-nya sendiri pada semua operasi (scope dari JWT).

### D.2 Dependency Antar-Module (melalui Port)

```mermaid
flowchart LR
    AUTH[AUTH] -->|MerchantPort, UserPort| M[Merchant]
    AUTH -->|UserPort| U[User]

    CART[CART] -->|ProductPort| P[Product]
    CART -->|InventoryPort| INV[Inventory]

    TRX[TRANSACTION] -->|ProductPort| P
    TRX -->|InventoryPort| INV
    TRX -->|CartPort| CART
    TRX -->|OutletPort| O[Outlet]
    TRX -->|UserPort| U

    AI[AI INSIGHT] -->|AnalyticsPort| AN[Analytics]
    AN[Analytics] -->|read| TRX
    DASH[DASHBOARD] -->|read| TRX

    INV -->|ProductPort| P
```

### D.3 Ringkasan Data yang Dimiliki Tiap Module

| Module | Owns |
|---|---|
| Auth | (tidak memiliki tabel) |
| Merchant | `merchant` |
| Outlet | `outlet` |
| User | `user` (termasuk password hash) |
| Category | `category` |
| Product | `product` (+ validasi category) |
| Inventory | `inventory`, `stock_movements` |
| Cart | `cart`, `cart_item` |
| Transaction | `transaction`, `transaction_item` |
| Dashboard | (tidak ada — read-only aggregator) |
| Analytics | (tidak ada — read-heavy aggregator) |
| AI Insight | `ai_insight` (1:1, tanpa histori) |

> **Aturan kunci**: module hanya boleh query tabel ownership-nya; antar-module wajib lewat port
> (lihat `module-implementation-guide.md`).

---

## Lampiran — Peta Dokumen

| Dokumen | Isi |
|---|---|
| [`module-implementation-guide.md`](./module-implementation-guide.md) | Detail per-module: files, owns, port, endpoints, logic |
| [`ai-analyze-flow.md`](./ai-analyze-flow.md) | Alur AI analyze berjenjang (DB → BullMQ+Redis) |
| [`api-contract.md`](./api-contract.md) | Kontrak request/response per endpoint |
| [`data-model.md`](./data-model.md) | Relasi data |
| [`architecture.md`](./architecture.md) | Logical architecture (Redis/BullMQ, scaling) |
| deliverables/ | URS, SRS, FRD, business flow (sumber kebenaran) |