# Panduan Eksplorasi Bersama — View Abstrak

Dokumen ini menjelaskan hal-hal yang perlu **diulik dan dipahami bersama oleh seluruh anggota tim**. Ini bukan pembagian tugas teknis per orang, melainkan fondasi bersama agar setiap keputusan produk, data, dan arsitektur tetap mengarah ke masalah yang sama.

## Tujuan bersama

Membuat MVP aplikasi POS dan business intelligence untuk merchant/UMKM yang:

- Memungkinkan kasir menyelesaikan checkout dengan cepat dan benar.
- Memungkinkan admin mengelola data produk dan harga.
- Memungkinkan merchant owner melihat informasi bisnis yang berguna.
- Memanfaatkan data transaksi untuk insight/analitik tanpa mengganggu checkout.
- Realistis untuk diselesaikan, diuji, dan didemonstrasikan dalam waktu proyek.

---

## Cara melihat proyek secara abstrak

Seluruh tim perlu dapat menjawab enam pertanyaan besar berikut.

| Level | Pertanyaan utama | Hasil yang harus dipahami bersama |
|---|---|---|
| 1. Mengapa | Masalah apa yang sedang diselesaikan? | Tujuan bisnis dan alasan aplikasi ini dibuat |
| 2. Untuk siapa | Siapa yang memakai sistem dan apa kebutuhannya? | Aktor, hak akses, serta kebutuhan tiap aktor |
| 3. Apa | Fungsi minimum apa yang wajib tersedia? | Scope MVP dan flow utama aplikasi |
| 4. Seberapa baik | Kualitas apa yang harus dijaga? | Target performa, keamanan, keandalan, dan batasan |
| 5. Bagaimana | Bentuk solusi paling sederhana yang cukup itu seperti apa? | Opsi desain, data, arsitektur, dan trade-off |
| 6. Bagaimana membuktikan | Bagaimana tim tahu solusi sudah benar? | Testing, demo, dokumentasi, dan bukti keputusan |

---

## 1. Memahami masalah dan konteks

Semua anggota perlu memiliki jawaban yang sama untuk pertanyaan berikut:

- Masalah apa yang dialami merchant dan pengguna aplikasi?
- Mengapa transaksi checkout perlu diprioritaskan?
- Mengapa reporting dan analitik dapat mengganggu transaksi jika tidak dirancang dengan baik?
- Apa arti “scaling without overspending” untuk kasus ini?
- Batasan apa yang diberikan kasus: pertumbuhan merchant, performa checkout, waktu proyek, dan kompleksitas operasional?
- Apa definisi keberhasilan yang dapat dibuktikan saat demo?

### Hasil bersama

- Satu ringkasan masalah bisnis.
- Satu daftar batasan utama.
- Satu definisi keberhasilan proyek.

---

## 2. Memahami aktor dan kebutuhan mereka

Tim perlu memahami empat pihak utama, bukan hanya bagian aplikasi yang dikerjakan masing-masing.

| Aktor/fungsi | Hal yang perlu dipahami bersama |
|---|---|
| Kasir | Kapan checkout terjadi, data yang diperlukan, langkah transaksi, dan arti checkout yang “cepat dan benar” |
| Admin | Data apa yang dikelola, perubahan apa yang boleh dilakukan, dan batas aksesnya |
| Merchant owner | Informasi bisnis apa yang ingin dilihat dan kapan informasi tersebut dibutuhkan |
| Analitik AI | Data apa yang digunakan, insight apa yang dihasilkan, dan mengapa prosesnya tidak boleh mengganggu checkout |

### Pertanyaan bersama

- Apa kebutuhan utama setiap aktor?
- Aksi apa yang boleh dan tidak boleh dilakukan tiap aktor?
- Data apa yang dibaca atau diubah oleh tiap aktor?
- Ketergantungan apa yang ada antaraktor dan antarfungsi?

### Hasil bersama

- Daftar aktor dan role.
- Peta kebutuhan aktor.
- Batas akses awal.

---

## 3. Menentukan MVP dan batas scope

Semua anggota perlu sepakat bahwa MVP bukan versi paling lengkap, melainkan versi minimum yang benar-benar berjalan.

### Pertanyaan bersama

- Apa flow yang wajib tersedia agar aplikasi dapat disebut berfungsi?
- Apa definisi checkout paling sederhana yang tetap bernilai?
- Produk, harga, stok, transaksi, dashboard, dan insight mana yang wajib ada di MVP?
- Fitur mana yang boleh ditunda?
- Fitur mana yang bagus untuk dipelajari tetapi terlalu berisiko untuk menjadi syarat MVP?
- Apa yang akan didemonstrasikan pada akhir proyek?

