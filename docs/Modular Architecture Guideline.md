# **Modular Architecture Guideline**

## **1\. Tujuan**

Sistem dibangun menggunakan pendekatan **modular monolith** dengan tujuan:

1. Memisahkan business logic berdasarkan domain/module.  
2. Menjaga setiap module memiliki tanggung jawab yang jelas.  
3. Mengurangi coupling antar-module.  
4. Memungkinkan module dikembangkan dan diuji secara independen.  
5. Menyiapkan jalur migrasi menuju microservice apabila suatu module nantinya terbukti membutuhkan scaling secara independen.  
6. Menjaga implementasi tetap sederhana selama belum ada kebutuhan untuk memisahkan service.

> **Prinsip utama:**

> **Build simple first, preserve boundaries, scale when needed.**

> Kita tidak mengimplementasikan microservice hanya karena memungkinkan. Kita memastikan boundary-nya benar terlebih dahulu sehingga microservice dapat menjadi langkah lanjutan apabila memang dibutuhkan.

Pendekatan ini sejalan dengan prinsip **scale when needed**, di mana multiple instance, load balancer, read replica, dan Kubernetes dipertimbangkan berdasarkan workload dan hasil testing, bukan sekadar karena teknologinya tersedia.

---

# **2\. Arsitektur Dasar**

Struktur dasar setiap module tetap menggunakan pola yang familiar:

Controller  
    ↓  
Service  
    ↓  
Repository  
    ↓  
Database

Contoh:

CheckoutController  
        ↓  
CheckoutService  
        ↓  
CheckoutRepository  
        ↓  
PostgreSQL

**Modularitas tidak berarti kita harus meninggalkan pola Controller → Service → Repository.**

Yang berubah adalah **batas antar-module**.

---

# **3\. Apa yang Dimaksud Module?**

Module adalah kumpulan code yang memiliki **satu tanggung jawab/domain bisnis tertentu**.

Contoh:

src/  
└── modules/  
    ├── auth/  
    ├── merchant/  
    ├── outlet/  
    ├── user/  
    ├── product/  
    ├── inventory/  
    ├── cart/  
    ├── transaction/  
    ├── dashboard/  
    ├── analytics/  
    └── ai-insight/

Module bukan sekadar pemisahan folder.

Sebuah module harus memiliki:

* tanggung jawab yang jelas,  
* data yang menjadi ownership-nya,  
* business logic sendiri,  
* repository sendiri,  
* public interface yang jelas,  
* dan batas dependency dengan module lain.

---

# **4\. Aturan Utama Module**

## **Rule 1 — Setiap module harus memiliki ownership yang jelas**

Setiap data harus memiliki satu module yang menjadi **owner**.

Contoh:

| Data | Owner |
| ----- | ----- |
| Merchant | Merchant Module |
| Outlet | Outlet Module |
| User/Cashier | User Module |
| Product | Product Module |
| Category | Product Module |
| Stock | Inventory Module |
| Cart | Cart Module |
| Transaction | Transaction Module |
| AI Insight | AI Insight Module |

Module lain **tidak boleh mengambil alih business logic atau repository dari module tersebut.**

---

# **5\. Rule 2 — Repository bersifat internal terhadap module**

Ini salah satu aturan PALING PENTING.

Misalnya:

Inventory Module  
├── InventoryController  
├── InventoryService  
└── InventoryRepository

Maka:

CheckoutService

**tidak boleh melakukan:**

CheckoutService  
       ↓  
InventoryRepository

❌ Salah.

Karena Checkout masuk langsung ke implementation detail Inventory.

Yang diperbolehkan:

CheckoutService  
       ↓  
Inventory public interface  
       ↓  
InventoryService  
       ↓  
InventoryRepository

Dengan kata lain:

> **Module lain tidak boleh mengakses Repository module secara langsung.**

---

# **6\. Rule 3 — Module berkomunikasi melalui public contract**

Module harus menyediakan operasi yang memang dibutuhkan module lain.

Misalnya Inventory menyediakan:

checkStock()  
decreaseStock()  
reserveStock()  
releaseStock()

Checkout tidak perlu tahu:

bagaimana stock disimpan  
bagaimana query dibuat  
database apa yang digunakan  
repository apa yang digunakan

Checkout cukup mengetahui:

