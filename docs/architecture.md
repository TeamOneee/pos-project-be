# Architecture & Scaling Guide

> **Dokumen gabungan** dari *Low-Level Architecture (LLA)* dan *Architecture Decision Guide*.
> Berisi dua bagian besar: **(1) Arsitektur sistem** (komponen, data, async AI, deployment) dan
> **(2) Panduan keputusan scaling** (kapan naik level arsitektur).
>
> Module breakdown detail ada di `module-implementation-guide.md`; alur lintas-module ada di `system-flow.md`.
>
> *(Dokumen ini dibuat dengan menggabungkan `architecture.md` + `architecture.md` pada proses
> reorganisasi docs agar menjadi satu sumber arsitektur.)*

---

# Low-Level System Architecture (LLA)

## 1. Overview

Sistem menggunakan arsitektur client-server dengan pendekatan modular backend.

Arsitektur utama terdiri dari:

- Frontend sebagai client application.  
- Backend menggunakan NestJS sebagai REST API server.  
- PostgreSQL sebagai relational database utama.  
- Worker sebagai proses yang menangani pekerjaan asynchronous, terutama AI analysis (Level 1 disimpan di DB, Level 2 opsional Redis + BullMQ).  
- Docker sebagai containerization tool untuk menjalankan service tertentu secara konsisten.

Arsitektur dirancang agar dapat dikembangkan secara bertahap. Komponen seperti database replica, multiple backend instances, load balancer, dan Kubernetes tidak dianggap sebagai kebutuhan wajib pada tahap awal dan akan dipertimbangkan berdasarkan hasil pengujian performa dan kebutuhan scalability.

---

# 2. High-Level Architecture