### Cara menyusun scope

Gunakan tiga kategori bersama:

| Kategori | Arti |
|---|---|
| **Wajib (MVP)** | Harus selesai, diuji, dan dapat didemonstrasikan |
| **Jika waktu cukup** | Dikerjakan setelah MVP stabil |
| **Di luar scope** | Tidak dikerjakan pada proyek ini, tetapi boleh dicatat sebagai ide lanjutan |

### Hasil bersama

- Daftar MVP.
- Daftar fitur tambahan.
- Daftar hal yang sengaja tidak dikerjakan.

---

## 4. Memahami flow dan data inti

Tim tidak harus langsung menulis ERD atau endpoint, tetapi semua anggota harus mengerti bagaimana data bergerak dalam sistem.

### Pertanyaan bersama

- Bagaimana transaksi checkout berjalan dari awal sampai selesai?
- Data apa yang dibuat, dibaca, atau diubah pada setiap langkah?
- Kapan stok berubah?
- Bagaimana mencegah transaksi ganda atau data yang tidak konsisten?
- Data transaksi mana yang dibutuhkan dashboard?
- Data mana yang dibutuhkan analitik AI?
- Apakah semua proses perlu langsung selesai, atau ada yang dapat dilakukan belakangan?

### Hasil bersama

- Diagram flow utama.
- Daftar entity/data inti.
- Pemahaman bersama mengenai aturan transaksi dan konsistensi data.

---

## 5. Menetapkan kualitas yang perlu dijaga

Kualitas sistem perlu dibahas sebelum memilih solusi teknis, tetapi targetnya harus realistis.

### Pertanyaan bersama

- Seberapa cepat checkout harus selesai?
- Berapa merchant, kasir, atau transaksi bersamaan yang dijadikan asumsi?
- Apa yang terjadi jika reporting atau analitik gagal saat checkout berjalan?
- Data atau aksi apa yang membutuhkan keamanan lebih ketat?
- Bagaimana tim mengetahui ketika checkout gagal atau data bermasalah?
- Apa yang harus diuji sebelum demo?

### Area kualitas yang perlu dipahami

- Performa dan latency checkout.
- Konsistensi transaksi dan stok.
- Keamanan, authentication, dan role-based access control.
- Keandalan saat service pendukung bermasalah.
- Logging, monitoring, dan debugging.
- Kemudahan testing serta deployment.

### Hasil bersama

- Asumsi beban dan target kualitas sederhana.
- Daftar risiko utama.
- Daftar bukti/testing yang diperlukan.

---

## 6. Memilih solusi berdasarkan kebutuhan, bukan tren

Setelah fungsi, data, scope, dan kualitas cukup jelas, seluruh tim dapat membahas solusi teknis.

### Pertanyaan bersama

- Apakah satu backend/API cukup untuk MVP?
- Apakah monolith, modular monolith, atau pemisahan service tertentu paling masuk akal?
- Proses mana yang harus synchronous dan mana yang dapat asynchronous atau terjadwal?
- Apakah AI/reporting perlu dipisahkan dari jalur checkout?
- Apakah REST cukup, atau GraphQL benar-benar memberi manfaat?
- Apakah message broker dibutuhkan, atau job terjadwal sudah cukup?
- Apakah satu database cukup untuk MVP? Jika tidak, apa bukti kebutuhannya?
- Apakah caching, replication, atau Kubernetes benar-benar diperlukan untuk target yang sudah ditetapkan?

### Prinsip pengambilan keputusan

- Pilih solusi paling sederhana yang memenuhi requirement.
- Bandingkan minimal dua opsi untuk keputusan besar.
- Catat manfaat, biaya, risiko, dan alasan pilihan.
- Jangan memilih teknologi hanya karena ingin mempelajarinya.
- Jika teknologi dipilih untuk belajar, pastikan tidak mengorbankan MVP.

### Hasil bersama

- Diagram arsitektur tingkat tinggi.
- Daftar keputusan dan trade-off.
- Daftar keputusan yang masih perlu divalidasi.

---

## 7. Membuktikan hasil dan mendokumentasikan proses

Seluruh tim perlu memahami bahwa hasil proyek bukan hanya kode akhir. Cara tim sampai pada keputusan juga penting untuk demo dan presentasi.

### Pertanyaan bersama

- Apa yang akan diuji untuk membuktikan checkout benar?
- Bagaimana membuktikan role tidak dapat melakukan aksi yang tidak diizinkan?
- Bagaimana membuktikan reporting atau analitik tidak merusak flow transaksi?
- Bukti apa yang ditampilkan saat demo?
- Keputusan apa yang perlu dijelaskan dalam presentasi?
- Pertanyaan apa yang masih perlu dibawa ke mentor?

