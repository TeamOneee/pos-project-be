\#\# 1\. Overview

Project ini merupakan \*\*POS SaaS multi-tenant\*\* yang melayani banyak merchant (bisnis UMKM). Setiap merchant memiliki beberapa outlet, dan seluruh tenant menggunakan layanan yang sama secara terpisah dan aman.

Sistem digunakan untuk membantu proses operasional penjualan, pengelolaan produk dan stok, pengelolaan karyawan, pengelolaan outlet, pencatatan transaksi, serta penyediaan insight bisnis menggunakan AI.

Arsitektur bisnis utama yang digunakan adalah:

\- Multi-tenant SaaS: satu platform melayani banyak Merchant  
\- Satu Owner memiliki tepat satu Merchant  
\- Multi Outlet  
\- Multi Kasir  
\- Stock Management  
\- Owner dan Admin berada pada scope Merchant  
\- Kasir berada pada scope Outlet  
\- AI Insight dapat dijalankan secara manual oleh Owner dengan batasan penggunaan

\---

\#\# 2\. Struktur Bisnis

Struktur bisnis dalam sistem adalah:

\`\`\`text  
Merchant  
│  
├── Owner  
│  
├── Admin  
│  
├── Outlet A  
│   ├── Cashier 1  
│   ├── Cashier 2  
│   └── Stock  
│  
├── Outlet B  
│   ├── Cashier 3  
│   ├── Cashier 4  
│   └── Stock  
│  
└── Outlet C  
    ├── Cashier 5  
    └── Stock

### **2.1 Merchant**

Sistem menggunakan konsep **multi-tenant SaaS**.

Artinya, satu platform yang dibangun melayani banyak merchant secara bersamaan. Setiap merchant adalah satu tenant yang terisolasi dan memiliki beberapa outlet; satu Owner mengelola tepat satu Merchant.

Merchant menjadi entitas utama yang menaungi:

* Owner  
* Admin  
* Outlet  
* Product  
* Category  
* AI Insight

---

## **3\. Role dan Scope Pengguna**

Sistem memiliki tiga role utama:

* Owner  
* Admin  
* Cashier

Setiap role memiliki scope dan tanggung jawab yang berbeda.

---

### **3.1 Owner**

Owner berada pada **scope Merchant**.

Owner tidak terikat pada outlet tertentu karena tanggung jawabnya berkaitan dengan keseluruhan bisnis.

Fungsi utama Owner:

* Melihat dashboard overview penjualan  
* Melihat performa bisnis  
* Melihat produk terlaris / tidak laku  
* Melihat performa outlet  
* Melihat tren penjualan  
* Melihat pola waktu penjualan  
* Melihat Average Order Value (AOV)  
* Melihat seluruh transaksi merchant  
* Melihat katalog dan stok (read-only)  
* Mengelola karyawan  
* Mengelola outlet  
* Menjalankan analisis AI

Owner berfokus pada **proses dan keputusan bisnis**, bukan aktivitas transaksi harian di outlet. Owner tidak melakukan checkout dan tidak mengelola katalog/stok (read-only).

---

### **3.2 Admin**

Admin berada pada **scope Merchant**, bukan scope satu outlet tertentu.

Artinya, satu Admin dapat menangani dan mengelola beberapa outlet dalam merchant yang sama.

Contoh:

Merchant  
│  
├── Admin  
│  
├── Outlet A  
├── Outlet B  
└── Outlet C

Admin dapat mengelola data yang dibutuhkan untuk operasional merchant dan dapat menangani beberapa outlet.

Admin tidak ditempelkan secara khusus pada satu outlet.

Admin **tidak memiliki akses** ke transaksi, analytics, dashboard Owner, maupun insight BI — murni operasional (katalog, harga, stok, dan dashboard operasional).

---

### **3.3 Cashier**

Cashier berada pada **scope Outlet**.

Satu Cashier hanya terhubung dengan **satu outlet**.

Namun, satu outlet dapat memiliki banyak Cashier.

Relasi:

Outlet 1 ───── N Cashier

Contoh:

Outlet A  
├── Cashier 1  
├── Cashier 2  
└── Cashier 3

Outlet B  
├── Cashier 4  
└── Cashier 5

Cashier bertanggung jawab terhadap proses transaksi pada outlet tempatnya ditugaskan.

Fungsi utama Cashier:

* Melihat produk  
* Search product  
* Filter product  
* Menambahkan produk ke cart  
* Menghapus produk dari cart  
* Melihat subtotal  
* Melihat final total  
* Checkout  
* Melihat histori transaksi

---

# **4\. Product dan Category**

Product berada pada **scope Merchant**.

Satu merchant dapat memiliki banyak product.

Product memiliki category yang digunakan untuk melakukan pengelompokan produk.

Relasi:

Merchant 1 ───── N Product

Category 1 ───── N Product

Category dibuat sebagai entitas terpisah agar satu category dapat digunakan oleh banyak product.

---

# **5\. Stock Management**

Sistem **menggunakan stock management**.

Stock tidak disimpan langsung sebagai atribut global pada Product karena satu product dapat memiliki jumlah stock yang berbeda pada setiap outlet.

Contoh:

Product: Coca Cola

Outlet A → 20  
Outlet B → 10  
Outlet C → 5

Karena itu, stock dikelola berdasarkan kombinasi:

Outlet \+ Product

Secara konsep:

Outlet  
   │  
   └── Inventory ── Product

Inventory menyimpan informasi stock product pada outlet tertentu.

Stock akan berkaitan dengan proses transaksi dan checkout.

---

# **6\. Transaction**

Setiap proses checkout oleh Cashier akan menghasilkan Transaction.

Transaction harus dapat mengetahui:

* Outlet tempat transaksi terjadi  
* Cashier yang melakukan transaksi  
* Transaction number  
* Subtotal  
* Total  
* Status  
* Waktu transaksi

Relasi utama:

Outlet 1 ───── N Transaction

Cashier 1 ───── N Transaction

Satu transaksi dapat memiliki banyak product.

Karena itu digunakan entitas `Transaction Item`.

Transaction  
│  
├── Product A  
├── Product B  
└── Product C

`Transaction Item` menyimpan informasi seperti:

* Product  
* Quantity  
* Unit price  
* Subtotal

Harga pada saat transaksi perlu disimpan agar histori transaksi tetap valid apabila harga product berubah di kemudian hari.

---

# **7\. Business Intelligence (BI) dan AI Insight**

Fitur **"AI Insight"** pada produk ini **diimplementasikan sebagai Business Intelligence (BI)**: bukan satu fitur insight tunggal, melainkan kumpulan insight analitik (beberapa tipe) berbasis data bisnis untuk mendukung keputusan Owner.

BI digunakan untuk melakukan analisis berdasarkan data bisnis yang tersedia dan menghasilkan **beberapa tipe insight**, bukan hanya satu tipe.

Tipe insight/rekomendasi yang dapat dihasilkan antara lain:

* Prediksi stock akan habis  
* Rekomendasi restock  
* Rekomendasi pemindahan stock antar outlet  
* Analisis produk terlaris  
* Analisis produk yang kurang laku  
* Analisis performa outlet  
* Tren penjualan  
* Pola waktu penjualan  
* AOV trend

BI Insight (AI) berada pada **scope Merchant**, karena analisis dapat menggunakan data bisnis dari beberapa outlet.

---

# **8\. AI Trigger dan Usage Limitation**

Analisis AI **tidak dijalankan secara otomatis menggunakan cron job**.

AI dipicu secara **manual oleh Owner** melalui fitur `Analyze with AI`.

Flow:

Owner  
  │  
  │ Click "Analyze with AI"  
  ↓  
System  
  │  
  │ Check daily limit  
  ↓  
AI Analysis  
  │  
  ↓  
Insight / Recommendation

### **Batasan AI**

Owner hanya dapat menjalankan analisis AI:

> **Maksimal satu kali dalam satu hari.**

Tujuan dari pembatasan ini:

* Menghindari spam request ke AI  
* Mengurangi penggunaan token  
* Menghindari analisis berulang yang terlalu sering  
* Menghindari analisis yang tidak memberikan perubahan signifikan dalam waktu singkat  
* Menjaga efisiensi penggunaan resource

Contoh:

10 August  
Owner → Analyze AI ✅

10 August  
Owner → Analyze AI ❌  
Reason: Daily limit reached

11 August  
Owner → Analyze AI ✅

---

# **9\. Batasan Sistem**

Batasan berikut menjadi scope yang disepakati untuk project.

### **Business Structure**

* Sistem adalah **SaaS multi-tenant**: satu platform melayani banyak merchant.  
* Satu Owner memiliki tepat satu Merchant; data antar-Merchant terisolasi.  
* Satu merchant dapat memiliki banyak outlet.  
* Satu outlet dapat memiliki banyak cashier.  
* Satu cashier hanya terhubung dengan satu outlet.  
* Owner berada pada scope merchant.  
* Admin berada pada scope merchant dan dapat mengelola beberapa outlet.  
* Cashier berada pada scope outlet.

### **Product**

* Product berada pada scope merchant.  
* Category dibuat sebagai entitas terpisah.  
* Product dapat memiliki stock yang berbeda pada setiap outlet.

### **Inventory**

* Sistem menggunakan stock management.  
* Stock dikelola berdasarkan outlet dan product.  
* Stock berkaitan dengan proses checkout.  
* Sistem perlu memperhatikan konsistensi stock ketika terjadi transaksi.

### **Transaction**

* Transaction selalu terkait dengan outlet.  
* Checkout hanya dapat dilakukan oleh Kasir pada Outlet tugasnya; Owner dan Admin tidak melakukan checkout.  
* Transaction mencatat cashier yang melakukan transaksi.  
* Transaction dapat memiliki banyak transaction item.  
* Transaction tidak menggunakan payment gateway.  
* Sistem hanya menangani proses transaksi pada sisi POS.

### **AI**

* AI hanya dapat dipicu secara manual oleh Owner.  
* AI tidak menggunakan cron job sebagai trigger utama.  
* Analisis AI dibatasi maksimal satu kali per hari per merchant.  
* AI digunakan untuk menghasilkan insight dan rekomendasi berdasarkan data bisnis.  
* AI tidak melakukan perubahan data bisnis secara langsung tanpa melalui sistem.

---

# **10\. Scope yang Tidak Ditangani**

Project ini tidak berfokus pada:

* Payment gateway  
* Sistem pembayaran eksternal  
* Kasir yang dapat ditugaskan ke banyak outlet secara bersamaan  
* AI yang berjalan otomatis setiap periode menggunakan cron job  
* Analisis AI tanpa batas penggunaan  
* Sistem inventory/gudang terpisah di luar POS

---

# **11\. Prinsip Arsitektur**

Arsitektur sistem akan dikembangkan dengan mempertimbangkan:

* Scalability  
* Performance  
* Data consistency  
* Cost efficiency  
* Separation of workload  
* Maintainability

Sistem perlu mampu menangani kondisi traffic normal maupun peningkatan traffic secara tiba-tiba tanpa melakukan over-provisioning resource secara tidak perlu.

Untuk workload yang berbeda, sistem dapat mempertimbangkan pemisahan:

Write Heavy  
    ↓  
Primary Database

Read Heavy  
    ↓  
Read Replica

Read-heavy workload dapat digunakan untuk kebutuhan seperti:

* Dashboard Owner  
* Analytics  
* AI data processing

Sedangkan write-heavy workload seperti:

* Checkout  
* Transaction  
* Stock update

tetap diprioritaskan agar responsif dan konsisten.

---

# **12\. Prinsip Pengembangan**

Dokumen ini digunakan sebagai **single source of truth** untuk memahami konteks dan batasan project.

Pedoman yang menjadi problem set project adalah **[StudyCase](./StudyCase.md)**, **[StudyCase-Ind](./StudyCase-Ind.md)**, **[FinalProject](./FinalProject.md)**, dan **[HowUnderstand](./HowUnderstand.md)**. Requirement dan keputusan di dokumen ini diturunkan dari dan harus tetap selaras dengan pedoman tersebut.

Sebelum mengubah struktur database, business flow, role, atau architecture, perubahan sebaiknya didiskusikan dan disepakati bersama tim.

Jika terdapat perubahan requirement, dokumen ini perlu diperbarui agar seluruh anggota memiliki pemahaman yang sama.

---

# **13\. Ringkasan Keputusan**

| Aspek | Keputusan |
| ----- | ----- |
| Merchant | Multi-tenant SaaS: platform melayani banyak Merchant; satu Owner memiliki satu Merchant |
| Outlet | Multi Outlet |
| Cashier | Multi Cashier |
| Cashier Scope | 1 Cashier → 1 Outlet |
| Checkout | Hanya oleh Kasir pada Outlet tugasnya |
| Cashier History | Hanya transaksi yang dilakukan Kasir itu sendiri (`OD-003`) |
| Harga | Harga master global + override per Outlet (`OD-002`) |
| Diskon/Pajak/Service Charge | Diskon persen dari Kasir (tanpa voucher), service charge persen dari Merchant (5–15%), pajak fiks 11% (`tax = (subtotal - discount) x 11%`); tanpa tip. Total = `subtotal - discount + service_charge + tax` (`OD-004`) |
| Refund | Tidak ada pada MVP (`OD-005`) |
| Dashboard Freshness | ≤ 5 menit untuk ≥95% pembaruan (`OD-006`) |
| Monitoring | Prometheus (scrape `/metrics`) + dashboard Grafana (wajib) |
| Admin Scope | Merchant (katalog, harga, stok, dashboard operasional) |
| Owner Scope | Merchant (bisnis, transaksi, dashboard, analytics, AI) |
| Transaction Access | Owner: semua transaksi merchant; Cashier: transaksi dirinya sendiri; Admin: tidak ada |
| Catalog/Stock Management | Hanya Admin; Owner read-only |
| Stock | Ada |
| Category | Entitas terpisah |
| Payment Gateway | Tidak ditangani; payment dicatat manual (`OD-001`) |
| AI Trigger | Manual oleh Owner |
| AI Limit | 1x per hari per Merchant |
| AI Cron Job | Tidak digunakan sebagai trigger utama |
| AI Scope | Merchant |
| BI Insight | Beberapa tipe: tren penjualan, perbandingan outlet, produk terlaris, pola waktu, tren AOV |
| Transaction | Terhubung dengan Outlet & Cashier |
| Scalability | Menjadi consideration utama |
| Cost Efficiency | Menjadi consideration utama |
| Read Heavy | Dapat menggunakan Read Replica |
| Write Heavy | Primary Database |

