# Reporting

Reporting membentuk data dashboard secara asynchronous dari transaksi
`COMPLETED`. Checkout hanya menulis event; kalkulasi dashboard dijalankan oleh
worker sehingga tidak memperlambat kasir.

## Flow

```text
Sales checkout
  -> Transaction + OutboxEvent commit di primary
  -> PlatformWorker mengambil TransactionCompletedEvent
  -> ReportingWorker memvalidasi dan memproses event
  -> ReportingEventReceipt + ReportingProjection ditulis atomik
  -> projection direplikasi ke read replica
  -> API dashboard dan Insight membaca ReportingProjection
```

## Status implementasi

| Bagian                    | Status           | Keterangan                                                       |
| ------------------------- | ---------------- | ---------------------------------------------------------------- |
| Dashboard bisnis Owner    | Siap             | Summary, tren penjualan/AOV, pola waktu, Product, dan Outlet     |
| Projection worker         | Siap             | Membentuk bucket `HOUR` dan `DAY`                                |
| Idempotency               | Siap             | Receipt mencegah event yang sama menambah aggregate dua kali     |
| Scope Merchant/Outlet     | Siap             | Divalidasi melalui Tenant public port                            |
| Product nol penjualan     | Siap             | Dilengkapi melalui Catalog public port                           |
| Publisher event Sales     | Belum            | Sales harus menerbitkan payload lengkap saat checkout commit     |
| Migration receipt         | Belum diterapkan | File migration tersedia, tetapi harus dijalankan ke database     |
| Dashboard Admin/low-stock | Belum            | Menunggu read port Inventory                                     |
| Insight consumer          | Belum            | Insight harus mengonsumsi `ReportingReadPort`                    |
| Multi-worker hardening    | Belum            | Platform memerlukan atomic batch claim dan recovery `PROCESSING` |

## Kontrak dari Sales

Sales harus memanggil `OutboxService.publish(...)` di dalam transaksi Prisma
yang sama dengan checkout. Reporting tidak boleh dipanggil langsung dan tidak
boleh membaca tabel Sales.

```ts
{
  schemaVersion: 1,
  transactionId: string,
  merchantId: string,
  outletId: string,
  status: 'COMPLETED',
  occurredAt: string,
  merchantTimezone: string,
  total: string,
  lines: Array<{
    productId: string,
    productNameSnapshot: string,
    quantity: number,
    subtotal: string
  }>
}
```

Aturan payload:

- `occurredAt` memakai ISO 8601;
- uang dikirim sebagai decimal string;
- `total` harus sama dengan jumlah `lines.subtotal`;
- `merchantTimezone` menentukan bucket waktu lokal;
- hanya transaksi `COMPLETED` yang boleh diterbitkan.

Dokumen API saat ini masih memberi contoh event yang hanya berisi transaction
ID. Kontrak tersebut perlu diselaraskan dengan payload lengkap di atas agar
Reporting tetap tidak bergantung pada tabel Sales.

## Data yang disimpan

`ReportingProjection` menyimpan aggregate per Merchant, Outlet, periode, dan
granularity. Aggregate Product berada di `metrics`:

```json
{
  "products": {
    "<product-id>": {
      "name": "snapshot nama saat checkout",
      "unitsSold": "3",
      "omzet": "25000.00"
    }
  }
}
```

`ReportingEventReceipt.transaction_id` menjadi dedupe key. Receipt dan
projection harus selalu ditulis dalam satu transaksi database.

## Dependency antarmodul

| Modul     | Yang dibutuhkan Reporting                         | Status                       |
| --------- | ------------------------------------------------- | ---------------------------- |
| Platform  | Prisma primary/replica, Outbox relay, retry       | Tersedia                     |
| Sales     | `TransactionCompletedEvent` lengkap               | Belum diintegrasikan         |
| Tenant    | Timezone, validasi Outlet, dan nama Outlet        | Tersedia melalui public port |
| Catalog   | Product aktif untuk mendeteksi nol penjualan      | Tersedia melalui public port |
| Inventory | Ringkasan stok dan low-stock per Outlet           | Belum tersedia               |
| Insight   | Membaca `ReportingReadPort.getBusinessSnapshot()` | Belum diintegrasikan         |

Catalog dan Tenant hanya diakses melalui public port. Reporting tidak boleh
mengakses repository atau tabel internal modul lain.

## Endpoint yang tersedia

Seluruh endpoint berikut khusus `OWNER`:

- `GET /dashboard/summary`;
- `GET /dashboard/sales-trend`;
- `GET /dashboard/aov-trend`;
- `GET /dashboard/time-pattern`;
- `GET /dashboard/top-products`;
- `GET /dashboard/outlet-comparison`.

Belum tersedia:

- `GET /dashboard/operations` untuk Admin;
- `GET /dashboard/low-stock` untuk Owner/Admin;
- drill-down dashboard ke transaksi (`FR-REP-010`, prioritas `Should`).