### Artefak bersama

- Requirement dan scope MVP.
- User flow dan data flow.
- ERD awal.
- Diagram arsitektur.
- Catatan keputusan dan trade-off.
- Hasil testing/demonstrasi.
- Daftar pertanyaan untuk mentor.

---

## 8. Ritme kerja bersama

Urutan kerja yang dapat dipahami semua orang:

1. Menyatukan konteks, aktor, batasan, dan MVP.
2. Menyamakan pemahaman flow dan data utama.
3. Menetapkan target kualitas dan risiko.
4. Mengeksplorasi opsi solusi teknis berdasarkan kebutuhan tersebut.
5. Mengambil keputusan bersama dan mencatat alasannya.
6. Mengimplementasikan MVP.
7. Menguji, mendemonstrasikan, lalu memperbaiki jika waktu tersedia.

Setiap kali ada temuan baru yang mengubah scope, data, atau arsitektur, tim kembali menyamakan pemahaman sebelum melanjutkan.

---

## 9. Pertanyaan pelengkap wajib untuk memahami proyek secara utuh

Bagian ini melengkapi pertanyaan sebelumnya agar seluruh requirement final project, case study, deliverable, dan kriteria penilaian tercakup. Bayangkan satu orang harus dapat menjelaskan dan mengerjakan proyek dari awal sampai akhir; semua pertanyaan berikut perlu dipahami sebelum implementasi dimulai.

### A. User management secara lengkap

- Siapa yang dapat membuat akun baru?
- Data apa yang diperlukan saat registrasi?
- Bagaimana pengguna login dan logout?
- Bagaimana password disimpan dengan aman?
- Bagaimana pengguna lupa password atau akun dinonaktifkan? Apakah ini masuk MVP atau out-of-scope?
- Role apa yang tersedia: kasir, admin, merchant owner, atau role lain?
- Permission apa yang dimiliki setiap role untuk melihat, membuat, mengubah, dan menghapus data?
- Bagaimana sistem menolak aksi ketika pengguna tidak memiliki permission?
- Bagaimana session atau token dikelola dan dihentikan saat logout?
- Bukti apa yang menunjukkan bahwa role-based access control benar-benar berjalan?

### B. Matriks pola akses dan isolasi workload

Untuk setiap aktor atau workload—kasir, admin, merchant owner/reporting, dan analitik AI—jawab pertanyaan berikut.

- Apakah workload ini terutama membaca data, menulis data, atau keduanya?
- Data apa yang diakses?
- Kapan workload ini paling aktif: terus-menerus, jam puncak, saat diminta, atau terjadwal?
- Berapa banyak request atau user bersamaan yang diasumsikan?
- Seberapa rendah latency yang dibutuhkan?
- Seberapa baru data yang dibutuhkan: real-time, beberapa menit terlambat, atau periodik?
- Seberapa kuat konsistensi yang dibutuhkan?
- Apa dampaknya jika workload ini terlambat atau gagal?
- Resource apa yang berpotensi diperebutkan dengan checkout: database, CPU, koneksi API, cache, atau jaringan?
- Bagaimana sistem memastikan workload ini tidak mengganggu checkout?

### C. Baseline sistem saat ini dan masalah yang ingin diperbaiki

- Infrastruktur sederhana seperti apa yang diasumsikan oleh case ini?
- Komponen apa yang saat ini berbagi resource backend dan data?
- Bottleneck apa yang paling mungkin terjadi pada jam puncak?
- Apakah masalah utama disebabkan query reporting, proses AI, operasi admin, atau semua workload yang menggunakan resource sama?
- Apakah strategi yang tepat adalah mengoptimalkan sistem saat ini, memperluasnya, atau mendesain ulang bagian tertentu?
- Perubahan arsitektur apa yang benar-benar menyelesaikan akar masalah, bukan hanya menambah kapasitas server?
- Bagaimana proposal tetap hemat biaya bagi SaaS tahap awal?

### D. Checkout, transaksi, dan konsistensi data

- Apa *source of truth* untuk stok, harga, dan transaksi?
- Dalam urutan apa checkout membaca produk, memvalidasi stok, menyimpan transaksi, dan memperbarui stok?
- Kapan transaksi dianggap final?
- Bagaimana jika dua kasir mencoba menjual stok yang sama pada waktu hampir bersamaan?
- Bagaimana jika request checkout terulang karena pengguna menekan tombol dua kali atau jaringan gagal?
- Bagaimana jika transaksi tersimpan tetapi pembaruan stok gagal, atau sebaliknya?
- Apakah sistem perlu idempotency key, locking, transaksi database, atau mekanisme lain? Mengapa?
- Data transaksi mana yang harus konsisten secara langsung, dan data mana yang boleh diproses kemudian?
- Bagaimana pembatalan atau koreksi transaksi ditangani dalam scope MVP?

