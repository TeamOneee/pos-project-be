# Dokumentasi Proyek — POS Multi-Outlet + BI/AI

**Folder ini adalah sumber dokumentasi** untuk backend POS (modular monolith, NestJS).
Dibaca oleh manusia maupun AI (AI context). Urutan baca penting: mulai dari ringkasan, lalu
masuk ke detail sesuai kebutuhan.

> **Sumber kebenaran (source of truth)** ada di `deliverables/` (URS/SRS/FRD/business flow — dokumen acuan, **jangan diubah**). Dokumen di folder ini adalah turunan/ringkasan yang
> konsisten dengan deliverables.

---

## 1. Peta Dokumen

| Dokumen | Isi | Kapan Dibaca |
|---|---|---|
| [`product-overview.md`](./product-overview.md) | Gambaran produk & bisnis: struktur (merchant/outlet/kasir), role & scope, batasan, konsep AI | **Pertama kali** — memahami *apa yang dibangun* |
| [`user-flow.md`](./user-flow.md) | Alur pengguna per role (Owner/Admin/Cashier): login → selesai, dengan diagram | Membayangkan *bagaimana tiap role bekerja* |
| [`system-flow.md`](./system-flow.md) | Alur sistem keseluruhan (diagram): onboarding, operasional, reporting, AI; plus alur per-module | Memahami *bagaimana modul saling terhubung* |
| [`architecture.md`](./architecture.md) | Arsitektur sistem (komponen, DB, Redis/BullMQ, AI worker, Docker) **+** panduan keputusan scaling (kapan naik level) | Memahami *arsitektur & scaling* |
| [`modular-architecture.md`](./modular-architecture.md) | **Aturan inti boundary**: ownership data, larangan akses repo module lain, komunikasi via port, dependency matrix | Wajib sebelum menulis kode lintas-module |
| [`module-implementation-guide.md`](./module-implementation-guide.md) | Blueprint implementasi per module: file, endpoint, dan **logika tiap endpoint** | Panduan harian saat mengimplementasikan module |
| [`api-contract.md`](./api-contract.md) | Kontrak API lengkap: semua endpoint, request/response, RBAC per role | Sebelum menulis controller/endpoint |
| [`data-model.md`](./data-model.md) | Entity Relationship Diagram: entitas, atribut, relasi antar tabel | Sebelum membuat/mengubah model Prisma |
| [`common-utilities.md`](./common-utilities.md) | Cara pakai utilitas `src/common/` (guard, decorator, filter, BaseRepository, UnitOfWork, hashing) | Saat butuh guard/decorator/transaction |
| [`ai-analyze-flow.md`](./ai-analyze-flow.md) | Alur AI analyze berjenjang: L1 (DB `AiJobRecord` + rate limiting + worker) → L2 (BullMQ + Redis) | Saat mengimplementasikan/memahami AI |

### Pendamping di luar `docs/`

- [`openapi.json`](../openapi.json) — versi machine-readable dari API contract (OpenAPI 3.0).

---

## 2. Alur Baca yang Disarankan

```
Pertama kali gabung tim
   └─ product-overview.md
      └─ user-flow.md
         └─ system-flow.md
            └─ modular-architecture.md
               └─ architecture.md

Sebelum implementasi module X
   └─ module-implementation-guide.md (bagian X)
      └─ api-contract.md (endpoint X)
      └─ data-model.md (tabel terkait)
      └─ common-utilities.md (utilitas yang dipakai)

Mau ubah arsitektur / scaling
   └─ architecture.md (bagian kedua — Architecture Decision Guide)

Mau memahami AI Insight
   └─ ai-analyze-flow.md
```

---

## 3. Deliverables (Sumber Kebenaran — JANGAN DIUBAH)

Folder `deliverables/` berisi dokumen yang menjadi **acuan utama**:

| Dokumen | Isi |
|---|---|
| `00-iterasi-1-document-guide.md` | Panduan cara menyusun deliverables |
| `01-iterasi-1-business-flow.md` | Alur bisnis end-to-end |
| `02-iterasi-1-proposed-urs.md` | User Requirements Specification |
| `03-iterasi-1-proposed-srs.md` | System Requirements Specification (FR/BR/DR) |
| `04-iterasi-1-proposed-frd.md` | Functional Requirements + workflows |
| `FinalProject.md`, `StudyCase.md`, `StudyCase-Ind.md`, `HowUnderstand.md` | Konteks proyek & panduan eksplorasi |

> Jika terjadi konflik antara dokumen di `docs/` dan `deliverables/`, yang berlaku adalah **deliverables**.
> Perubahan requirement harus tercermin di sini, lalu dokumen turunan diperbarui agar tetap sinkron.

---

## 4. Prinsip Singkat (dari `modular-architecture.md`)

1. **Setiap data punya satu owner module** — module lain tidak boleh akses tabel/repo tersebut.
2. **Komunikasi antar-module lewat public contract (port/interface)**, bukan repository.
3. **Business logic di Service** — controller hanya menerima request & validasi.
4. **Hindari circular dependency** — dependency harus satu arah.
5. **Simple first, preserve boundaries, scale when needed.**
