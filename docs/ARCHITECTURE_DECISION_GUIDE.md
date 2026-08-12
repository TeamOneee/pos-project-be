\# Architecture Decision Guide

\#\# 1\. Tujuan

Dokumen ini menjadi panduan tim dalam menentukan kapan sistem perlu ditingkatkan dari satu level arsitektur ke level berikutnya.

Prinsip utama:

\> \*\*Scaling without overspending.\*\*

Artinya, kita tidak mengejar arsitektur yang paling kompleks atau paling canggih, tetapi mencari solusi \*\*paling sederhana yang mampu memenuhi requirement dengan penggunaan resource dan biaya yang efisien\*\*.

Kita tidak langsung menggunakan Microservices, Kubernetes, Load Balancer, atau banyak instance hanya karena teknologi tersebut dapat melakukan scaling.

Setiap peningkatan arsitektur harus memiliki:

1\. Masalah yang jelas.  
2\. Bukti bahwa level sebelumnya tidak cukup.  
3\. Alasan teknis mengapa solusi berikutnya diperlukan.  
4\. Pertimbangan cost dan resource.  
5\. Pengujian untuk membuktikan bahwa solusi tersebut memberikan improvement.

\---

\# 2\. Prinsip Utama

\#\# 2.1 Solve the problem, not the technology

Jangan memulai dari:

\> "Kita pakai Microservices."

Tetapi mulai dari:

\> "Masalah apa yang kita hadapi?"

Kemudian:

\> "Solusi paling sederhana apa yang bisa menyelesaikan masalah tersebut?"

Contoh:

Jika masalahnya adalah query database terlalu lambat:

\`\`\`text  
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

# **3\. Architecture Escalation Level**

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
Load Balancer \+ Autoscaling  
      ↓  
LEVEL 4  
Microservice / Selective Service Extraction  
      ↓  
LEVEL 5  
Advanced Infrastructure Scaling

Tidak semua project harus mencapai Level 5\.

Jika requirement sudah terpenuhi di Level 1 atau Level 2, maka **tidak perlu naik level**.

---

# **4\. LEVEL 0 — Modular Monolith**

## **Tujuan**

Membuat sistem dengan module yang memiliki boundary jelas, tetapi seluruh aplikasi masih dijalankan sebagai satu deployment.

Contoh:

Backend  
│  
├── Auth  
├── User  
├── Checkout  
├── Inventory  
├── Payment  
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

# **5\. Kapan LEVEL 0 sudah cukup?**

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

# **6\. LEVEL 1 — Application & Database Optimization**

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

# **7\. Kapan naik dari LEVEL 1?**

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

# **8\. LEVEL 2 — Horizontal Scaling**

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

# **9\. Kapan TIDAK perlu Horizontal Scaling?**

Jangan menambah instance jika bottleneck sebenarnya berasal dari:

Database  
Query  
External API  
LLM  
Network  
Locking  
Memory leak

Contoh:

Backend CPU \= 30%  
Database CPU \= 95%

Menambah backend instance:

1 → 3 instance

belum tentu menyelesaikan masalah.

Malah dapat membuat database semakin terbebani.

Maka:

> **Scale resource yang menjadi bottleneck, bukan sekadar scale application.**

---

# **10\. LEVEL 3 — Load Balancer \+ Autoscaling**

Jika aplikasi sudah membutuhkan lebih dari satu instance, traffic perlu didistribusikan.

Contoh:

                Load Balancer  
                /      |      \\  
               /       |       \\  
        Instance 1 Instance 2 Instance 3

Load Balancer bertugas mendistribusikan request ke instance yang tersedia.

---

# **11\. Kapan Load Balancer diperlukan?**

Load Balancer diperlukan ketika:

> **Ada lebih dari satu instance yang menerima traffic secara bersamaan dan traffic perlu didistribusikan di antara instance tersebut.**

Jika hanya:

Client  
  ↓  
1 Backend Instance

maka Load Balancer belum memberikan manfaat yang signifikan.

---

# **12\. Autoscaling**

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

# **13\. Kapan menggunakan Autoscaling?**

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

# **14\. LEVEL 4 — Microservice**

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

# **15\. Kapan Microservice mulai masuk akal?**

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

# **16\. Kapan TIDAK perlu Microservice?**

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

# **17\. LEVEL 5 — Advanced Infrastructure**

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

# **18\. Decision Tree**

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

# **19\. Aturan "Evidence Before Escalation"**

Setiap kali ingin naik level, minimal harus bisa menjawab:

### **1\. Apa masalahnya?**

Contoh:

> Checkout mengalami latency tinggi saat concurrency meningkat.

### **2\. Apa buktinya?**

Contoh:

Concurrency : 500  
p95 latency : 2.8s  
CPU         : 95%  
Error rate  : 8%

### **3\. Apa solusi level sekarang?**

Contoh:

> Query sudah di-index dan read workload sudah dipisahkan.

### **4\. Mengapa solusi tersebut belum cukup?**

Contoh:

> Setelah optimasi, CPU application masih mencapai 95%.

### **5\. Apa solusi berikutnya?**

> Horizontal scaling.

### **6\. Apa trade-off-nya?**

Contoh:

> Resource infrastructure meningkat, tetapi hanya ketika traffic meningkat.

---

# **20\. Prinsip Cost**

Setiap keputusan arsitektur harus mempertimbangkan:

Benefit  
    vs  
Complexity  
    \+  
Infrastructure Cost  
    \+  
Operational Cost

Tidak selalu:

More Technology \= Better Architecture

Bisa saja:

Simple Architecture  
        \+  
Good Optimization  
        \+  
Appropriate Scaling  
        \=  
Better Architecture

---

# **21\. Contoh Skenario Project**

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
\+  
Kubernetes  
\+  
Load Balancer  
\+  
Autoscaling  
\+  
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
Load Balancer \+ Autoscaling  
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

# **22\. Prinsip Akhir Tim**

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

# **23\. Ringkasan Keputusan**

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