```mermaid  
flowchart TB

    Client[Frontend / PWA]

    LB[Load Balancer\<br/>Optional - Future]

    BE1[Backend Instance\<br/>NestJS]  
    BE2[Backend Instance\<br/>NestJS\<br/>Optional - Future]

    DB[(PostgreSQL\<br/>Primary Database)]

    Replica[(PostgreSQL\<br/>Read Replica\<br/>Optional)]

    

    

    Worker[AI Worker\<br/>NestJS]

    AI[AI Model / AI Service]

    Client --> LB  
    LB --> BE1  
    LB -. Future .-> BE2

    BE1 --> DB  
    BE1 --> Replica

    BE1 --> Queue  
    Queue --> Redis  
    Redis --> Worker

    Worker --> Replica  
    Worker --> AI  
    Worker --> DB

> **Catatan:** Load balancer, multiple backend instances, dan read replica merupakan bagian dari rancangan scalability yang dapat diterapkan ketika hasil pengujian menunjukkan kebutuhan. Arsitektur awal tidak mengharuskan seluruh komponen tersebut tersedia sejak awal.

---

# **3. Main Architecture Components**

## **3.1 Frontend**

Frontend berfungsi sebagai client application yang digunakan oleh Owner, Admin, dan Kasir.

Frontend bertanggung jawab terhadap:

* Authentication interface.  
* Dashboard.  
* Employee management.  
* Outlet management.  
* Product management.  
* Category management.  
* Inventory interface.  
* Transaction interface.  
* AI Insight interface.

Frontend berkomunikasi dengan backend melalui REST API.

Frontend  
    |  
    | HTTP / HTTPS  
    v  
NestJS REST API

---

# **4. Backend**

Backend menggunakan **NestJS** sebagai framework utama.

NestJS dipilih karena:

* Mendukung modular architecture.  
* Memiliki dependency injection.  
* Memiliki Guard dan middleware untuk authentication dan authorization.  
* Mendukung DTO dan validation.  
* Cocok untuk membangun REST API.  
* Memudahkan pemisahan business logic berdasarkan module.  
* Mendukung integrasi dengan Redis dan BullMQ.

Backend menjadi pusat business logic dan bertanggung jawab terhadap:

* Authentication.  
* Authorization / RBAC.  
* Business validation.  
* Transaction processing.  
* Inventory management.  
* Dashboard data aggregation.  
* Analytics data processing.  
* AI analysis orchestration.

---

# **5. API Architecture**

Sistem menggunakan pendekatan **REST API**.

Contoh endpoint:

POST   /auth/login

GET    /dashboard  
GET    /analytics

GET    /products  
POST   /products  
PATCH  /products/:id

GET    /inventory  
PATCH  /inventory/:id

POST   /transactions  
GET    /transactions

POST   /ai-insights/analyze  
GET    /ai-insights

REST dipilih karena:

* Cocok untuk kebutuhan CRUD pada sistem POS.  
* Mudah dikonsumsi oleh frontend.  
* Struktur endpoint mudah dipahami.  
* Cocok dengan arsitektur modular NestJS.  
* Lebih sederhana untuk kebutuhan project saat ini dibandingkan memperkenalkan GraphQL.

GraphQL tidak menjadi kebutuhan pada tahap awal dan dapat dipertimbangkan kembali jika kebutuhan client dan data fetching menjadi jauh lebih kompleks.

---

# **6. Database**

Sistem menggunakan **PostgreSQL** sebagai relational database.

PostgreSQL dipilih karena:

* Mendukung relational data model.  
* Cocok dengan struktur data POS yang memiliki banyak relationship.  
* Mendukung transaction dan ACID properties.  
* Mendukung constraint dan foreign key.  
* Cocok untuk workload transactional.  
* Dapat digunakan untuk kebutuhan read-heavy maupun write-heavy.  
* Mendukung replication untuk pengembangan scalability di masa mendatang.

Pada tahap awal, sistem diasumsikan menggunakan satu PostgreSQL Primary Database.

NestJS  
   |  
   v  
PostgreSQL Primary

---

# **7. Database Read Replica**

Read replica merupakan bagian dari rancangan scalability dan **bukan kebutuhan wajib pada tahap awal**.

Jika workload read-heavy mulai meningkat, PostgreSQL dapat dikembangkan menjadi:

                PostgreSQL  
                     |  
             ┌───────┴───────┐  
             ↓               ↓  
          Primary          Replica  
          Database        Read Database  
             |  
          WRITE             READ

### **Primary Database**

Digunakan untuk operasi yang membutuhkan write, seperti:

* Membuat transaksi.  
* Update inventory.  
* Membuat atau mengubah product.  
* Mengubah data user.  
* Operasi bisnis lainnya.

### **Read Replica**

Dapat digunakan untuk workload yang lebih banyak membaca data, seperti:

* Dashboard.  
* Analytics.  
* Historical transaction analysis.  
* Data preprocessing untuk AI.

Read replica memiliki kemungkinan **replication lag**, sehingga tidak digunakan untuk data yang membutuhkan consistency secara langsung setelah write.

Penggunaan read replica akan dipertimbangkan berdasarkan hasil load testing dan kebutuhan workload aktual.

---

# **8. Redis**

Redis digunakan sebagai infrastructure untuk **BullMQ pada Level 2 (scale-up)**.

Redis tidak menjadi database utama sistem POS.

Pada Level 2, fungsi Redis terutama sebagai:

* Queue storage.  
* Temporary job state.  
* Communication layer antara producer dan worker.
* Rate limiting shared antar beberapa worker.

Backend  
   |  
   | Add Job  
   v  
BullMQ  
   |  
   v  
Redis  
   |  
   | Consume Job  
   v  
Worker

> **Berjenjang (tiered):** MVP dimulai dengan **Level 1 — baseline tanpa Redis**, yaitu job
> disimpan di tabel DB (`AiJobRecord`), diproses worker dengan rate limiting lokal. Redis + BullMQ
> hanya dipakai di **Level 2** ketika L1 kurang (butuh concurrency/retry terjadwal). Detail alur
> lengkap: [`ai-analyze-flow.md`](./ai-analyze-flow.md).

---

# **9. BullMQ and Asynchronous Processing**

BullMQ digunakan (Level 2) untuk menangani pekerjaan yang tidak perlu diselesaikan secara synchronous dalam HTTP request.

Contoh utama adalah AI analysis.

Workflow (Level 2):

Owner  
  |  
  | Trigger AI Analysis  
  v  
Backend  
  |  
  | Check if analysis already running (idempotent)  
  |  
  | Create Job  
  v  
BullMQ  
  |  
  v  
Redis  
  |  
  v  
AI Worker  
  |  
  | Process data  
  v  
AI Service  
  |  
  v  
Save AI Insight

> **Level 1 (baseline):** alur sama, tetapi "Create Job" ditulis ke tabel `AiJobRecord` di PostgreSQL,
> worker melakukan claim job + rate limiting lokal (tanpa Redis/BullMQ).

Pendekatan asynchronous digunakan agar proses AI tidak menahan request utama dan tidak mengganggu operasi transactional seperti kasir.

---

# **10. AI Worker**

AI Worker bertanggung jawab untuk memproses AI analysis secara asynchronous.

Worker dapat menjalankan proses seperti:

1. Mengambil job dari BullMQ (L2) **atau** claim job dari `AiJobRecord` (L1).  
2. Mengambil data yang diperlukan untuk analisis.  
3. Melakukan preprocessing / aggregation data.  
4. Mengirim data ke AI service (dengan timeout — FR-AI-011).  
5. Memproses response AI dan **memvalidasi output** sebelum dipublikasikan (EXT-AI-004).  
6. Menyimpan hasil analisis ke database (**upsert `AiInsight` 1:1**).  
7. Menandai job sebagai completed atau failed (retry terbatas — FR-AI-006).

Worker dapat dijalankan sebagai proses terpisah dari API server.

                   Redis  
                      |  
                  BullMQ Queue  
                      |  
              ┌───────┴───────┐  
              ↓               ↓  
          Worker 1        Worker 2  
              |  
              v  
          AI Service

Pada tahap awal, satu worker sudah cukup. Jumlah worker dapat ditambah apabila workload asynchronous meningkat.

---

# **11. AI Analysis Constraint**

AI analysis dilakukan dengan mekanisme manual trigger oleh Owner.

Constraint:

* Hanya Owner yang dapat melakukan AI analysis.  
* Trigger dilakukan secara manual.  
* Tidak ada batas maksimum penggunaan per merchant (FR-AI-012, ASM-010).  
* AI processing dilakukan secara asynchronous.  
* AI analysis tidak dijalankan secara otomatis menggunakan cron job pada tahap ini.

Tujuan pembatasan tersebut adalah:

* Menghindari penggunaan AI secara berlebihan.  
* Mengurangi penggunaan token.  
* Menghindari analisis berulang dalam periode yang terlalu dekat.  
* Memberikan kontrol kepada Owner terhadap kapan analisis dilakukan.

---

# **12. Docker**

Docker digunakan untuk melakukan containerization terhadap infrastructure dan application services.

Pada tahap awal, Docker digunakan untuk menjalankan Redis.

Docker  
└── Redis Container

Hal ini membuat environment Redis lebih konsisten antar developer tanpa mengharuskan setiap developer melakukan instalasi Redis secara native pada operating system.

Contoh:

docker compose up -d

Kemudian:

NestJS (Local)  
      |  
    BullMQ  
      |  
      v  
Redis Container

---

# **13. Future Containerization**

Jika kebutuhan deployment berkembang, service lainnya dapat dijalankan dalam container.

Contoh:

Docker Compose

├── frontend  
├── backend  
├── worker  
└── redis

Containerization backend dan worker dapat membantu menjaga konsistensi environment antara development dan deployment.

Namun, containerization tidak berarti setiap komponen harus langsung dijalankan menggunakan container sejak awal.

Implementasi dilakukan bertahap sesuai kebutuhan project.

---


---

# **20. Architecture Priorities**

Prioritas implementasi sistem dibagi menjadi beberapa tahap.

### **Priority 1 — Core System**

Wajib dibangun terlebih dahulu:

* NestJS REST API.  
* PostgreSQL Primary.  
* Authentication.  
* RBAC.  
* Merchant management.  
* Outlet management.  
* Product management.  
* Inventory.  
* Transaction.  
* Dashboard baseline.  
* AI Worker.  
* Docker (for API container only).

### **Priority 2 — Performance and Reliability**

Setelah core system berjalan:

* Load testing.  
* Stress testing.  
* Query optimization.  
* Transaction consistency testing.  
* Queue reliability testing.  
* Monitoring.  
* Error handling.  
* Performance benchmarking.

### **Priority 3 — Scalability Extension**

Hanya diterapkan apabila testing menunjukkan kebutuhan:

* Read Replica.  
* Multiple backend instances.  
* Load Balancer.  
* Multiple AI Workers.  
* Containerization seluruh application services.

### **Priority 4 — Advanced Infrastructure**

Dipertimbangkan apabila kompleksitas sistem sudah membutuhkannya:

* Kubernetes.  
* Horizontal Pod Autoscaling.  
* Advanced service orchestration.  
* Advanced observability infrastructure.

---


---

# **21. Technology Summary**

| Component | Technology | Purpose |
| ----- | ----- | ----- |
| Frontend | Web / PWA | Client application |
| Backend | NestJS | REST API & business logic |
| API Style | REST | Communication between frontend and backend |
| Database | PostgreSQL | Primary relational database |
| Queue | – | Asynchronous job processing (Level 1: DB-only via AiJobRecord) |
| Queue Storage | – | PostgreSQL (Level 1) / Redis (Level 2, optional) |
| Worker | NestJS Worker | Asynchronous processing, especially AI |
| Containerization | Docker | Consistent service environment |
| Database Scaling | PostgreSQL Read Replica | Future read-heavy workload |
| Backend Scaling | Multiple Instances | Future horizontal scaling |
| Traffic Distribution | Load Balancer | Distribute traffic across backend instances |
| Orchestration | Kubernetes | Future container orchestration if complexity requires it |

---

# **22. Architecture Principle**

Sistem menggunakan prinsip **scale when needed**.

Komponen infrastructure tidak ditambahkan hanya karena secara teknis tersedia, tetapi berdasarkan kebutuhan yang dapat dibuktikan melalui testing dan workload.

Prioritas utama adalah:

Correctness  
    ↓  
Security  
    ↓  
Reliability  
    ↓  
Performance  
    ↓  
Scalability

Dengan pendekatan ini, sistem dapat dimulai dengan architecture yang relatif sederhana namun tetap memiliki jalur pengembangan menuju architecture yang lebih scalable.

### Nah, inti arsitekturnya aku sengaja bikin seperti ini

```text  
                ┌───────────────┐  
                │   Frontend    │  
                │     / PWA     │  
                └───────┬───────┘  
                        │  
                     REST API  
                        │  
                        ▼  
              ┌──────────────────┐  
              │ NestJS Backend   │  
              │                  │  
              │ Auth             │  
              │ Users            │  
              │ Products         │  
              │ Inventory        │  
              │ Transactions     │  
              │ Dashboard        │  
              │ Analytics        │  
              │ AI Insights      │  
              └──────┬───────┬───┘  
                     │       │  
                  WRITE      │ Queue  
                     │       ▼  
                     │     Redis  
                     │       │  
                     ▼       ▼  
                 PostgreSQL  Worker  
                 Primary       │  
                     │         ▼  
                     │      AI Service  
                     │  
                     └──→ Read Replica  
                           (Future)