### E. Reporting dan analitik AI yang asinkron

- Insight AI apa yang benar-benar bernilai bagi merchant?
- Data transaksi apa yang dikonsumsi oleh reporting dan AI?
- Apakah laporan dan insight harus diperbarui saat transaksi selesai, secara periodik, atau saat pengguna meminta?
- Berapa keterlambatan data yang masih dapat diterima untuk reporting dan insight?
- Apakah proses AI perlu membaca database operasional langsung, data agregat, atau salinan data?
- Bagaimana job analitik dijadwalkan atau dipicu?
- Apa yang terjadi jika job analitik gagal, terlambat, atau menghasilkan data lama?
- Bagaimana proses AI di-retry tanpa memproses insight yang sama secara tidak perlu?
- Bagaimana sistem memastikan proses AI/reporting tidak memakai resource checkout pada jam puncak?
- Apa batas fitur AI pada MVP agar tidak mengganggu penyelesaian produk utama?

### F. Target NFR yang terukur dan cara validasinya

- Berapa target waktu respons checkout? Apakah target tersebut average, p95, atau p99?
- Berapa jumlah transaksi atau user bersamaan yang perlu didukung dalam simulasi?
- Berapa merchant yang menjadi asumsi awal dan bagaimana sistem diarahkan untuk mendukung pertumbuhan 10×?
- Apa target availability yang dipilih dan mengapa target tersebut realistis untuk MVP?
- Service mana yang boleh tidak tersedia sementara tanpa menghentikan checkout?
- Apa target error rate yang dapat diterima untuk transaksi?
- Bagaimana keamanan password, token, dan data merchant dibuktikan?
- Log apa yang wajib tersedia saat terjadi error transaksi?
- Metrik apa yang dipantau: latency, error rate, throughput, resource usage, atau kegagalan job AI?
- Dengan alat apa target performa, keamanan, dan reliability diuji?

### G. Low-Level Architecture dan justifikasi teknologi

- Komponen apa saja yang ada di frontend, backend, database, API, worker/job, dan layanan AI?
- Bagaimana arah komunikasi antarkomponen tersebut?
- Modul atau service apa yang memiliki tanggung jawab masing-masing?
- Apakah satu backend modular sudah cukup untuk MVP, atau ada alasan kuat untuk memisahkan service tertentu?
- Bagian mana yang synchronous dan mana yang asynchronous? Mengapa?
- Apakah REST cukup untuk kebutuhan frontend, atau GraphQL memberikan manfaat yang dapat dibuktikan?
- Apakah message broker diperlukan? Jika ya, masalah apa yang tidak dapat diselesaikan dengan job terjadwal atau pendekatan lebih sederhana?
- Apakah satu database cukup? Jika tidak, apa bukti kebutuhan pemisahan, replikasi, atau cache?
- Apakah Docker, managed database, atau Kubernetes diperlukan? Apa manfaat dan biaya operasional masing-masing?
- Apa minimal dua alternatif yang dibandingkan untuk setiap keputusan arsitektur besar?
- Trade-off apa yang diterima terkait performa, konsistensi, biaya, kompleksitas operasional, dan maintainability?

### H. Database design yang siap dinilai

- Apa tujuan setiap tabel?
- Field apa yang wajib, unik, atau boleh kosong?
- Primary key dan foreign key apa yang diperlukan?
- Constraint apa yang mencegah email duplikat, data role tidak valid, atau transaksi yang tidak konsisten?
- Index apa yang dibutuhkan oleh checkout, pencarian produk, dashboard, dan reporting?
- Normalisasi apa yang diterapkan, dan mengapa?
- Jika ada denormalisasi atau data agregat untuk reporting, apa alasannya dan bagaimana sinkronisasinya?
- Bagaimana ERD menjelaskan hubungan antarrole, merchant, produk, stok, transaksi, dan insight?
- Jika schema berubah, bagaimana migrasi atau kompatibilitas data dipikirkan?

### I. Clean code dan maintainability

- Bagaimana struktur folder dan modul membuat kode mudah dipahami?
- Bagaimana pemisahan tanggung jawab antara controller/handler, service, repository/data access, dan domain logic?
- Standar penamaan, formatting, linting, dan error handling apa yang dipakai?
- Bagaimana secret dijaga agar tidak masuk repository?
- Bagaimana logging dibuat cukup berguna tanpa membocorkan data sensitif?
- Kapan pull request atau code review dilakukan, bahkan jika proyek dikerjakan satu orang?
- Bagaimana perubahan requirement dicatat agar kode dan dokumentasi tidak berbeda?
- Komponen mana yang sengaja dibuat modular agar mudah diubah jika arsitektur berkembang?

