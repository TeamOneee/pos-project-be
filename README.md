# POS System — Backend

Backend REST API untuk sistem **Point of Sale** dengan konsep **Single Merchant – Multi Outlet – Multi Kasir**.

Dibangun menggunakan **NestJS** sebagai modular monolith: setiap domain (auth, user, merchant, product, dst.) adalah module dengan boundary dan ownership yang jelas, berkomunikasi antar-module melalui **port/interface** (bukan akses repository secara langsung).

---

## Tech Stack

| Komponen | Teknologi |
|---|---|
| Framework | NestJS 11 |
| Bahasa | TypeScript |
| ORM | Prisma (PostgreSQL) |
| Database | PostgreSQL |
| AI Async | Rate limiting + AI Worker (tanpa message queue) |
| Auth | JWT + Passport (bcrypt) |
| Validasi | class-validator + class-transformer |

---

## Menjalankan

```bash
npm install

# siapkan env (copy .env.example → .env, isi DATABASE_URL & SECRET_JWT)
npx prisma generate

# development (watch mode)
npm run start:dev

# build produksi
npm run build
npm run start:prod
```

Script lain: `npm run lint`, `npm run test`.

---

## Struktur Folder

```
src/
├── auth/           → login, register, JWT strategy
├── users/          → kelola user/pegawai
├── merchants/      → data merchant
├── outlets/        → kelola outlet
├── categories/     → kelola kategori produk
├── products/       → kelola produk (BUKAN stock)
├── inventory/      → stock per outlet (owner stock)
├── cart/           → keranjang per kasir
├── transactions/   → transaksi & checkout
├── dashboard/      → agregasi data untuk Owner/Admin
├── analytics/      → agregasi & insight numerik
├── ai-insights/    → analisis AI (1x/hari, 1:1 per merchant)
├── prisma/         → PrismaService
└── common/         → utilitas generic (guard, decorator, filter, helper, transaction)
```

Setiap module berisi `controller → service → repository` dan menyediakan public contract di folder `ports/` (contoh: `users/ports/user.port.ts`).

---

## 📚 Dokumentasi

Seluruh dokumentasi project berada di folder **[`docs/`](../../docs/)** (root repository, relatif dari `apps/backend`). **Baca sebelum mulai implementasi.**

| Dokumen | Isi | Kapan Dibaca |
|---|---|---|
| [ProductOverview.md](../../docs/ProductOverview.md) | Gambaran produk: struktur bisnis (merchant/outlet/kasir), role & scope, batasan sistem, konsep AI | Wajib pertama kali — memahami *apa yang dibangun* |
| [ERD.md](../../docs/ERD.md) | Entity Relationship Diagram: entitas, atribut, dan relasi antar tabel | Sebelum membuat/mengubah model Prisma |
| [APICONTRACT.md](../../docs/APICONTRACT.md) | Kontrak API lengkap: semua endpoint, request/response, RBAC per role | Sebelum menulis controller/endpoint |
| [openapi.json](../../openapi.json) | Versi machine-readable dari API contract (OpenAPI 3.0) | Untuk generate client / dokumentasi otomatis |
| [Modular Architecture Guideline.md](../../docs/Modular%20Architecture%20Guideline.md) | **Aturan inti boundary**: ownership data, larangan akses repo module lain, cara komunikasi antar-module lewat port, dependency matrix | Wajib sebelum menulis kode lintas-module |
| [MODULE_IMPLEMENTATION_GUIDE.md](../../docs/MODULE_IMPLEMENTATION_GUIDE.md) | Blueprint implementasi per module: file, endpoint, dan **logika yang harus dijalankan** tiap endpoint | Panduan harian saat mengimplementasikan module |
| [COMMON.md](../../docs/COMMON.md) | Cara pakai semua utilitas di `src/common/` (guard, decorator, filter, BaseRepository, UnitOfWork, hashing) | Saat butuh guard/decorator/transaction |
| [LLA.md](../../docs/LLA.md) | Low-Level Architecture: komponen (NestJS, PostgreSQL, rate limiting + AI worker, Docker) & strategi scalability | Memahami arsitektur sistem secara keseluruhan |
| [ARCHITECTURE_DECISION_GUIDE.md](../../docs/ARCHITECTURE_DECISION_GUIDE.md) | Panduan kapan menaikkan level arsitektur (scale when needed: optimasi → horizontal scaling → microservice) | Saat mempertimbangkan scaling |

### Alur baca yang disarankan

```
Pertama kali gabung tim
   └─ ProductOverview.md
      └─ Modular Architecture Guideline.md
         └─ ERD.md
            └─ APICONTRACT.md

Sebelum implementasi module X
   └─ MODULE_IMPLEMENTATION_GUIDE.md (bagian X)
      └─ COMMON.md (utilitas yang dipakai)

Mau ubah arsitektur / scaling
   └─ LLA.md → ARCHITECTURE_DECISION_GUIDE.md
```

---

## Prinsip Singkat (dari Modular Architecture Guideline)

1. **Setiap data punya satu owner module** — module lain tidak boleh akses tabel/repo tersebut.
2. **Komunikasi antar-module lewat public contract (port/interface)**, bukan repository.
3. **Business logic di Service**, controller hanya menerima request & validasi.
4. **Hindari circular dependency** — dependency harus satu arah.
5. **Simple first, preserve boundaries, scale when needed.**