> "Inventory menyediakan kemampuan untuk melakukan pengecekan dan perubahan stock."

---

# **7\. Rule 4 — Service tetap menjadi pusat business logic**

Jangan memindahkan business logic ke Controller.

### **❌ Jangan**

@Controller()  
async checkout() {  
    // cek stock  
    // hitung harga  
    // update inventory  
    // insert transaction  
}

### **✅ Gunakan**

Controller  
    ↓  
CheckoutService  
    ↓  
Business Logic

Controller hanya bertugas:

* menerima request,  
* melakukan validation melalui DTO/pipeline,  
* memanggil service,  
* mengembalikan response.

---

# **8\. Rule 5 — Jangan mengakses database module lain secara langsung**

Misalnya Checkout membutuhkan data Inventory.

### **❌ Jangan:**

this.prisma.inventory.findMany(...)

di dalam Checkout.

Atau:

this.inventoryRepository.findStock(...)

### **✅ Gunakan:**

this.inventory.checkStock(...)

Dengan begitu ownership tetap berada di Inventory.

---

# **9\. Rule 6 — Hindari circular dependency**

Dependency sebaiknya memiliki arah yang jelas.

Contoh:

Checkout  
   ↓  
Inventory

lebih baik daripada:

Checkout  
   ↕  
Inventory

Kalau:

Checkout → Inventory  
Inventory → Checkout

terjadi terlalu sering, kemungkinan boundary module belum tepat.

---

# **10\. Rule 7 — Jangan membuat module terlalu bergantung pada module lain**

Misalnya Checkout membutuhkan:

Inventory  
Product  
Merchant  
Outlet  
User  
Transaction  
Payment  
Discount

dan semuanya dipanggil langsung dari CheckoutService.

Itu bisa menjadi tanda Checkout terlalu coupled.

Sebelum menambahkan dependency baru, tanyakan:

> "Apakah data/logic ini benar-benar menjadi tanggung jawab Checkout?"

Jika bukan, gunakan public contract module yang bersangkutan.

---

# **11\. Boundary Setiap Module**

Berikut boundary yang digunakan dalam sistem POS.

---

## **11.1 Merchant Module**

### **Responsibility**

Mengelola merchant/business.

Merchant  
├── create merchant  
├── update merchant  
├── get merchant  
└── merchant configuration

### **Owns**

merchants

### **Tidak bertanggung jawab terhadap**

stock  
transaction  
product  
AI analysis

---

## **11.2 Outlet Module**

### **Responsibility**

Mengelola outlet milik merchant.

Outlet  
├── create outlet  
├── update outlet  
├── get outlet  
└── outlet configuration

### **Owns**

outlets

### **Dependency**

Outlet membutuhkan identitas Merchant.

Tetapi:

OutletService

tidak boleh mengakses:

MerchantRepository

secara langsung.

Jika perlu validasi merchant:

OutletService  
      ↓  
MerchantPort  
      ↓  
MerchantService

---

## **11.3 Cart Module**

### **Responsibility**

Mengelola cart (keranjang belanja) per kasir pada suatu outlet.

Cart  
├── get cart  
├── add item ke cart  
├── update quantity item  
├── remove item dari cart  
└── clear cart

### **Owns**

carts  
cart_items

### **Scope**

Cart berada pada **scope Outlet** dan dioperasikan oleh **Cashier**.

Satu cart hanya dimiliki oleh satu kasir pada satu outlet.

Relasi:

User 1 ───── N Cart  
Outlet 1 ───── N Cart

Cart dibuat secara lazily ketika kasir menambahkan item pertama kali.

### **Tidak bertanggung jawab terhadap**

stock (dikelola Inventory Module)  
transaction (dikelola Transaction Module)  
product (dikelola Product Module)

### **Dependency**

Cart membutuhkan informasi Product (harga, nama) dan stock dari Inventory.

CartService  
      ↓  
ProductPort  
      ↓  
ProductService

CartService  
      ↓  
InventoryPort  
      ↓  
InventoryService

Checkout/Transaction membutuhkan isi cart saat checkout:

TransactionService  
      ↓  
CartPort  
      ↓  
CartService

---

## **11.4 AI Insight Module**

### **Responsibility**

Menyediakan hasil analisis AI (reasoning) untuk Owner.

### **Scope**

AI Insight berada pada **scope Merchant**.