### J. Testing strategy dan coverage plan

- Fungsi bisnis apa yang wajib memiliki unit test, misalnya validasi stok, perhitungan total, permission, atau pembuatan transaksi?
- API endpoint dan data flow apa yang wajib memiliki integration test?
- Skenario error apa yang harus diuji: stok tidak cukup, role salah, request duplikat, job AI gagal, atau database tidak tersedia?
- Acceptance criteria apa yang dapat dipakai sebagai manual test case?
- Apa target coverage yang masuk akal, dan area mana yang diprioritaskan jika tidak semua kode dapat diuji?
- Bagaimana mensimulasikan checkout bersamaan dengan reporting/AI untuk membuktikan isolasi workload?
- Bagaimana hasil test disimpan atau ditampilkan sebagai bukti pada presentasi?

### K. DevOps, deployment, dan CI/CD

- Bagaimana seluruh aplikasi dijalankan di local environment oleh anggota baru?
- Apakah Docker Compose atau cara lain diperlukan untuk menjalankan frontend, backend, database, dan job pendukung?
- Variabel environment apa yang dibutuhkan?
- Bagaimana membuat `.env.example` tanpa memasukkan secret asli?
- Di mana prototype dideploy untuk live demo?
- Bagaimana migration database dijalankan pada environment deployment?
- Apa yang dilakukan jika deployment gagal?
- Pipeline CI apa yang perlu berjalan saat push atau pull request: install, lint, unit test, integration test, build, atau deploy?
- Apakah GitHub Actions akan dipakai? Jika tidak, bagaimana requirement CI/CD dipenuhi?
- Bagaimana branch, release, dan rollback sederhana dikelola?

### L. UI/UX, usability, dan demo

- Apa user journey terpenting untuk kasir, admin, dan merchant owner?
- Halaman atau layar apa yang wajib tersedia pada MVP?
- Apa feedback yang diterima pengguna saat loading, sukses, gagal, stok habis, atau tidak memiliki akses?
- Bagaimana UI membantu kasir menyelesaikan checkout dengan cepat dan mengurangi kesalahan?
- Bagaimana dashboard menyajikan insight yang benar-benar berguna, bukan hanya banyak data?
- Apakah wireframe atau desain awal diperlukan sebelum implementasi?
- Bagaimana tim mengecek bahwa flow mudah dipakai oleh pengguna yang dituju?
- Skenario live demo apa yang menunjukkan fungsi inti, security, dan solusi arsitektur?

### M. Dokumen, presentasi, dan operasional proyek

- Apakah repository GitHub sudah dibuat dan memiliki README yang menjelaskan cara menjalankan proyek?
- Di mana FRD, NFR, out-of-scope, LLA, ERD, dan testing plan disimpan serta diperbarui?
- Diagram apa yang perlu disiapkan: use case diagram, ERD, system design diagram, serta diagram flow?
- Keputusan arsitektur dan trade-off apa yang perlu dimasukkan ke slide?
- Masalah atau perubahan apa yang dialami selama pengerjaan dan bagaimana tim menanganinya?
- Pelajaran teamwork atau engineering apa yang akan disampaikan pada presentasi akhir?
- Siapa yang memastikan deliverable, repository, deployment, dan file presentasi siap sebelum deadline?

### Hasil yang perlu tersedia sebelum implementasi penuh

- Daftar requirement fungsional dan user management.
- Matriks pola akses workload.
- Scope MVP dan out-of-scope eksplisit.
- Target NFR dan cara mengujinya.
- ERD dan LLA awal.
- Perbandingan opsi arsitektur beserta trade-off.
- Testing plan, deployment plan, `.env.example`, serta rencana CI/CD.
- Rencana demo dan daftar artefak presentasi.

## 10. Pertanyaan mentor — untuk menghindari tech debt dan skalabilitas semu

Bagian sebelumnya sudah menanyakan *apa yang dibangun* dan *teknologi apa yang mungkin dipakai*. Namun, proyek sering gagal bukan karena tim tidak mengetahui teknologi, melainkan karena tim belum memaksa dirinya menjawab pertanyaan tentang nilai, asumsi, batas kegagalan, biaya, dan kemampuan mengoperasikan sistem.

Pertanyaan berikut menambah lapisan berpikir tersebut. Tujuannya bukan menambah fitur atau kompleksitas, melainkan mencegah **tech debt**, *accidental complexity*, dan keputusan yang sulit diubah di kemudian hari.

### A. Pertanyaan nilai bisnis dan prioritas