Dan **prioritas kalian menurutku jangan sampai kebalik**:

> **Sekarang jangan mikirin Kubernetes dulu.**

Urutannya lebih sehat:

**NestJS + PostgreSQL + Redis/BullMQ → testing → lihat bottleneck → baru scale.**

Kalau ternyata 1 backend instance masih kuat, **nggak perlu maksa multi-instance**. Kalau multi-instance baru diperlukan, **load balancer ikut masuk**. Kalau jumlah container/service sudah makin kompleks sampai operational overhead-nya terasa, **baru Kubernetes masuk pertimbangan**.

Sementara **read replica agak berbeda**: itu bukan karena "server backend kurang kuat", tetapi karena kalian punya workload **read-heavy (dashboard/analytics/AI)** yang ingin dipisahkan dari workload **write-heavy (terutama kasir/transaksi)**. Jadi dia bisa menjadi optimasi yang lebih awal dipertimbangkan kalau hasil testing memang menunjukkan database read sebagai bottleneck.


---

# Architecture Decision Guide

## 1. Tujuan

Dokumen ini menjadi panduan tim dalam menentukan kapan sistem perlu ditingkatkan dari satu level arsitektur ke level berikutnya.

Prinsip utama:

> **Scaling without overspending.**

Artinya, kita tidak mengejar arsitektur yang paling kompleks atau paling canggih, tetapi mencari solusi **paling sederhana yang mampu memenuhi requirement dengan penggunaan resource dan biaya yang efisien**.