### **1:1 dan Tanpa Histori**

Satu merchant hanya memiliki **satu insight** (1:1). Analisis AI berjalan maksimal **1x/hari** (manual oleh Owner) dan **tidak menyimpan histori** — hasil analisis terbaru meng-update insight yang sama.

Karena tidak ada histori, tidak ada endpoint list/dismiss. Owner hanya membaca hasil analisis hari itu.

### **Owns**

ai\_insights

### **Dependency**

AI Insight membutuhkan data agregasi dari Analytics.

AiInsightService  
      ↓  
AnalyticsPort  
      ↓  
AnalyticsService

---

# **12\. Product Module**

### **Responsibility**

Mengelola informasi produk.

Product  
├── create product  
├── update product  
├── delete product  
├── get product  
└── category management

### **Owns**

products  
categories

### **Product TIDAK memiliki stock.**

Ini penting.

Product  
    │  
    │ informasi produk  
    │  
    └── name  
        price  
        category  
        SKU

Sedangkan:

Inventory  
    │  
    └── stock quantity

Karena stock bisa berbeda berdasarkan outlet.

Contoh:

Product:  
Indomie Goreng

bisa mempunyai:

Outlet A → 50  
Outlet B → 12  
Outlet C → 100

Maka quantity lebih tepat menjadi bagian dari **Inventory**, bukan Product.

---

# **13\. Inventory Module**

### **Responsibility**

Inventory adalah **owner dari stock**.

Inventory  
├── check stock  
├── increase stock  
├── decrease stock  
├── reserve stock  
└── release stock

### **Owns**

inventory  
stock movement

Jika nantinya membutuhkan audit:

stock\_movements

juga menjadi bagian Inventory.

### **Public capability**

Inventory dapat menyediakan:

interface InventoryPort {  
    checkStock(  
        outletId: string,  
        productId: string,  
        quantity: number  
    ): Promise\<boolean\>;

    decreaseStock(  
        outletId: string,  
        productId: string,  
        quantity: number  
    ): Promise\<void\>;  
}

---

# **14\. Transaction / Checkout Module**

Untuk sistem POS, Checkout merupakan salah satu kandidat module yang berpotensi memiliki workload tinggi.

### **Responsibility**

Checkout bertanggung jawab terhadap **orchestrating proses transaksi**.

Contoh:

Checkout  
    ↓  
validate request  
    ↓  
check inventory  
    ↓  
calculate total  
    ↓  
create transaction  
    ↓  
decrease inventory

### **Checkout TIDAK memiliki ownership stock.**

Checkout hanya meminta Inventory:

inventory.checkStock(...)  
inventory.decreaseStock(...)

---

# **15\. Contoh Hubungan Checkout dan Inventory**

### **Struktur:**

modules/  
│  
├── checkout/  
│   ├── checkout.controller.ts  
│   ├── checkout.service.ts  
│   ├── checkout.repository.ts  
│   └── ports/  
│       └── inventory.port.ts  
│  
└── inventory/  
    ├── inventory.controller.ts  
    ├── inventory.service.ts  
    └── inventory.repository.ts

Hubungannya:

                 CHECKOUT MODULE  
                          
CheckoutController  
        ↓  
CheckoutService  
        ↓  
InventoryPort  
        │  
        │  
        ▼  
                  INVENTORY MODULE  
                          
InventoryService  
        ↓  
InventoryRepository  
        ↓  
PostgreSQL

---

# **16\. Apa Itu Interface / Port?**

Interface adalah **kontrak kemampuan yang diberikan atau dibutuhkan sebuah module**.

Contoh:

export interface InventoryPort {

    checkStock(  
        outletId: string,  
        productId: string,  
        quantity: number  
    ): Promise\<boolean\>;

    decreaseStock(  
        outletId: string,  
        productId: string,  
        quantity: number  
    ): Promise\<void\>;  
}

Checkout tidak peduli bagaimana Inventory mengimplementasikan fungsi tersebut.

Checkout hanya mengetahui:

checkStock()  
decreaseStock()

---

# **17\. Kenapa Interface Berguna untuk Microservice?**

Sekarang:

Checkout  
    ↓  
InventoryPort  
    ↓  
InventoryService

Semua masih berada dalam satu NestJS application.

Nanti:

Checkout  
    ↓  
InventoryPort  
    ↓  