**Mengapa perlu ditambahkan:** Pertanyaan sebelumnya sudah membahas aktor dan fitur, tetapi belum cukup memaksa tim memilih masalah yang paling bernilai saat terjadi konflik antara banyak kebutuhan.

- Jika hanya satu masalah pengguna yang boleh diselesaikan dengan sangat baik oleh MVP, masalah apa itu?
- Apa kerugian nyata bagi merchant jika checkout lambat, gagal, atau data stok salah?
- Nilai apa yang diterima merchant dari dashboard atau insight AI dibanding biaya dan kompleksitas membangunnya?
- Fitur mana yang terlihat menarik tetapi tidak mengubah keberhasilan MVP?
- Jika fitur analitik AI dihapus sementara, apakah produk inti masih bernilai dan dapat didemonstrasikan?
- Metrik bisnis apa yang menunjukkan solusi benar-benar berguna: checkout berhasil, waktu kasir, kesalahan stok, penggunaan laporan, atau hal lain?
- Siapa yang paling dirugikan oleh setiap trade-off: kasir, admin, merchant owner, atau tim operasional?
- Ketika kecepatan checkout bertentangan dengan kelengkapan insight, mana yang menang dan mengapa?

### B. Pertanyaan asumsi, bukti, dan falsifikasi

**Mengapa perlu ditambahkan:** Banyak keputusan awal dibuat dari asumsi yang tidak pernah diuji. Ini adalah sumber utama desain yang salah arah dan tech debt.

- Asumsi apa yang sedang kita buat tentang jumlah merchant, transaksi, stok, jam puncak, dan perilaku pengguna?
- Dari semua asumsi itu, mana yang paling berisiko bila salah?
- Apa bukti yang kita punya untuk tiap asumsi: brief, data, wawancara, benchmark, atau hanya tebakan?
- Eksperimen atau test terkecil apa yang dapat membuktikan atau membantah asumsi paling berisiko?
- Kondisi apa yang akan membuat kita mengubah keputusan arsitektur yang sudah dipilih?
- Apakah asumsi tentang kebutuhan AI, message broker, cache, atau Kubernetes benar-benar berasal dari requirement atau dari preferensi teknologi?
- Mana yang merupakan fakta, mana yang merupakan keputusan, dan mana yang masih merupakan hipotesis?
- Apakah setiap keputusan besar memiliki *exit criteria*: tanda kapan keputusan tersebut perlu dievaluasi ulang?

### C. Pertanyaan reversibilitas keputusan

**Mengapa perlu ditambahkan:** Tidak semua keputusan memiliki biaya perubahan yang sama. Tim perlu berhati-hati pada keputusan yang sulit dibatalkan, terutama di proyek singkat.

- Keputusan mana yang mudah diubah nanti: library, UI detail, atau format respons API?
- Keputusan mana yang mahal untuk diubah: data model, tenant isolation, kontrak transaksi, atau pilihan deployment?
- Apakah desain saat ini mengunci tim pada satu provider, satu database, atau satu pola arsitektur tanpa alasan kuat?
- Bagaimana sistem tetap dapat berjalan jika teknologi pilihan pertama tidak tersedia atau terlalu rumit?
- Apa batas modul yang membuat komponen AI, reporting, atau deployment dapat diganti tanpa mengubah checkout?
- Apakah kompleksitas yang ditambahkan hari ini memberikan manfaat yang lebih besar daripada biaya perubahan di masa depan?
- Jika waktu tinggal dua hari, komponen apa yang dapat disederhanakan atau dimatikan tanpa merusak nilai inti produk?

### D. Pertanyaan failure mode dan graceful degradation

**Mengapa perlu ditambahkan:** Sistem yang skalabel bukan hanya sistem yang cepat saat normal, tetapi sistem yang tetap memberi perilaku aman dan dapat dipahami ketika bagian lain gagal.

- Apa tiga kegagalan paling mungkin terjadi saat demo atau jam puncak?
- Apa yang terjadi jika database melambat, penuh koneksi, atau sementara tidak dapat diakses?
- Apa yang terjadi jika AI provider, worker, queue, atau job scheduler gagal?
- Apakah checkout harus menunggu reporting atau AI? Jika tidak, bagaimana sistem memisahkan ketergantungannya?
- Jika suatu proses asinkron tertunda, bagaimana pengguna tahu statusnya tanpa mengira transaksi gagal?
- Bagaimana request yang gagal di-retry tanpa membuat transaksi atau insight duplikat?
- Kapan sistem harus menolak request secara jelas daripada terus mencoba sampai resource habis?
- Apakah ada batas waktu (*timeout*), batas retry, dan batas antrean yang masuk akal?
- Data atau tindakan apa yang perlu audit trail agar masalah dapat dipulihkan atau dijelaskan?
- Bagaimana sistem melakukan *graceful degradation*: fitur mana yang boleh diturunkan lebih dulu agar checkout tetap hidup?

