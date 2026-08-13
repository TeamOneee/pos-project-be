## 1. Overview

Project ini merupakan sistem **Point of Sale (POS)** untuk bisnis yang memiliki satu merchant dengan beberapa outlet.

Sistem digunakan untuk membantu proses operasional penjualan, pengelolaan produk dan stok, pengelolaan karyawan, pengelolaan outlet, pencatatan transaksi, serta penyediaan insight bisnis menggunakan AI.

Arsitektur bisnis utama yang digunakan adalah:

- Multi-Tenant SaaS (banyak Merchant; satu Owner = satu Merchant)  
- Multi Outlet  
- Multi Kasir  
- Stock Management  
- Owner dan Admin berada pada scope Merchant  
- Kasir berada pada scope Outlet  
- AI Insight dapat dijalankan secara manual oleh Owner dengan batasan penggunaan

---

## 2. Struktur Bisnis

Struktur bisnis dalam sistem adalah:

```text  
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

Sistem merupakan **multi-tenant SaaS**: platform dapat melayani banyak Merchant, namun setiap Owner memiliki tepat satu Merchant (FR-TEN-002).

Artinya, satu Merchant memiliki beberapa Outlet, dan seluruh data (katalog, inventory, transaksi) di-scope per Merchant.

Merchant menjadi entitas utama yang menaungi:

* Owner  
* Admin  
* Outlet  
* Product  
* Category  
* AI Insight

---

## **3. Role dan Scope Pengguna**

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
* Mengelola karyawan  
* Mengelola outlet  
* Menjalankan analisis AI

Owner berfokus pada **proses dan keputusan bisnis**, bukan aktivitas transaksi harian di outlet.

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

# **4. Product dan Category**

Product berada pada **scope Merchant**.

Satu merchant dapat memiliki banyak product.

Product memiliki category yang digunakan untuk melakukan pengelompokan produk.

Relasi:

Merchant 1 ───── N Product

Category 1 ───── N Product

Category dibuat sebagai entitas terpisah agar satu category dapat digunakan oleh banyak product.

---

# **5. Stock Management**

Sistem **menggunakan stock management**.

Stock tidak disimpan langsung sebagai atribut global pada Product karena satu product dapat memiliki jumlah stock yang berbeda pada setiap outlet.

Contoh:

Product: Coca Cola

Outlet A → 20  
Outlet B → 10  
Outlet C → 5

Karena itu, stock dikelola berdasarkan kombinasi:

Outlet + Product

Secara konsep:

Outlet  
   │  
   └── Inventory ── Product

Inventory menyimpan informasi stock product pada outlet tertentu.

Stock akan berkaitan dengan proses transaksi dan checkout.

---

# **6. Transaction**

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

# **7. AI Insight**

Sistem menyediakan fitur **AI Insight** untuk membantu Owner memahami kondisi bisnis.

AI digunakan untuk melakukan analisis berdasarkan data bisnis yang tersedia.

Beberapa insight/rekomendasi yang dapat dihasilkan antara lain:

* Prediksi stock akan habis  
* Rekomendasi restock  
* Rekomendasi pemindahan stock antar outlet  
* Analisis produk terlaris  
* Analisis produk yang kurang laku  
* Analisis performa outlet  
* Tren penjualan  
* Pola waktu penjualan  
* AOV trend

AI Insight berada pada **scope Merchant**, karena analisis dapat menggunakan data bisnis dari beberapa outlet.

Hubungan antara Merchant dan AI Insight bersifat **1:1**.

Sistem **tidak menyimpan histori analisis**. AI murni digunakan untuk memberikan **penjelasan / reasoning bisnis pada hari tersebut**. Setiap analisis baru akan **meng-update insight yang sama** pada merchant.

Karena tidak ada histori, fitur seperti daftar insight lama atau dismiss tidak diperlukan.

---

# **8. AI Trigger dan Usage Limitation**

Analisis AI **tidak dijalankan secara otomatis menggunakan cron job**.

AI dipicu secara **manual oleh Owner** melalui fitur `Analyze with AI`.

Flow:

Owner  
  │  
  │ Click "Analyze with AI"  
  ↓  
System  
  │  
  │ Check if analysis already running  
  ↓  
AI Analysis  
  │  
  ↓  
Insight / Recommendation

Hasil analisis akan **meng-update insight merchant** (bukan membuat data baru). `updated_at` pada insight menandakan waktu analisis terakhir.

### **Batasan AI**

Tidak ada **limit harian** — Owner dapat memicu analisis kapan saja (FR-AI-012, ASM-010, UR-AI-010). Mencegah request berulang dilakukan lewat **idempotency**: jika job analisis masih berjalan untuk merchant, request baru ditolak/409 hingga selesai.

Tujuan dari pembatasan ini:

* Menghindari spam request ke AI  
* Mengurangi penggunaan token  
* Menghindari analisis berulang yang terlalu sering  
* Menghindari analisis yang tidak memberikan perubahan signifikan dalam waktu singkat  
* Menjaga efisiensi penggunaan resource

Contoh:

10 August  
Owner → Analyze AI ✅

11 August  
Owner → Analyze AI ✅ (tanpa batas harian)

---

# **9. Batasan Sistem**

Batasan berikut menjadi scope yang disepakati untuk project.

### **Business Structure**

* Sistem merupakan **multi-tenant SaaS** — dapat melayani banyak merchant; setiap Owner memiliki tepat satu merchant pada MVP (FR-TEN-002).  
* Satu merchant dapat memiliki banyak outlet.  
* Satu outlet dapat memiliki banyak cashier.  
* Satu cashier hanya terhubung dengan satu outlet.  
* Owner berada pada scope merchant dan mengelola Merchant/Outlet/staf.  
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

# **10. Scope yang Tidak Ditangani**

Project ini tidak berfokus pada:

* Payment gateway  
* Sistem pembayaran eksternal  
* Multi-merchant dalam satu sistem  
* Kasir yang dapat ditugaskan ke banyak outlet secara bersamaan  
* AI yang berjalan otomatis setiap periode menggunakan cron job  
* Analisis AI tanpa batas penggunaan  
* Sistem inventory/gudang terpisah di luar POS

---

# **11. Prinsip Arsitektur**

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

# **12. Prinsip Pengembangan**

Dokumen ini digunakan sebagai **single source of truth** untuk memahami konteks dan batasan project.

Sebelum mengubah struktur database, business flow, role, atau architecture, perubahan sebaiknya didiskusikan dan disepakati bersama tim.

Jika terdapat perubahan requirement, dokumen ini perlu diperbarui agar seluruh anggota memiliki pemahaman yang sama.

---

# **13. Ringkasan Keputusan**

| Aspek | Keputusan |
| ----- | ----- |
| Merchant | Multi-Tenant (satu Owner = satu Merchant) |
| Outlet | Multi Outlet |
| Cashier | Multi Cashier |
| Cashier Scope | 1 Cashier → 1 Outlet |
| Admin Scope | Merchant |
| Owner Scope | Merchant |
| Stock | Ada |
| Category | Entitas terpisah |
| Payment Gateway | Tidak ditangani |
| AI Trigger | Manual oleh Owner |
| AI Limit | Tidak ada limit harian (FR-AI-012, ASM-010) |
| AI Cron Job | Tidak digunakan sebagai trigger utama |
| AI Scope | Merchant |
| Transaction | Terhubung dengan Outlet & Cashier |
| Scalability | Menjadi consideration utama |
| Cost Efficiency | Menjadi consideration utama |
| Read Heavy | Dapat menggunakan Read Replica |
| Write Heavy | Primary Database |