HTTP Adapter  
    ↓  
Inventory Microservice

Atau:

Checkout  
    ↓  
InventoryPort  
    ↓  
Message Adapter  
    ↓  
Inventory Microservice

Business logic Checkout tidak harus mengetahui apakah Inventory berada:

dalam process yang sama

atau:

di server lain

---

# **18\. Jangan Semua Hal Dibuat Interface**

Interface **tidak perlu dibuat untuk setiap class**.

Jangan sampai:

ProductServiceInterface  
ProductRepositoryInterface  
ProductControllerInterface  
ProductDTOInterface  
ProductEntityInterface  
...

dan akhirnya architecture malah menjadi rumit.

Interface/Port terutama digunakan untuk:

> **dependency yang melintasi boundary module dan berpotensi diganti implementasinya.**

Contoh yang masuk akal:

Checkout → Inventory  
Checkout → Transaction  
AI → AI Provider

---

# **19\. Struktur Folder yang Disarankan**

Untuk tahap awal, gunakan struktur yang masih familiar.

src/  
│  
├── modules/  
│   │  
│   ├── auth/  
│   │   ├── auth.controller.ts  
│   │   ├── auth.service.ts  
│   │   ├── auth.repository.ts  
│   │   ├── dto/  
│   │   └── ports/  
│   │  
│   ├── merchant/  
│   │   ├── merchant.controller.ts  
│   │   ├── merchant.service.ts  
│   │   ├── merchant.repository.ts  
│   │   ├── dto/  
│   │   └── ports/  
│   │  
│   ├── outlet/  
│   │   ├── outlet.controller.ts  
│   │   ├── outlet.service.ts  
│   │   ├── outlet.repository.ts  
│   │   ├── dto/  
│   │   └── ports/  
│   │  
│   ├── product/  
│   │   ├── product.controller.ts  
│   │   ├── product.service.ts  
│   │   ├── product.repository.ts  
│   │   ├── dto/  
│   │   └── ports/  
│   │  
│   ├── inventory/  
│   │   ├── inventory.controller.ts  
│   │   ├── inventory.service.ts  
│   │   ├── inventory.repository.ts  
│   │   ├── dto/  
│   │   └── ports/  
│   │  
│   ├── cart/  
│   │   ├── cart.controller.ts  
│   │   ├── cart.service.ts  
│   │   ├── cart.repository.ts  
│   │   ├── dto/  
│   │   └── ports/  
│   │  
│   ├── checkout/  
│   │   ├── checkout.controller.ts  
│   │   ├── checkout.service.ts  
│   │   ├── checkout.repository.ts  
│   │   ├── dto/  
│   │   └── ports/  
│   │  
│   ├── analytics/  
│   │   ├── analytics.controller.ts  
│   │   ├── analytics.service.ts  
│   │   ├── analytics.repository.ts  
│   │   └── ports/  
│   │  
│   └── ai-insight/  
│       ├── ai-insight.controller.ts  
│       ├── ai-insight.service.ts  
│       ├── ai-insight.repository.ts  
│       └── ports/  
│  
└── shared/  
    ├── guards/  
    ├── decorators/  
    ├── filters/  
    └── utils/

---

# **20\. Apa yang Boleh Ada di `shared`?**

`shared` hanya untuk sesuatu yang benar-benar **generic**.

Contoh:

shared/  
├── guards/  
├── decorators/  
├── filters/  
└── utils/

### **Jangan masukkan:**

shared/  
└── inventory.service.ts

atau:

shared/  
└── transaction.helper.ts

kalau sebenarnya itu business logic sebuah module.

Karena akhirnya `shared` berubah menjadi:

> "tempat buang semua code."

---

# **21\. Database Boundary**

Walaupun sekarang kita menggunakan **satu PostgreSQL**, secara logical ownership harus tetap jelas.

PostgreSQL  
│  
├── merchants  
│       → Merchant Module  
│  
├── outlets  
│       → Outlet Module  
│  
├── products  
│       → Product Module  
│  
├── inventory  
│       → Inventory Module  
│  
├── carts  
│       → Cart Module  
│  
├── transactions  
│       → Transaction Module  
│  
└── ai\_insights  
        → AI Insight Module

Satu database **tidak berarti semua module bebas mengakses semua tabel**.

Rule:

> **Module hanya boleh melakukan operasi database terhadap data yang menjadi ownership-nya.**

---

# **22\. Foreign Key Tidak Berarti Module Boleh Mengakses Repository**

Misalnya:

inventory  
product\_id → products.id

Boleh saja database memiliki foreign key.

Tetapi:

InventoryService

tidak otomatis boleh melakukan seluruh operasi Product.

Jika membutuhkan informasi Product, gunakan public contract:

Inventory  
    ↓  
ProductPort  
    ↓  
ProductService

atau desain ulang supaya Inventory tidak perlu mengetahui detail Product.

---

# **23\. API Contract Berbeda dengan Internal Module Contract**

Ada dua jenis contract.

### **External API Contract**

Untuk frontend:

POST /transactions  
GET /products  
GET /inventory

### **Internal Contract**

Untuk komunikasi antar-module:

InventoryPort  
ProductPort  
TransactionPort

External API tidak harus berubah hanya karena implementation internal berubah.

Misalnya:

Frontend  
   ↓  
POST /transactions  
   ↓  
Checkout

Tetap sama meskipun nantinya:

Checkout Module

berubah menjadi:

Checkout Microservice

---

# **24\. Synchronous Communication**

Untuk operasi yang harus selesai sebelum request dilanjutkan, gunakan komunikasi synchronous.

Contoh Checkout:

Client  
  ↓  
Checkout  
  ↓  
Inventory.checkStock()  
  ↓  
Transaction.create()  
  ↓  
Inventory.decreaseStock()  
  ↓  
Response

Karena customer harus tahu:

> "Checkout berhasil atau gagal?"

---

# **25\. Asynchronous Communication**

Untuk proses yang tidak harus selesai dalam request utama, gunakan asynchronous processing.

Contoh AI:

Owner  
  ↓  
POST /ai-insights/analyze  
  ↓  
Backend  
  ↓  
Create Job  
  ↓  
Queue  
  ↓  
Worker  
  ↓  
AI  
  ↓  
Save Result

Dengan begitu proses AI tidak menghambat operasi transactional seperti kasir. Rancangan sebelumnya juga menempatkan AI sebagai asynchronous worker dan memisahkannya dari API server.

---

# **26\. Jangan Memaksakan Async ke Semua Module**

Tidak semua proses harus asynchronous.

### **Synchronous**

Login  
Create Product  
Update Stock  
Checkout  
Create Transaction

### **Asynchronous**

AI Analysis  
Report Generation  
Large Data Processing  
Notification

Gunakan asynchronous ketika prosesnya memang tidak perlu selesai dalam HTTP request utama.

---

# **27\. Read dan Write Workload**

Module juga perlu dibedakan berdasarkan karakter workload.

### **Write-heavy**

Contoh:

Checkout  
Transaction  
Inventory

Karena banyak:

INSERT  
UPDATE

### **Read-heavy**

Contoh:

Dashboard  
Analytics  
Historical Transaction  
AI preprocessing

Rancangan database kita dapat berkembang menjadi:

                PostgreSQL  
                     │  
             ┌───────┴───────┐  
             ↓               ↓  
          Primary          Replica  
             │               │  
           WRITE             READ

Read replica cocok untuk dashboard, analytics, historical analysis, dan preprocessing AI, tetapi harus memperhatikan replication lag sehingga tidak cocok untuk kebutuhan yang memerlukan read-after-write consistency.

---

# **28\. Dependency Matrix**

Supaya gampang menentukan hubungan antar-module, gunakan tabel seperti ini:

| Module | Boleh menggunakan |
| ----- | ----- |
| Auth | User |
| Merchant | Auth |
| Outlet | Merchant |
| User | Merchant, Outlet |
| Product | Merchant |
| Inventory | Product, Outlet |
| Cart | Product, Inventory, User, Outlet |
| Checkout | Product, Inventory, Outlet, User |
| Transaction | Checkout, Inventory |
| Dashboard | berbagai read contracts |
| Analytics | Transaction, Product, Inventory |
| AI Insight | Analytics |

**Catatan:** tabel ini adalah dependency awal dan harus divalidasi lagi ketika domain logic ditulis.

Yang tidak boleh:

Checkout  
  ↓  
InventoryRepository ❌

Yang benar:

Checkout  
  ↓  
InventoryPort  
  ↓  
