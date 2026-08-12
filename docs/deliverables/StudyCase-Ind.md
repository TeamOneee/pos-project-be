# Skalabilitas Tanpa Pengeluaran Berlebih: Arsitektur Berbasis Pola Akses untuk Platform POS Multi-Aktor

**Studi Kasus — Software Engineering Academy, COMPFEST 18 x PT Skalar Solusi Digital**

## 1. Konteks Kasus

Aplikasi K adalah platform POS dan *business intelligence* (BI) untuk UMKM Indonesia. Selain memproses penjualan, platform ini menyediakan wawasan bisnis berbasis AI dengan menganalisis riwayat transaksi dan menyajikan rekomendasi kepada pemilik merchant. Platform ini melayani empat aktor utama dengan pola penggunaan yang berbeda: Kasir, yang memproses transaksi pembayaran dengan kebutuhan latensi sensitif; layanan analitik AI, yang secara berkala menganalisis riwayat transaksi dan menghasilkan wawasan bisnis; Administrator, yang mengelola katalog produk dan harga; serta Pemilik Merchant, yang mengakses dasbor dan laporan operasional untuk memantau kinerja bisnis.

## 2. Batasan

Seiring bertambahnya adopsi merchant, keempat beban kerja tersebut bersaing untuk sumber daya backend yang sama meskipun memiliki prioritas dan pola akses yang berbeda. Transaksi pembayaran memerlukan latensi rendah yang konsisten, sementara operasi analitik, pelaporan, dan administratif dapat menghasilkan lonjakan aktivitas baca yang bersaing dengan beban kerja transaksional. Solusi harus menjaga performa pembayaran tetap responsif sambil mendukung peningkatan permintaan analitik dan pelaporan ketika Aplikasi K berkembang hingga 500+ merchant.

**Poin Penting:**

- Platform POS + BI untuk UMKM Indonesia.
- Wawasan bisnis yang dihasilkan AI berdasarkan riwayat transaksi.
- Empat aktor utama: Kasir, layanan analitik AI, Administrator, dan Pemilik Merchant.
- Setiap aktor memiliki pola akses dan kebutuhan performa yang berbeda.
- Peningkatan adopsi merchant menghasilkan peningkatan permintaan bersamaan pada sumber daya backend bersama.

## 3. Latar Belakang

Aplikasi K saat ini beroperasi dengan infrastruktur sederhana yang mendukung basis merchant pada tahap awal. Platform ini melayani empat beban kerja utama: transaksi pembayaran, operasi administratif, wawasan bisnis berbasis AI, dan pelaporan merchant. Seluruh beban kerja ini bergantung pada data operasional yang sama dan ditangani oleh infrastruktur backend bersama.

Intensitas beban kerja sangat bervariasi sepanjang hari. Sebagian besar periode mengalami aktivitas yang relatif rendah, sedangkan jam operasional puncak menghasilkan peningkatan tajam pada permintaan bersamaan. Seiring Aplikasi K terus berkembang menuju 500+ merchant, platform harus mendukung permintaan yang meningkat tanpa mengorbankan keandalan operasi bisnis sehari-hari.

## 4. Pernyataan Masalah

Seiring Aplikasi K terus tumbuh, arsitekturnya saat ini harus mendukung peningkatan permintaan dari beban kerja transaksional, analitik, administratif, dan pelaporan tanpa mengorbankan performa pembayaran atau meningkatkan biaya infrastruktur secara signifikan.

Rancang arsitektur sistem yang skalabel untuk mengatasi hambatan performa platform sambil tetap praktis bagi bisnis yang sensitif terhadap biaya. Proposal Anda harus dengan jelas membenarkan keputusan arsitektural yang diambil, menjelaskan cara penanganan karakteristik beban kerja yang berbeda, serta menunjukkan bagaimana solusi menjaga pemrosesan transaksi tetap responsif seiring bertambahnya adopsi merchant.

**Kebutuhan Utama:**

- Perbedaan pola akses antara beban kerja transaksional dan analitik.
- Data dengan frekuensi pembaruan yang berbeda.
- Sifat asinkron dari pembuatan wawasan AI.
- Skalabilitas yang hemat biaya tanpa hanya mengandalkan infrastruktur yang lebih besar.

Peserta bebas memilih arsitektur, teknologi, atau pola desain yang sesuai. Solusi akan dievaluasi berdasarkan kemampuan dalam mengidentifikasi masalah yang mendasari dan membenarkan pendekatan yang diusulkan.

## 5. Data & Batasan

### Bisnis

- Aplikasi K adalah platform SaaS tahap awal yang sensitif terhadap biaya dan diharapkan berkembang hingga 500+ merchant.
- Permintaan sistem sangat fluktuatif, dengan penggunaan puncak terkonsentrasi pada jam operasional bisnis.
- Pertumbuhan infrastruktur harus tetap hemat biaya dan tidak hanya mengandalkan penambahan kapasitas komputasi secara terus-menerus.

### Batasan Sistem

- Berbagai beban kerja berbagi data operasional yang sama, tetapi memiliki kebutuhan performa dan konsistensi yang berbeda.
- Transaksi pembayaran membutuhkan latensi rendah yang konsisten, bahkan ketika beban kerja analitik, pelaporan, atau administratif berjalan secara bersamaan.
- Wawasan bisnis yang dihasilkan AI diproses secara asinkron dan tidak memerlukan konsistensi waktu nyata dengan setiap transaksi.
- Arsitektur yang diusulkan harus meningkatkan skalabilitas dan isolasi beban kerja tanpa mengasumsikan sumber daya infrastruktur yang tidak terbatas.

### Validasi Penilaian

- Solusi harus mengutamakan perbaikan arsitektural daripada hanya meningkatkan kapasitas infrastruktur.
- Perbedaan kebutuhan konsistensi dan performa antara beban kerja transaksional dan analitik harus tercermin dalam desain.
- Performa pembayaran harus tetap terisolasi dari beban kerja analitik dan administratif saat digunakan secara bersamaan.

## 6. Luaran

Peserta harus merancang dan membenarkan:

- Strategi penskalaan yang menjelaskan apakah arsitektur saat ini perlu dioptimalkan, diperluas, atau dirancang ulang.
- Arsitektur sistem yang mendukung karakteristik beban kerja transaksi pembayaran, administrasi, pelaporan, dan wawasan yang dihasilkan AI.
- Strategi untuk menangani data dengan frekuensi pembaruan dan kebutuhan konsistensi yang berbeda.
- Pendekatan yang menjaga performa pembayaran tetap responsif saat beban kerja analitik dan administratif berjalan bersamaan.
- Strategi skalabilitas yang mendukung pertumbuhan merchant dengan tetap hemat biaya.
- Pembahasan mengenai kompromi utama yang diperkenalkan oleh arsitektur yang diusulkan, termasuk dampaknya terhadap performa, konsistensi, kompleksitas operasional, dan kemudahan pemeliharaan.

## 7. Definisi Keberhasilan

Solusi yang berhasil memungkinkan Aplikasi K memperluas basis merchant sambil menjaga operasi pembayaran tetap responsif secara konsisten, bahkan selama periode aktivitas analitik atau administratif yang tinggi. Arsitektur harus mengisolasi karakteristik beban kerja yang berbeda, mendukung pertumbuhan jangka panjang yang berkelanjutan, serta meningkatkan skalabilitas tanpa mengharuskan biaya infrastruktur meningkat secara proporsional dengan permintaan.