Kita tidak langsung menggunakan Microservices, Kubernetes, Load Balancer, atau banyak instance hanya karena teknologi tersebut dapat melakukan scaling.

Setiap peningkatan arsitektur harus memiliki:

1. Masalah yang jelas.  
2. Bukti bahwa level sebelumnya tidak cukup.  
3. Alasan teknis mengapa solusi berikutnya diperlukan.  
4. Pertimbangan cost dan resource.  
5. Pengujian untuk membuktikan bahwa solusi tersebut memberikan improvement.

---

# 2. Prinsip Utama

## 2.1 Solve the problem, not the technology

Jangan memulai dari:

> "Kita pakai Microservices."

Tetapi mulai dari:

> "Masalah apa yang kita hadapi?"

Kemudian:

> "Solusi paling sederhana apa yang bisa menyelesaikan masalah tersebut?"

Contoh:

Jika masalahnya adalah query database terlalu lambat:

```text  
Jangan langsung:  
Database → tambah instance → Kubernetes → Microservices

Tetapi:  
Query lambat  
    ↓  
Analisis query  
    ↓  
Indexing  
    ↓  
Optimasi query  
    ↓  
Test  
    ↓  
Masih lambat?  
    ↓  
Evaluasi solusi berikutnya

---

# **3. Architecture Escalation Level**

Urutan pengembangan yang digunakan:

LEVEL 0  
Modular Monolith  
      ↓  
LEVEL 1  
Application & Database Optimization  
      ↓  
LEVEL 2  
Horizontal Scaling  
      ↓  
LEVEL 3  
Load Balancer + Autoscaling  
      ↓  
LEVEL 4  
Microservice / Selective Service Extraction  
      ↓  
LEVEL 5  
Advanced Infrastructure Scaling

Tidak semua project harus mencapai Level 5.

Jika requirement sudah terpenuhi di Level 1 atau Level 2, maka **tidak perlu naik level**.

---

# **4. LEVEL 0 — Modular Monolith**

## **Tujuan**

Membuat sistem dengan module yang memiliki boundary jelas, tetapi seluruh aplikasi masih dijalankan sebagai satu deployment.

Contoh:

Backend  
│  
├── Auth  
├── User  
├── Checkout  
├── Inventory  
└── Analytics

Setiap module bertanggung jawab terhadap domain masing-masing.

Contoh:

Checkout  
    ↓  
Checkout Service  
    ↓  
Checkout Repository

dan:

Inventory  
    ↓  
Inventory Service  
    ↓  
Inventory Repository

Module lain **tidak boleh sembarangan mengakses repository module lain**.

Jika Checkout membutuhkan Inventory:

Checkout  
    ↓  
Inventory Interface  
    ↓  
Inventory Service  
    ↓  
Inventory Repository

Bukan:

Checkout  
    ↓  
Inventory Repository ❌

## **Tujuan Modularisasi**

Modularisasi dilakukan bukan berarti kita harus langsung menjadi Microservices.

Tujuannya adalah agar:

* boundary domain jelas  
* tanggung jawab module jelas  
* dependency antar-module terkontrol  
* business logic tidak saling bercampur  
* module lebih mudah diuji  
* module lebih mudah dipisahkan apabila suatu saat memang diperlukan

---

# **5. Kapan LEVEL 0 sudah cukup?**

Jika setelah implementasi dan pengujian:

* latency memenuhi target  
* throughput memenuhi target  
* database mampu menangani workload  
* resource masih dalam batas wajar  
* tidak terdapat bottleneck signifikan  
* requirement scalability terpenuhi

Maka:

> **STOP. Tidak perlu naik level.**

Jangan menambahkan Microservices hanya karena "bisa lebih scalable".

---

# **6. LEVEL 1 — Application & Database Optimization**

Sebelum menambah instance atau memecah service, optimalkan resource yang sudah tersedia.

Contoh optimasi:

* Database indexing  
* Query optimization  
* Read/write separation  
* Read replica  
* Connection pooling  
* Pagination  
* Caching jika memang diperlukan  
* Rate limiting  
* Retry mechanism  
* Asynchronous processing  
* Pemilihan model AI yang sesuai  
* Mengurangi pekerjaan yang tidak diperlukan

---

# **7. Kapan naik dari LEVEL 1?**

Naik apabila setelah optimasi masih terdapat bottleneck.

Contoh:

Before:

CPU       95%  
Latency   2.5s  
Error     tinggi

Setelah:

Indexing  
Query Optimization  
Read Replica  
Rate Limiting  
Async AI

hasilnya:

CPU       90%  
Latency   2.2s  
Error     masih terjadi

Jika bottleneck berasal dari **compute aplikasi**, maka lanjut ke horizontal scaling.

Namun jika bottleneck berasal dari database, jangan langsung menambah instance aplikasi.

Cari terlebih dahulu resource mana yang menjadi bottleneck.

---

# **8. LEVEL 2 — Horizontal Scaling**

Horizontal scaling berarti menjalankan beberapa instance aplikasi.

Contoh:

Before:

Client  
  ↓  
Backend Instance

After:

Client  
  ↓  
Backend Instance 1  
Backend Instance 2  
Backend Instance 3

Horizontal scaling digunakan ketika:

> **Satu instance aplikasi tidak lagi mampu menangani workload yang dibutuhkan.**

Contoh indikator:

* CPU terlalu tinggi  
* memory tidak mencukupi  
* request throughput terlalu tinggi  
* latency meningkat ketika concurrency meningkat  
* request mulai gagal  
* workload dapat diproses secara paralel

---

# **9. Kapan TIDAK perlu Horizontal Scaling?**

Jangan menambah instance jika bottleneck sebenarnya berasal dari:

Database  
Query  
External API  
LLM  
Network  
Locking  
Memory leak

Contoh:

Backend CPU = 30%  
Database CPU = 95%

Menambah backend instance:

1 → 3 instance

belum tentu menyelesaikan masalah.

Malah dapat membuat database semakin terbebani.

Maka:

> **Scale resource yang menjadi bottleneck, bukan sekadar scale application.**

---

# **10. LEVEL 3 — Load Balancer + Autoscaling**

Jika aplikasi sudah membutuhkan lebih dari satu instance, traffic perlu didistribusikan.

Contoh:

                Load Balancer  
                /      |      \\  
               /       |       \\  
        Instance 1 Instance 2 Instance 3

Load Balancer bertugas mendistribusikan request ke instance yang tersedia.

---

# **11. Kapan Load Balancer diperlukan?**

Load Balancer diperlukan ketika:

> **Ada lebih dari satu instance yang menerima traffic secara bersamaan dan traffic perlu didistribusikan di antara instance tersebut.**

Jika hanya:

Client  
  ↓  
1 Backend Instance

maka Load Balancer belum memberikan manfaat yang signifikan.

---

# **12. Autoscaling**

Autoscaling digunakan ketika workload bersifat dinamis atau bursty.

Contoh:

Low Traffic

        LB  
         │  
    Instance 1

Saat traffic meningkat:

High Traffic

              ┌── Instance 1  
        LB ────┼── Instance 2  
              └── Instance 3

Ketika traffic turun:

Low Traffic

        LB  
         │  
    Instance 1

Tujuannya:

> **Tidak menjalankan kapasitas maksimum sepanjang waktu.**

Dengan demikian kita dapat menghindari:

Traffic rendah  
     ↓  
5 instance tetap hidup  
     ↓  
Resource terbuang  
     ↓  
Overspending

---

# **13. Kapan menggunakan Autoscaling?**

Autoscaling dipertimbangkan apabila:

* workload bersifat bursty  
* terdapat peak usage tertentu  
* traffic berubah secara signifikan  
* satu instance tidak cukup ketika peak  
* tetapi menjalankan banyak instance secara permanen tidak efisien

Contoh:

Business Hours  
    ↓  
Traffic tinggi  
    ↓  
Tambah instance

Outside Business Hours  
    ↓  
Traffic rendah  
    ↓  
Kurangi instance

---

# **14. LEVEL 4 — Microservice**

Microservice **bukan otomatis merupakan langkah setelah horizontal scaling**.

Microservice dipertimbangkan ketika terdapat kebutuhan untuk melakukan scaling atau deployment secara independen terhadap bagian tertentu dari aplikasi.

Misalnya:

Checkout       → sangat tinggi  
Inventory      → sedang  
Analytics      → rendah  
AI             → sangat berat

Jika semuanya masih satu deployment:

Backend  
├── Checkout  
├── Inventory  
├── Analytics  
└── AI

maka ketika Checkout membutuhkan lebih banyak capacity:

Instance 1 → semua module  
Instance 2 → semua module  
Instance 3 → semua module  
Instance 4 → semua module  
Instance 5 → semua module

Padahal hanya Checkout yang membutuhkan capacity tambahan.

---

# **15. Kapan Microservice mulai masuk akal?**

Microservice dapat dipertimbangkan jika terdapat kondisi seperti:

### **A. Independent Scaling**

Satu module membutuhkan capacity jauh lebih besar daripada module lain.

Checkout      × 5 instance  
Inventory     × 2 instance  
Analytics     × 1 instance

Jika modular monolith menyebabkan seluruh module ikut direplikasi, pemisahan dapat dipertimbangkan.

---

### **B. Resource Requirement Berbeda**

Contoh:

Checkout  
→ CPU intensive

Analytics  
→ memory intensive

AI  
→ membutuhkan resource besar

Jika kebutuhan tersebut saling mengganggu ketika berada dalam deployment yang sama, pemisahan dapat memberikan isolasi resource.

---

### **C. Deployment Independence**

Jika perubahan pada satu domain harus sering dilakukan tanpa ingin melakukan deployment seluruh aplikasi.

---

### **D. Bottleneck Terisolasi**

Stress test menunjukkan bahwa bottleneck hanya terjadi pada satu module.

Contoh:

Checkout  
    ↓  
Bottleneck

Inventory  
    ↓  
Normal

Analytics  
    ↓  
Normal

Dan bottleneck tersebut tidak dapat diselesaikan secara efisien hanya dengan optimasi atau horizontal scaling pada monolith.

---

# **16. Kapan TIDAK perlu Microservice?**

Jangan menggunakan Microservice jika:

* sistem masih kecil  
* boundary module belum jelas  
* belum ada bukti bottleneck  
* modular monolith masih memenuhi requirement  
* kompleksitas deployment lebih besar daripada benefit  
* komunikasi antar-service justru menambah overhead  
* biaya infrastructure meningkat tanpa kebutuhan yang jelas

Prinsip:

> **Microservice harus menyelesaikan masalah yang nyata.**

Bukan:

> "Microservice lebih scalable."

---

# **17. LEVEL 5 — Advanced Infrastructure**

Teknologi seperti:

* Kubernetes  
* Kubernetes Autoscaler  
* Service Mesh  
* advanced orchestration  
* distributed tracing  
* advanced service discovery  
* dan sebagainya

baru dipertimbangkan ketika kompleksitas sistem memang sudah membutuhkannya.

Jangan menggunakan teknologi hanya karena:

> "Teknologi ini bagus untuk portfolio."

Pertanyaannya harus:

> "Masalah apa yang teknologi ini selesaikan pada sistem kita?"

---

# **18. Decision Tree**

Gunakan decision tree berikut ketika mengambil keputusan arsitektur:

                   START  
                      │  
                      ▼  
             Apakah ada bottleneck?  
                  /        \\  
                NO          YES  
                │            │  
                ▼            ▼  
             STOP       Identifikasi  
                        bottleneck  
                             │  
              ┌──────────────┼──────────────┐  
              ▼              ▼              ▼  
           Database       Application      External  
              │              │              │  
              ▼              ▼              ▼  
         Optimize DB     Optimize App    Optimize/  
              │              │            redesign  
              └──────┬───────┴──────────────┘  
                     │  
                     ▼  
              Test kembali  
                     │  
                     ▼  
             Masih bottleneck?  
                /          \\  
              NO            YES  
              │              │  
              ▼              ▼  
            STOP       Apakah satu instance  
                       tidak mencukupi?  
                            /       \\  
                          NO         YES  
                          │           │  
                          ▼           ▼  
                       Cari      Horizontal  
                       bottleneck  Scaling  
                                      │  
                                      ▼  
                              Traffic bursty?  
                                  /       \\  
                                NO         YES  
                                │           │  
                                ▼           ▼  
                              STOP      Autoscaling  
                                            │  
                                            ▼  
                                   Apakah semua module  
                                   harus ikut di-scale?  
                                      /          \\  
                                    NO            YES  
                                    │              │  
                                    ▼              ▼  
                                  STOP       Pertimbangkan  
                                             Microservice  
                                                   │  
                                                   ▼  
                                           Test & Measure

---

# **19. Aturan "Evidence Before Escalation"**

Setiap kali ingin naik level, minimal harus bisa menjawab:

### **1. Apa masalahnya?**

Contoh:

> Checkout mengalami latency tinggi saat concurrency meningkat.

### **2. Apa buktinya?**

Contoh:

Concurrency : 500  
p95 latency : 2.8s  
CPU         : 95%  
Error rate  : 8%

### **3. Apa solusi level sekarang?**

Contoh:

> Query sudah di-index dan read workload sudah dipisahkan.

### **4. Mengapa solusi tersebut belum cukup?**

Contoh:

> Setelah optimasi, CPU application masih mencapai 95%.

### **5. Apa solusi berikutnya?**

> Horizontal scaling.

### **6. Apa trade-off-nya?**

Contoh:

> Resource infrastructure meningkat, tetapi hanya ketika traffic meningkat.

---

# **20. Prinsip Cost**

Setiap keputusan arsitektur harus mempertimbangkan:

Benefit  
    vs  
Complexity  
    +  
Infrastructure Cost  
    +  
Operational Cost

Tidak selalu:

More Technology = Better Architecture

Bisa saja:

Simple Architecture  
        +  
Good Optimization  
        +  
Appropriate Scaling  
        =  
Better Architecture

---

# **21. Contoh Skenario Project**

Misalnya terdapat:

500+ merchants  
Multi outlet  
Multi cashier  
Inventory  
Checkout  
Analytics  
AI

dan workload:

Checkout       → write heavy  
Inventory      → write heavy  
Analytics      → read heavy  
AI             → resource intensive

Maka jangan langsung:

Microservices  
+  
Kubernetes  
+  
Load Balancer  
+  
Autoscaling  
+  
Multiple Instances

Tetapi mulai:

LEVEL 0  
Modular Monolith  
        ↓  
LEVEL 1  
Indexing  
Read Replica  
Rate Limiting  
Async AI  
Query Optimization  
        ↓  
Stress Test  
        ↓  
Apakah masih bottleneck?  
        │  
       YES  
        ↓  
Identifikasi bottleneck  
        ↓  
Application capacity?  
        │  
       YES  
        ↓  
LEVEL 2  
Horizontal Scaling  
        ↓  
Traffic bursty?  
        │  
       YES  
        ↓  
LEVEL 3  
Load Balancer + Autoscaling  
        ↓  
Apakah scaling seluruh aplikasi  
menyebabkan resource waste?  
        │  
       YES  
        ↓  
LEVEL 4  
Pertimbangkan Microservice  
untuk module yang membutuhkan  
independent scaling

---

# **22. Prinsip Akhir Tim**

Kita tidak memiliki target:

> "Harus menggunakan Microservices."

Kita juga tidak memiliki target:

> "Harus tetap menggunakan Monolith."

Target kita:

> **Menyelesaikan requirement dengan arsitektur sesederhana mungkin, kemudian meningkatkan kompleksitas hanya ketika data menunjukkan bahwa kita memang membutuhkannya.**

### **Rule of Thumb**

Don't scale because you can.  
Scale because you need to.

Don't use Microservices because they scale.  
Use Microservices when independent scaling  
solves a real problem.

Don't add infrastructure because it is impressive.  
Add infrastructure when the workload justifies it.

---

# **23. Ringkasan Keputusan**

| Kondisi | Action |
| ----- | ----- |
| Belum ada bottleneck | Stay Modular Monolith |
| Query lambat | Indexing / Query Optimization |
| Read workload tinggi | Read Replica / Cache bila perlu |
| AI mengganggu request utama | Async Processing |
| Request terlalu banyak | Rate Limiting |
| 1 instance tidak cukup | Horizontal Scaling |
| Banyak instance diperlukan | Load Balancer |
| Traffic bursty | Autoscaling |
| Hanya satu module yang membutuhkan scaling besar | Evaluasi Microservice |
| Module membutuhkan resource berbeda | Evaluasi Microservice |
| Module perlu deployment independen | Evaluasi Microservice |
| Belum ada bukti kebutuhan Microservice | Jangan split |
| Requirement sudah terpenuhi | Stop |

---

# **Final Principle**

> **Start simple → Measure → Optimize → Test → Scale → Measure again → Split only when necessary.**

Arsitektur yang baik bukan arsitektur yang paling kompleks.

Arsitektur yang baik adalah arsitektur yang:

1. menyelesaikan masalah,  
2. memenuhi requirement,  
3. dapat berkembang,  
4. dan menggunakan resource secara efisien.

**Scaling without overspending.**