### E. Pertanyaan kapasitas, biaya, dan scale trigger

**Mengapa perlu ditambahkan:** “Bisa scale” belum berarti hemat biaya. Case ini menilai kemampuan menghubungkan pertumbuhan, kapasitas, dan biaya secara masuk akal.

- Resource apa yang paling mahal pada rancangan ini: database, compute API, worker AI, cache, storage, atau observability?
- Biaya mana yang bertambah seiring jumlah merchant atau transaksi, dan biaya mana yang tetap?
- Apakah biaya diperkirakan bertumbuh proporsional, lebih cepat, atau lebih lambat dari pertumbuhan merchant?
- Kapan tepatnya satu komponen perlu di-scale: berdasarkan CPU, latency, koneksi database, panjang antrean, atau error rate?
- Apa *scale trigger* yang dapat diukur, bukan sekadar perasaan bahwa sistem “sudah ramai”?
- Strategi mana yang memperbaiki penggunaan resource sebelum menambah server: index, query optimization, batch, caching, scheduling, atau isolasi workload?
- Apakah solusi yang diusulkan masih dapat dijalankan dan di-debug oleh tim kecil?
- Berapa batas biaya/kompleksitas yang tidak boleh dilewati oleh MVP?
- Apakah Kubernetes, message broker, atau database tambahan menyelesaikan bottleneck yang terbukti, atau hanya memindahkan biaya ke operasi?

### F. Pertanyaan multi-tenancy, privasi, dan batas kepercayaan

**Mengapa perlu ditambahkan:** Karena aplikasi adalah SaaS untuk banyak merchant, isolasi antarmerchant perlu dipikirkan sejak awal. Pertanyaan role saja belum cukup.

- Bagaimana sistem memastikan kasir atau admin dari Merchant A tidak dapat membaca atau mengubah data Merchant B?
- Di bagian mana `merchant_id` atau identitas tenant wajib diterapkan dan divalidasi?
- Apakah setiap query sensitif sudah dibatasi oleh tenant yang benar?
- Bagaimana dashboard dan insight AI menghindari pencampuran data antarmerchant?
- Data apa yang termasuk sensitif: akun, transaksi, harga, pola penjualan, atau credential?
- Siapa yang boleh melihat audit log dan data transaksi historis?
- Bagaimana data sensitif disamarkan di log, screenshot demo, atau environment test?
- Jika satu akun pindah role atau dinonaktifkan, akses apa yang harus langsung dicabut?

### G. Pertanyaan data lifecycle dan perubahan schema

**Mengapa perlu ditambahkan:** ERD awal dapat terlihat benar, tetapi sistem akan sulit dirawat jika tidak ada pemikiran tentang data lama, perubahan schema, dan rekonsiliasi.

- Berapa lama transaksi, log, dan hasil insight disimpan?
- Data mana yang boleh dihapus, diarsipkan, atau hanya boleh dibaca?
- Jika harga produk berubah, apakah transaksi lama menampilkan harga lama atau harga terbaru?
- Jika stok atau transaksi perlu dikoreksi, bagaimana riwayat perubahan tetap dapat ditelusuri?
- Jika schema harus berubah, bagaimana migration dilakukan tanpa merusak flow checkout?
- Bagaimana membedakan data operasional mentah, data agregat reporting, dan hasil AI?
- Apakah ada proses rekonsiliasi untuk menemukan perbedaan antara stok, transaksi, dan laporan?
- Apa kontrak data yang harus stabil untuk frontend, reporting, atau worker AI?

### H. Pertanyaan operasional dan observability

**Mengapa perlu ditambahkan:** Logging sudah disebut sebelumnya, tetapi belum cukup menjawab apakah seseorang dapat menemukan, memahami, dan memperbaiki masalah dengan cepat.

- Jika kasir melaporkan transaksi gagal, langkah diagnosis pertama apa yang dapat dilakukan dalam lima menit?
- Apakah setiap checkout memiliki correlation ID atau transaction ID yang dapat ditelusuri dari UI, API, log, hingga database?
- Dashboard operasional apa yang dibutuhkan untuk melihat kesehatan aplikasi?
- Alert apa yang benar-benar penting: lonjakan error checkout, latency melewati target, job AI menumpuk, atau kegagalan deployment?
- Siapa yang menerima atau memeriksa alert pada fase MVP?
- Apakah log memiliki konteks yang cukup: merchant, role, request, error, dan waktu, tanpa menyimpan secret?
- Apa *runbook* minimum ketika deployment, database, atau job pendukung gagal?
- Bagaimana tim membedakan bug aplikasi, masalah data, masalah provider, dan salah penggunaan oleh user?

