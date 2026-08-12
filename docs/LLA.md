\# Low-Level System Architecture (LLA)

\#\# 1\. Overview

Sistem menggunakan arsitektur client-server dengan pendekatan modular backend.

Arsitektur utama terdiri dari:

\- Frontend sebagai client application.  
\- Backend menggunakan NestJS sebagai REST API server.  
\- PostgreSQL sebagai relational database utama.  
\- Redis sebagai penyimpanan queue untuk BullMQ.  
\- BullMQ sebagai mekanisme asynchronous job processing.  
\- Worker sebagai proses yang menangani pekerjaan asynchronous, terutama AI analysis.  
\- Docker sebagai containerization tool untuk menjalankan service tertentu secara konsisten.

Arsitektur dirancang agar dapat dikembangkan secara bertahap. Komponen seperti database replica, multiple backend instances, load balancer, dan Kubernetes tidak dianggap sebagai kebutuhan wajib pada tahap awal dan akan dipertimbangkan berdasarkan hasil pengujian performa dan kebutuhan scalability.

\---

\# 2\. High-Level Architecture

\`\`\`mermaid  
flowchart TB

    Client\[Frontend / PWA\]

    LB\[Load Balancer\<br/\>Optional \- Future\]

    BE1\[Backend Instance\<br/\>NestJS\]  
    BE2\[Backend Instance\<br/\>NestJS\<br/\>Optional \- Future\]

    DB\[(PostgreSQL\<br/\>Primary Database)\]

    Replica\[(PostgreSQL\<br/\>Read Replica\<br/\>Optional)\]

    Redis\[(Redis)\]

    Queue\[BullMQ Queue\]

    Worker\[AI Worker\<br/\>NestJS\]

    AI\[AI Model / AI Service\]

    Client \--\> LB  
    LB \--\> BE1  
    LB \-. Future .-\> BE2

    BE1 \--\> DB  
    BE1 \--\> Replica

    BE1 \--\> Queue  
    Queue \--\> Redis  
    Redis \--\> Worker

    Worker \--\> Replica  
    Worker \--\> AI  
    Worker \--\> DB

> **Catatan:** Load balancer, multiple backend instances, dan read replica merupakan bagian dari rancangan scalability yang dapat diterapkan ketika hasil pengujian menunjukkan kebutuhan. Arsitektur awal tidak mengharuskan seluruh komponen tersebut tersedia sejak awal.

---

# **3\. Main Architecture Components**

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

# **4\. Backend**

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

# **5\. API Architecture**

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

# **6\. Database**

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

# **7\. Database Read Replica**

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

# **8\. Redis**

Redis digunakan sebagai infrastructure untuk BullMQ.

Redis tidak menjadi database utama sistem POS.

Fungsi Redis pada arsitektur ini terutama sebagai:

* Queue storage.  
* Temporary job state.  
* Communication layer antara producer dan worker.

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

---

# **9\. BullMQ and Asynchronous Processing**

BullMQ digunakan untuk menangani pekerjaan yang tidak perlu diselesaikan secara synchronous dalam HTTP request.

Contoh utama adalah AI analysis.

Workflow:

Owner  
  |  
  | Trigger AI Analysis  
  v  
Backend  
  |  
  | Validate daily limit  
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

Pendekatan asynchronous digunakan agar proses AI tidak menahan request utama dan tidak mengganggu operasi transactional seperti kasir.

---

# **10\. AI Worker**

AI Worker bertanggung jawab untuk memproses AI analysis secara asynchronous.

Worker dapat menjalankan proses seperti:

1. Mengambil job dari BullMQ.  
2. Mengambil data yang diperlukan untuk analisis.  
3. Melakukan preprocessing / aggregation data.  
4. Mengirim data ke AI service.  
5. Memproses response AI.  
6. Menyimpan hasil analisis ke database.  
7. Menandai job sebagai completed atau failed.

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

# **11\. AI Analysis Constraint**

AI analysis dilakukan dengan mekanisme manual trigger oleh Owner.

Constraint:

* Hanya Owner yang dapat melakukan AI analysis.  
* Trigger dilakukan secara manual.  
* Maksimal satu kali dalam satu hari untuk setiap merchant.  
* AI processing dilakukan secara asynchronous.  
* AI analysis tidak dijalankan secara otomatis menggunakan cron job pada tahap ini.

Tujuan pembatasan tersebut adalah:

* Menghindari penggunaan AI secara berlebihan.  
* Mengurangi penggunaan token.  
* Menghindari analisis berulang dalam periode yang terlalu dekat.  
* Memberikan kontrol kepada Owner terhadap kapan analisis dilakukan.

---

# **12\. Docker**

Docker digunakan untuk melakukan containerization terhadap infrastructure dan application services.

Pada tahap awal, Docker digunakan untuk menjalankan Redis.

Docker  
└── Redis Container

Hal ini membuat environment Redis lebih konsisten antar developer tanpa mengharuskan setiap developer melakukan instalasi Redis secara native pada operating system.

Contoh:

docker compose up \-d

Kemudian:

NestJS (Local)  
      |  
    BullMQ  
      |  
      v  
Redis Container

---

# **13\. Future Containerization**

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

# **14\. Backend Module Breakdown**

Backend menggunakan modular architecture.

Struktur utama:

src/  
├── auth/  
├── users/  
├── merchants/  
├── outlets/  
├── categories/  
├── products/  
├── inventory/  
├── transactions/  
├── dashboard/  
├── analytics/  
├── ai-insights/  
├── prisma/  
└── common/

---

## **14.1 Auth Module**

Bertanggung jawab terhadap:

* Login.  
* Authentication.  
* JWT.  
* Password verification.  
* Authentication strategy.  
* Role-based access control.

Auth berinteraksi dengan:

Frontend  
    ↓  
Auth Module  
    ↓  
User  
    ↓  
PostgreSQL

---

## **14.2 Users Module**

Bertanggung jawab terhadap:

* User management.  
* Employee management.  
* User status.  
* Role information.

Digunakan oleh Owner/Admin sesuai permission yang ditentukan.

---

## **14.3 Merchants Module**

Bertanggung jawab terhadap data merchant dan business-level context.

---

## **14.4 Outlets Module**

Bertanggung jawab terhadap:

* Outlet management.  
* Outlet information.  
* Outlet status.

---

## **14.5 Categories Module**

Bertanggung jawab terhadap category management.

---

## **14.6 Products Module**

Bertanggung jawab terhadap:

* Product management.  
* SKU.  
* Price.  
* Category relationship.  
* Product status.

---

## **14.7 Inventory Module**

Bertanggung jawab terhadap stock pada setiap outlet.

Inventory berinteraksi erat dengan Transaction Module.

Transaction  
     |  
     | Stock deduction  
     v  
Inventory

---

## **14.8 Transactions Module**

Bertanggung jawab terhadap:

* Sales transaction.  
* Transaction item.  
* Transaction validation.  
* Transaction processing.  
* Inventory deduction.

Workflow utama:

Kasir  
  ↓  
Create Transaction  
  ↓  
Validate Product  
  ↓  
Validate Stock  
  ↓  
Create Transaction  
  ↓  
Create Transaction Items  
  ↓  
Deduct Inventory  
  ↓  
Transaction Completed

Transaction processing menggunakan database transaction ketika beberapa operasi database harus berhasil atau gagal secara atomic.

---

## **14.9 Dashboard Module**

Dashboard bertanggung jawab terhadap penyediaan data ringkasan bisnis untuk Owner.

Contoh data:

* Total sales.  
* Transaction count.  
* Revenue.  
* Product performance.  
* Stock overview.

Pada tahap awal dashboard dapat membaca dari Primary Database.

Jika read workload meningkat, dashboard dapat diarahkan ke Read Replica.

Dashboard  
    |  
    ├── Initial → Primary DB  
    |  
    └── Future → Read Replica

---

## **14.10 Analytics Module**

Analytics bertanggung jawab terhadap pengolahan dan agregasi data untuk kebutuhan analisis.

Module ini dapat digunakan oleh:

* Dashboard.  
* AI Insight.

Contoh:

Transaction Data  
      ↓  
Analytics  
      ↓  
Aggregation / Preprocessing  
      ↓  
Dashboard / AI Worker

Analytics tidak bertanggung jawab langsung terhadap proses AI generation.

---

## **14.11 AI Insights Module**

AI Insights Module bertanggung jawab terhadap:

* AI analysis request.  
* Daily analysis limit.  
* Creating BullMQ job.  
* Retrieving generated insight.  
* Storing AI insight.

Module ini berfungsi sebagai orchestration layer antara API dan AI Worker.

Owner  
  ↓  
AI Insights Module  
  ↓  
BullMQ  
  ↓  
Redis  
  ↓  
AI Worker  
  ↓  
AI Service  
  ↓  
AI Insight

---

# **15\. Scalability Strategy**

Scalability dilakukan secara bertahap berdasarkan kebutuhan aktual dan hasil testing.

Tidak semua scalability components diterapkan sejak awal.

## **Stage 1 — Initial Architecture**

Prioritas utama:

Frontend  
    ↓  
NestJS Backend  
    ↓  
PostgreSQL Primary

NestJS  
    ↓  
BullMQ  
    ↓  
Redis  
    ↓  
AI Worker

Infrastructure:

* Single backend instance.  
* Single PostgreSQL primary.  
* Redis.  
* Single AI worker.  
* Docker untuk Redis.  
* REST API.

Fokus utama:

* Correctness.  
* Functional requirements.  
* Security.  
* Transaction consistency.  
* Queue reliability.  
* Baseline performance.

---

# **16\. When to Add Multiple Backend Instances?**

Multiple backend instances diperlukan ketika **satu instance backend tidak lagi mampu menangani workload yang diberikan**.

Contoh kondisi:

Request meningkat  
       ↓  
CPU / memory backend meningkat  
       ↓  
Response time meningkat  
       ↓  
Single instance menjadi bottleneck

Maka backend dapat dijalankan menjadi:

Backend Instance 1  
Backend Instance 2  
Backend Instance 3

Multiple instances memungkinkan workload HTTP dibagi ke beberapa application instances.

Multiple instances sebaiknya dipertimbangkan berdasarkan:

* Stress test.  
* Load test.  
* CPU utilization.  
* Memory utilization.  
* Request per second.  
* Response time.  
* Error rate.

---

# **17\. When to Add Load Balancer?**

Load balancer mulai diperlukan ketika terdapat lebih dari satu backend instance yang melayani request.

                 Load Balancer  
                 /      |      \\  
                ↓       ↓       ↓  
             BE \#1   BE \#2   BE \#3

Tugas load balancer:

* Menerima request dari client.  
* Mendistribusikan request ke backend instances.  
* Membantu meningkatkan availability.  
* Menghindari satu instance menjadi single bottleneck.

Dengan satu backend instance, load balancer belum memberikan manfaat scaling yang signifikan.

Karena itu, load balancer diposisikan sebagai **future scalability component**, bukan prioritas awal.

---

# **18\. When to Consider Kubernetes?**

Kubernetes tidak menjadi kebutuhan awal sistem.

Kubernetes mulai dipertimbangkan ketika jumlah service dan kebutuhan orchestration meningkat.

Contoh:

Frontend  
Backend  
AI Worker  
Redis  
Monitoring  
Multiple Backend Instances  
Multiple Workers

Jika jumlah container meningkat, kebutuhan dapat berkembang menjadi:

* Container orchestration.  
* Automatic restart.  
* Service discovery.  
* Scaling.  
* Rolling deployment.  
* Resource management.  
* Self-healing.  
* Horizontal scaling.

Pada kondisi tersebut Kubernetes dapat membantu mengelola container dan service secara lebih otomatis.

Contoh future architecture:

                Kubernetes Cluster  
                        |  
        ┌───────────────┼───────────────┐  
        ↓               ↓               ↓  
   Backend Pods     Worker Pods     Other Services  
        |  
        ↓  
   PostgreSQL / Managed Database  
        |  
        ↓  
      Redis

Kubernetes **tidak langsung digunakan hanya karena sistem memiliki banyak merchant**.

Kebutuhannya harus dibuktikan melalui:

* Workload.  
* Jumlah service.  
* Deployment complexity.  
* Availability requirements.  
* Scaling requirements.  
* Operational overhead.

---

# **19\. Scalability Decision Flow**

Keputusan scaling dilakukan secara bertahap:

Initial System  
      ↓  
Load / Stress Testing  
      ↓  
Apakah single backend menjadi bottleneck?  
      |  
   ┌──┴──┐  
   No    Yes  
   |      |  
   ↓      ↓  
Keep    Multiple  
Single  Backend Instances  
          |  
          ↓  
      Load Balancer  
          |  
          ↓  
  Apakah read workload  
       meningkat?  
          |  
       ┌──┴──┐  
       No    Yes  
       |      |  
       ↓      ↓  
     Keep   Read Replica  
   Primary  
          |  
          ↓  
  Apakah infrastructure  
   semakin kompleks?  
          |  
       ┌──┴──┐  
       No    Yes  
       |      |  
       ↓      ↓  
 Continue  Consider  
 Existing  Kubernetes

---

# **20\. Architecture Priorities**

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
* Redis.  
* BullMQ.  
* AI Worker.  
* Docker untuk Redis.

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

# **21\. Technology Summary**

| Component | Technology | Purpose |
| ----- | ----- | ----- |
| Frontend | Web / PWA | Client application |
| Backend | NestJS | REST API & business logic |
| API Style | REST | Communication between frontend and backend |
| Database | PostgreSQL | Primary relational database |
| Queue | BullMQ | Asynchronous job processing |
| Queue Storage | Redis | Storage and broker for BullMQ jobs |
| Worker | NestJS Worker | Asynchronous processing, especially AI |
| Containerization | Docker | Consistent service environment |
| Database Scaling | PostgreSQL Read Replica | Future read-heavy workload |
| Backend Scaling | Multiple Instances | Future horizontal scaling |
| Traffic Distribution | Load Balancer | Distribute traffic across backend instances |
| Orchestration | Kubernetes | Future container orchestration if complexity requires it |

---

# **22\. Architecture Principle**

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

\#\#\# Nah, inti arsitekturnya aku sengaja bikin seperti ini

\`\`\`text  
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

**NestJS \+ PostgreSQL \+ Redis/BullMQ → testing → lihat bottleneck → baru scale.**

Kalau ternyata 1 backend instance masih kuat, **nggak perlu maksa multi-instance**. Kalau multi-instance baru diperlukan, **load balancer ikut masuk**. Kalau jumlah container/service sudah makin kompleks sampai operational overhead-nya terasa, **baru Kubernetes masuk pertimbangan**.

Sementara **read replica agak berbeda**: itu bukan karena "server backend kurang kuat", tetapi karena kalian punya workload **read-heavy (dashboard/analytics/AI)** yang ingin dipisahkan dari workload **write-heavy (terutama kasir/transaksi)**. Jadi dia bisa menjadi optimasi yang lebih awal dipertimbangkan kalau hasil testing memang menunjukkan database read sebagai bottleneck.

