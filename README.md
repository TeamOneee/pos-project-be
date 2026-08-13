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
| AI Async | DB job baseline (L1) → BullMQ + Redis (L2) |
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
├── ai-insights/    → analisis AI (tanpa batas harian, 1:1 per merchant)
├── prisma/         → PrismaService
└── common/         → utilitas generic (guard, decorator, filter, helper, transaction)
```

Setiap module berisi `controller → service → repository` dan menyediakan public contract di folder `ports/` (contoh: `users/ports/user.port.ts`).

---

## 📚 Dokumentasi

Seluruh dokumentasi project berada di **[`docs/`](docs/)** — mulai dari **[`docs/README.md`](docs/README.md)** sebagai index/peta baca. **Baca sebelum mulai implementasi.**

Ringkasan isi:

| Dokumen | Isi |
|---|---|
| [docs/README.md](docs/README.md) | **Peta dokumen & urutan baca** (mulai dari sini) |
| [product-overview.md](docs/product-overview.md) | Gambaran produk: struktur bisnis, role & scope, batasan, konsep AI |
| [system-flow.md](docs/system-flow.md) | Alur sistem keseluruhan + alur per-module (diagram) |
| [architecture.md](docs/architecture.md) | Arsitektur sistem + panduan keputusan scaling |
| [modular-architecture.md](docs/modular-architecture.md) | **Aturan inti boundary** & komunikasi via port |
| [module-implementation-guide.md](docs/module-implementation-guide.md) | Blueprint implementasi per module |
| [api-contract.md](docs/api-contract.md) | Kontrak API lengkap + RBAC per role |
| [data-model.md](docs/data-model.md) | Entity Relationship Diagram |
| [common-utilities.md](docs/common-utilities.md) | Cara pakai utilitas `src/common/` |
| [ai-analyze-flow.md](docs/ai-analyze-flow.md) | Alur AI analyze (L1 DB → L2 BullMQ+Redis) |

Sumber kebenaran (URS/SRS/FRD/business flow) ada di `docs/deliverables/` — **jangan diubah**.