### I. Pertanyaan kualitas desain dan batas kompleksitas

**Mengapa perlu ditambahkan:** Tech debt sering muncul saat tim mengetahui pola yang “ideal”, tetapi menerapkannya lebih awal daripada kebutuhan proyek.

- Kompleksitas apa yang sedang kita tambahkan, dan requirement apa yang membenarkannya?
- Apakah komponen baru mengurangi masalah nyata atau hanya membuat diagram terlihat lebih matang?
- Bisakah satu orang baru memahami alur checkout dan memperbaikinya dalam waktu singkat?
- Apakah ada duplikasi logic bisnis antara UI, API, worker, dan database?
- Apakah aturan bisnis berada di satu tempat yang jelas, atau tersebar di banyak layer?
- Apakah modul memiliki tanggung jawab tunggal yang dapat dijelaskan dalam satu kalimat?
- Apakah abstraction baru menghilangkan duplikasi atau justru menyembunyikan flow yang masih sederhana?
- Apa yang sengaja tidak diabstraksikan sekarang karena belum ada variasi kebutuhan?
- Apakah dokumentasi arsitektur masih sesuai dengan implementasi saat ini?

### J. Pertanyaan pengalaman pengguna dan kepercayaan

**Mengapa perlu ditambahkan:** Aplikasi yang secara teknis benar tetap gagal bila pengguna tidak memahami status transaksi atau tidak percaya pada hasilnya.

- Bagaimana kasir membedakan transaksi sedang diproses, berhasil, gagal, dan perlu dicoba ulang?
- Bagaimana aplikasi mencegah kasir melakukan pembayaran ganda saat jaringan lambat?
- Pesan error apa yang membantu pengguna memperbaiki masalah, bukan hanya menampilkan error teknis?
- Bagaimana admin mengetahui perubahan produk atau harga telah tersimpan?
- Bagaimana merchant owner mengetahui kapan laporan atau insight terakhir diperbarui?
- Apakah insight AI menjelaskan dasar atau konteksnya agar merchant tidak menerima rekomendasi secara buta?
- Flow mana yang memiliki risiko kesalahan pengguna tertinggi, dan bagaimana UI menguranginya?
- Apakah demo memperlihatkan kondisi error/edge case, bukan hanya happy path?

### K. Pertanyaan disiplin delivery dan pembelajaran tim

**Mengapa perlu ditambahkan:** Proyek final dinilai dari proses dan kemampuan menjelaskan keputusan, bukan hanya dari aplikasi yang terlihat berjalan.

- Apa definisi “selesai” untuk setiap fitur: kode, test, dokumentasi, demo, dan review sudah ada?
- Apa yang dibuktikan setiap commit atau pull request terhadap requirement?
- Apakah setiap perubahan besar memiliki alasan dan dampak yang dicatat?
- Risiko apa yang dibahas rutin setiap hari atau setiap sesi kerja?
- Apa yang harus dipotong lebih awal jika jadwal mulai meleset?
- Keputusan apa yang perlu dipresentasikan sebagai trade-off, bukan ditutupi sebagai keterbatasan?
- Setelah demo, pelajaran apa yang dapat diambil tentang scope, arsitektur, testing, dan kolaborasi?

### Output review mentor yang sebaiknya tersedia

- Daftar asumsi dengan tingkat risiko dan cara validasinya.
- Matriks workload berisi latency, konsistensi, freshness data, dampak kegagalan, dan resource yang digunakan.
- Daftar failure mode beserta perilaku degradasi/fallback.
- Scale trigger dan batas biaya/operasional MVP.
- Daftar keputusan reversibel dan sulit dibalik.
- Model isolasi tenant, data sensitif, dan audit trail.
- Rencana observability dan runbook minimum.
- Decision log yang menghubungkan requirement, opsi, pilihan, bukti, dan trade-off.

## Checklist pemahaman bersama

- [ ] Semua anggota dapat menjelaskan masalah proyek dalam bahasa sederhana.
- [ ] Semua anggota memahami kebutuhan empat aktor/fungsi utama.
- [ ] Semua anggota menyetujui batas MVP dan fitur yang ditunda.
- [ ] Semua anggota memahami flow checkout dan data inti.
- [ ] Semua anggota memahami target kualitas serta risiko utama.
- [ ] Semua anggota mengetahui alasan teknologi/arsitektur yang dipilih.
- [ ] Semua anggota dapat menjelaskan trade-off keputusan penting.
- [ ] Semua anggota mengetahui apa yang akan diuji dan didemonstrasikan.