InventoryService

---

# **29\. Contoh Dependency Checkout**

                        CHECKOUT  
                            │  
             ┌──────────────┼──────────────┐  
             ↓              ↓              ↓  
        ProductPort   InventoryPort    OutletPort  
             │              │              │  
             ↓              ↓              ↓  
        Product          Inventory       Outlet  
        Service           Service        Service  
             │              │              │  
             ↓              ↓              ↓  
        Repository       Repository     Repository

Checkout **tidak memiliki repository module lain**.

Checkout hanya memiliki:

checkout.repository

untuk data yang memang menjadi ownership Checkout.

---

# **30\. Rule untuk Setiap Pull Request**

Sebelum merge code, cek:

### **Boundary**

* Apakah code berada di module yang tepat?  
* Apakah business logic berada di Service yang tepat?  
* Apakah module ini mengakses repository module lain?

### **Dependency**

* Apakah dependency antar-module memang diperlukan?  
* Apakah dependency hanya menggunakan public contract?  
* Apakah terjadi circular dependency?

### **Database**

* Apakah module hanya mengakses data yang menjadi ownership-nya?  
* Apakah ada query langsung ke tabel module lain?

### **Future Scaling**

* Jika module ini nantinya dipisahkan menjadi microservice, apakah boundary-nya sudah jelas?  
* Apakah business logic module lain ikut tercampur?  
* Apakah komunikasi antar-module sudah melalui contract?

---

# **31\. Prinsip Migrasi ke Microservice**

**Jangan membuat microservice sekarang hanya untuk "persiapan".**

Yang dipersiapkan sekarang adalah **boundary**.

Contoh sekarang:

                MODULAR MONOLITH

┌─────────────────────────────────────────┐  
│               NestJS                    │  
│                                         │  
│  Checkout ──→ Inventory ──→ PostgreSQL │  
│      │                                  │  
│      └────→ Product                     │  
│                                         │  
└─────────────────────────────────────────┘

Setelah testing:

Checkout CPU \= tinggi  
Inventory CPU \= rendah  
Product CPU \= rendah

maka Checkout dapat menjadi kandidat scaling.

Kemudian:

                FUTURE

             Load Balancer  
                   │  
          ┌────────┴────────┐  
          ↓                 ↓  
    Checkout \#1       Checkout \#2  
          │                 │  
          └────────┬────────┘  
                   ↓  
            Inventory Service

Jika benar-benar diperlukan, Checkout dapat diekstrak menjadi:

Checkout Microservice

karena boundary sudah disiapkan dari awal.

---

# **32\. Prinsip Scaling**

Scaling dilakukan berdasarkan evidence.

Implement  
    ↓  
Load Test  
    ↓  
Identify Bottleneck  
    ↓  
Optimasi  
    ↓  
Test kembali  
    ↓  
Masih bottleneck?  
    │  
    ├── No → Stop  
    │  
    └── Yes  
          ↓  
      Scale Up

Jangan langsung:

Microservice  
\+  
Load Balancer  
\+  
Kubernetes  
\+  
Autoscaling  
\+  
Multiple Instance

hanya karena semuanya tersedia.

Dokumen arsitektur kita juga menempatkan multiple instance, load balancer, read replica, dan Kubernetes sebagai scalability extension yang dipertimbangkan berdasarkan hasil testing.

---

# **33\. Future Scaling Architecture**

Ketika kebutuhan memang terbukti:

                        Load Balancer  
                              │  
                    ┌─────────┴─────────┐  
                    ↓                   ↓  
                Backend \#1          Backend \#2  
                    │                   │  
        ┌───────────┴───────────────────┐  
        │                               │  
    Checkout                         Other Modules  
        │  
        ↓  
 Inventory / Product  
        │  
        ↓  
 PostgreSQL  
       / \\  
      /   \\  
 Primary  Read Replica

Jika jumlah service/container sudah semakin kompleks, barulah orchestration seperti Kubernetes dapat dipertimbangkan. Kubernetes bukan otomatis diperlukan hanya karena merchant banyak; workload, jumlah service, deployment complexity, availability, scaling requirement, dan operational overhead tetap harus menjadi pertimbangannya.

---

# **34\. Prinsip Utama yang Harus Disepakati Tim**

Ini bagian yang menurut gue **wajib kalian sepakati sebelum coding**.

