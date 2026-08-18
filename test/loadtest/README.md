# Load Test — POS Platform

Membuktikan solusi untuk **Case Study: "Scaling Without Overspending"** (`docs/CASESTUDY.md`).

Inti yang mau dibuktikan: **checkout kasir tetap responsif (p95 < 1.5s) walau dashboard
owner dan update admin jalan serentak**, di skala **500 merchant** — tanpa upgrade
infrastruktur besar (test ini jalan di pool `connection_limit=10`, sebesar Neon free-tier).

---

## Struktur Folder

```
test/loadtest/
├── README.md          ← dokumen ini
├── k6/                ← SKENARIO MULTI-AKTOR (pembuktian utama)
│   ├── scenario.js    ← skenario 3 beban kerja + threshold + summary
│   ├── seed.js        ← 500 merchant x (owner, 2 outlet, kasir, admin) + JWT
│   ├── verify.js      ← cek konsistensi DB setelah test
│   └── run.sh         ← orchestrator: migrate → seed → build → API → k6 → verify
└── go/                ← HARNESS GO LAMA (uji cepat checkout single-merchant)
    ├── loadtest.go    ← 6000 request checkout, concurrency bebas
    ├── seed.js / verify.js / run.sh
```

---

## Prasyarat

1. **Env load test** — buat dari contoh (isi sesuai setup DB kamu):
   ```bash
   cp .env.loadtest.example .env.loadtest
   ```
2. Docker Postgres `pos_loadtest` jalan di `localhost:55432`:
   ```bash
   docker start pos-loadtest-pg        # kalau belum jalan
   ```
   (Container ini dibuat manual via `docker run`, bukan dari compose file — lihat
   bagian "Cara Buat DB Load Test" di bawah.)
3. k6 ≥ 2.0 terinstall:
   ```bash
   k6 version
   ```
4. Dependensi backend terinstall:
   ```bash
   npm install
   ```

### Cara Buat DB Load Test (sekali saja)

DB load test bukan bagian dari docker-compose proyek — ia dibuat satu kali via `docker run`:

```bash
docker run -d --name pos-loadtest-pg \
  -p 55432:5432 \
  -e POSTGRES_USER=pos \
  -e POSTGRES_PASSWORD=pos \
  -e POSTGRES_DB=pos_loadtest \
  -v pos_loadtest_data:/var/lib/postgresql/data \
  postgres:16-alpine
```

Struktur `run.sh` (`[1/6] migrate → [6/6] verify`) tinggal `docker start pos-loadtest-pg`
kalau container-nya sudah ada.

---

## Cara Menjalankan

### 1) Skenario Multi-Aktor (pembuktian study case) — **disarankan**

```bash
N_MERCHANTS=500 bash test/loadtest/k6/run.sh
```

Apa yang terjadi (otomatis, ±2 menit):
1. Migrasi DB `pos_loadtest`
2. Seed 500 merchant × (1 owner + 2 outlet + 1 kasir + 1 admin) + JWT per user
3. Build + start API (port 3001, dimatikan otomatis di akhir)
4. Run skenario k6 (~17 detik)
5. Verifikasi konsistensi DB

Knob opsional: `N_MERCHANTS` (jumlah merchant, checkout rate ikut skala), `BASE_URL`.

Coba cepat (≈40 detik): `N_MERCHANTS=20 bash test/loadtest/k6/run.sh`

### 2) Uji Checkout Cepat (harness Go lama)

```bash
TOTAL=6000 CONCURRENCY=100 bash test/loadtest/go/run.sh
```

Skenario ini hanya checkout 1 merchant (bukan multi-aktor), berguna untuk mengukur
throughput murni checkout. Knob: `TOTAL`, `CONCURRENCY`.

---

## Skenario yang Dimodelkan (peta ke study case)

| Waktu | Aktor | Beban | Pemetaan ke study case |
|---|---|---|---|
| t = 0–10 detik | 500 kasir | ~100 checkout/detik (1 checkout / 5 detik per kasir, dengan jitter) | workload transaksional latency-sensitive |
| t = 5 detik | 250 owner | melihat dashboard serentak | workload analytical / reporting (read) |
| t = 6 detik | 500 admin | update produk + lihat dashboard outlet | workload administrative (write) |

Kunci soal study case: apakah **checkout tetap cepat SAAT** dua burst di atas berjalan?

---

## Cara Membaca Hasil k6

Ringkasan di terminal dibagi per **beban kerja**, supaya tidak tercampur jadi satu angka.

```
┌─ WORKLOAD CHECKOUT ──────────────────────────────────────┐
│  transaksi      : 1001          gagal: 0 (0.00%)         │
│  latensi        : p50 47ms  p95 858ms  p99 894ms         │
│  hasil          : ✓ PASS (target p95 < 1500ms)           │
└──────────────────────────────────────────────────────────┘
```

Istilah yang perlu dipahami:
- **p50 / p95 / p99** — 50% / 95% / 99% request selesai di bawah angka ini.
  Kalau p95 = 858ms artinya 95 dari 100 transaksi selesai < 858ms.
- **Threshold** — budget per beban kerja. `✓ PASS` / `✗ FAIL` dan exit code k6
  (0 = lulus semua, 1 = ada yang melanggar) jadi patokan otomatis.
- **Verifikasi DB** — bukan cuma soal cepat, tapi juga benar: jumlah transaksi sesuai,
  tidak ada nomor transaksi kembar, tidak ada idempotency kembar, stok konsisten.

---

## Ringkasan Hasil Referensi (500 merchant, pool 10)

Contoh output `run.sh` (angka bisa bervariasi tiap run; lihat hasil asli di terminal):

| Beban kerja | request | p50 | p95 | p99 | gagal |
|---|---|---|---|---|---|
| checkout (kasir) | ~1000 | 67ms | 641ms | 680ms | 0 |
| dashboard owner + admin (t=5–6s) | ~750 | 36ms | 1.37s | 1.47s | 0 |
| admin update (t=6s) | 500 | 2.14s | 2.88s | 3.04s | 0 |

Semua threshold PASS, konsistensi DB LULUS.

---

## Catatan & Limitasi (penting biar klaimnya jujur)

1. **Read replica belum sungguhan.** Kode sudah mengarahkan semua read reporting ke
   `PrismaReadService` (env `DATABASE_URL_READ_REPLICA`), tapi di environment test ini
   nilainya = DB yang sama dengan primary. Jadi yang teruji adalah **isolasi pool**
   (reporting punya pool terpisah, tidak mencuri koneksi primary), **bukan** offload
   server sejati. Begitu replica asli dibuat, cukup ganti env — tanpa ubah kode.
2. **Jalur lokal (localhost + Docker)** — memvalidasi pola arsitektur, bukan latensi
   jaringan produksi.
3. **Worst-case tersinkronisasi** (500 kasir checkout di detik yang sama persis, tanpa
   jitter) checkout p95 naik ke ~3.7s. Skenario di atas memakai jitter (realistis).
4. **Neon free-tier**: 2 pool × `connection_limit=10` = potensi 20 koneksi ke 1 DB,
   di atas cap 10 Neon. Lokal aman; kalau deploy ke Neon set ulang pool.
5. **Admin update memang lebih lambat** (p95 ~3s) — menulis ke primary yang sama dengan
   checkout; ini trade-off yang disengaja, study case memprioritaskan checkout.