### **Principle 1 — Simple First**

> Kita menggunakan arsitektur sesederhana mungkin yang mampu memenuhi requirement.

### **Principle 2 — Clear Ownership**

> Setiap data dan business logic memiliki satu module sebagai owner.

### **Principle 3 — No Direct Repository Access**

> Module tidak boleh mengakses repository module lain secara langsung.

### **Principle 4 — Communicate Through Contract**

> Antar-module berkomunikasi melalui public service/port/interface, bukan implementation detail.

### **Principle 5 — Database Ownership**

> Satu database boleh digunakan bersama, tetapi ownership data tetap dipisahkan secara logical.

### **Principle 6 — Avoid Circular Dependency**

> Dependency antar-module harus memiliki arah yang jelas dan sebisa mungkin tidak membentuk circular dependency.

### **Principle 7 — Async Only When Needed**

> Proses yang tidak perlu selesai dalam request utama dapat diproses asynchronous.

### **Principle 8 — Scale Based on Evidence**

> Infrastruktur scaling diterapkan berdasarkan hasil load/stress testing dan bottleneck yang ditemukan.

### **Principle 9 — Prepare Boundary, Not Infrastructure**

> Yang dipersiapkan dari awal adalah boundary dan contract module, bukan langsung microservice, load balancer, atau Kubernetes.

### **Principle 10 — Scaling Without Overspending**

> Setiap keputusan arsitektur harus mempertimbangkan trade-off antara performance, scalability, complexity, dan infrastructure cost.

---

# **35\. Simplified Mental Model**

Kalau semua pembahasan di atas terlalu banyak, **cukup ingat gambar ini**:

                MODULE  
                   │  
       ┌───────────┼───────────┐  
       ↓           ↓           ↓  
 Controller     Service    Repository  
                   │  
                   │  
                   ↓  
              Database

Ketika module lain butuh sesuatu:

MODULE A  
   │  
   ↓  
Public Contract  
   │  
   ↓  
MODULE B  
   │  
   ↓  
Service  
   │  
   ↓  
Repository

**Jangan:**

MODULE A  
   │  
   └────────────→ Repository B ❌

Dan kalau suatu hari mau microservice:

SEKARANG

Module A  
   ↓  
Contract  
   ↓  
Module B

NANTI

Service A  
   ↓  
Contract / Adapter  
   ↓  
Network  
   ↓  
Service B

**Jadi yang kita bangun sekarang bukan microservice-nya. Kita membangun boundary yang membuat perpindahan menuju microservice masuk akal.**

---

# **36\. Rule of Thumb untuk Tim**

Sebelum menulis code antar-module, tanyakan 5 hal:

1\. Siapa owner data ini?  
2\. Siapa owner business logic ini?  
3\. Module mana yang membutuhkan data/logic tersebut?  
4\. Apakah dependency ini bisa lewat public contract?  
5\. Kalau module ini besok dipisah menjadi service sendiri,  
   apakah module lain harus ikut berubah?

Kalau jawabannya:

> **"Module A butuh sesuatu dari Module B."**

maka jangan langsung:

A → Repository B

tanya dulu:

"A sebenarnya butuh kemampuan apa dari B?"

Misalnya:

Checkout butuh:  
"Apakah stock cukup?"

Maka contract-nya:

checkStock(...)

Bukan:

getInventoryRepository(...)

**Itulah inti boundary.**

---

## **Kesimpulan**

Kalian **nggak perlu membuang pola yang selama ini kalian pakai**.

Dari:

Controller  
    ↓  
Service  
    ↓  
Repository

cukup naik menjadi:

            MODULE A

Controller  
    ↓  
Service  
    ↓  
Public Contract  
    ↓  
             MODULE B  
                ↓  
             Service  
                ↓  
            Repository

Dan prinsip besarnya:

> **Jangan desain aplikasi berdasarkan "nanti pasti jadi microservice".**

> **Desain module berdasarkan domain dan ownership yang benar.**

> Kalau nanti hasil testing membuktikan sebuah module perlu di-scale secara independen, boundary yang sudah benar tadi menjadi fondasi untuk memisahkannya menjadi microservice.

Ini juga konsisten dengan rancangan kalian yang sudah memprioritaskan correctness → security → reliability → performance → scalability, bukan langsung lompat ke infrastructure complexity.

