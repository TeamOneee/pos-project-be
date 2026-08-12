\# Entity Relationship Diagram (ERD)

\#\# 1\. Overview

Sistem menggunakan konsep \*\*Single Merchant – Multi Outlet – Multi Kasir – Stock Management\*\*.

Database terdiri dari beberapa entitas utama yang digunakan untuk mengelola merchant, outlet, pengguna, produk, inventory, transaksi, serta hasil analisis AI.

Relasi antar entitas digunakan untuk memastikan setiap data memiliki konteks merchant dan outlet yang sesuai.

\---

\#\# 2\. Entities

\#\#\# 2.1 Merchant

Merepresentasikan bisnis atau merchant yang menggunakan sistem.

| Attribute | Description |  
|---|---|  
| \`merchant\_id\` | Primary Key |  
| \`name\` | Nama merchant |

\---

\#\#\# 2.2 Outlet

Merepresentasikan outlet atau lokasi operasional yang dimiliki oleh merchant.

| Attribute | Description |  
|---|---|  
| \`outlet\_id\` | Primary Key |  
| \`merchant\_id\` | Foreign Key → \`merchant.merchant\_id\` |  
| \`name\` | Nama outlet |  
| \`address\` | Alamat outlet |  
| \`status\` | Status outlet |

\---

\#\#\# 2.3 User

Merepresentasikan pengguna sistem, termasuk Owner, Admin, dan Kasir.

| Attribute | Description |  
|---|---|  
| \`user\_id\` | Primary Key |  
| \`merchant\_id\` | Foreign Key → \`merchant.merchant\_id\` |  
| \`outlet\_id\` | Foreign Key → \`outlet.outlet\_id\`, nullable |  
| \`name\` | Nama pengguna |  
| \`email\` | Email pengguna |  
| \`password\` | Password pengguna |  
| \`role\` | Role pengguna |  
| \`status\` | Status pengguna |  
| \`created\_at\` | Waktu pembuatan data |  
| \`updated\_at\` | Waktu perubahan data |

\`outlet\_id\` bersifat nullable karena tidak semua user terikat langsung ke satu outlet.

\- \*\*Owner\*\* → tidak terikat ke outlet tertentu.  
\- \*\*Admin\*\* → tidak terikat ke satu outlet karena dapat mengelola beberapa outlet dalam merchant.  
\- \*\*Kasir\*\* → terikat pada satu outlet.

\---

\#\#\# 2.4 Category

Merepresentasikan kategori produk dalam suatu merchant.

| Attribute | Description |  
|---|---|  
| \`category\_id\` | Primary Key |  
| \`merchant\_id\` | Foreign Key → \`merchant.merchant\_id\` |  
| \`name\` | Nama kategori |

\---

\#\#\# 2.5 Product

Merepresentasikan produk yang dimiliki oleh merchant.

| Attribute | Description |  
|---|---|  
| \`product\_id\` | Primary Key |  
| \`merchant\_id\` | Foreign Key → \`merchant.merchant\_id\` |  
| \`category\_id\` | Foreign Key → \`category.category\_id\` |  
| \`name\` | Nama produk |  
| \`sku\` | Stock Keeping Unit |  
| \`price\` | Harga produk |  
| \`status\` | Status produk |  
| \`created\_at\` | Waktu pembuatan data |  
| \`updated\_at\` | Waktu perubahan data |

\---

\#\#\# 2.6 Inventory

Merepresentasikan jumlah stock suatu produk pada outlet tertentu.

| Attribute | Description |  
|---|---|  
| \`inventory\_id\` | Primary Key |  
| \`outlet\_id\` | Foreign Key → \`outlet.outlet\_id\` |  
| \`product\_id\` | Foreign Key → \`product.product\_id\` |  
| \`quantity\` | Jumlah stock |  
| \`updated\_at\` | Waktu perubahan stock |

Inventory menghubungkan produk dengan outlet sehingga stock dapat dikelola secara terpisah untuk setiap outlet.

\---

\#\#\# 2.7 Transaction

Merepresentasikan transaksi penjualan yang dilakukan pada suatu outlet.

| Attribute | Description |  
|---|---|  
| \`transaction\_id\` | Primary Key |  
| \`outlet\_id\` | Foreign Key → \`outlet.outlet\_id\` |  
| \`user\_id\` | Foreign Key → \`user.user\_id\` |  
| \`transaction\_number\` | Nomor transaksi |  
| \`subtotal\` | Total sebelum perhitungan akhir |  
| \`total\` | Total transaksi |  
| \`created\_at\` | Waktu transaksi |

\---

\#\#\# 2.8 Transaction Item

Merepresentasikan detail produk yang terdapat dalam suatu transaksi.

| Attribute | Description |  
|---|---|  
| \`transaction\_item\_id\` | Primary Key |  
| \`transaction\_id\` | Foreign Key → \`transaction.transaction\_id\` |  
| \`product\_id\` | Foreign Key → \`product.product\_id\` |  
| \`quantity\` | Jumlah produk |  
| \`unit\_price\` | Harga produk saat transaksi |  
| \`subtotal\` | Subtotal item |

\---

\#\#\# 2.9 AI Insight

Merepresentasikan hasil analisis AI untuk suatu merchant.

Hubungan dengan Merchant bersifat **1:1** dan sistem **tidak menyimpan histori**. Hasil analisis terbaru (maksimal 1x/hari) meng-update insight yang sama. \`updated\_at\` menandakan waktu analisis terakhir dan dipakai untuk pengecekan daily limit.

| Attribute | Description |  
|---|---|  
| \`insight\_id\` | Primary Key |  
| \`merchant\_id\` | Foreign Key → \`merchant.merchant\_id\`, unique (1:1) |  
| \`title\` | Judul insight |  
| \`content\` | Isi insight |  
| \`type\` | Tipe insight |  
| \`created\_at\` | Waktu insight pertama kali dibuat |  
| \`updated\_at\` | Waktu analisis terakhir |

\---

\# 3\. Relationships

\#\# 3.1 Merchant → Outlet

\*\*Relationship:\*\* One-to-Many (1:N)

Satu merchant dapat memiliki banyak outlet.

\`\`\`text  
merchant.merchant\_id  
        ↓  
outlet.merchant\_id

**Foreign Key:**

`outlet.merchant_id → merchant.merchant_id`

---

## **3.2 Merchant → User**

**Relationship:** One-to-Many (1:N)

Satu merchant dapat memiliki banyak user.

merchant.merchant\_id  
        ↓  
user.merchant\_id

**Foreign Key:**

`user.merchant_id → merchant.merchant_id`

---

## **3.3 Outlet → User**

**Relationship:** One-to-Many (1:N)

Satu outlet dapat memiliki banyak user yang terikat pada outlet tersebut.

outlet.outlet\_id  
        ↓  
user.outlet\_id

**Foreign Key:**

`user.outlet_id → outlet.outlet_id`

`user.outlet_id` bersifat nullable karena Owner dan Admin berada pada level merchant.

---

## **3.4 Merchant → Category**

**Relationship:** One-to-Many (1:N)

Satu merchant dapat memiliki banyak kategori.

merchant.merchant\_id  
        ↓  
category.merchant\_id

**Foreign Key:**

`category.merchant_id → merchant.merchant_id`

---

## **3.5 Merchant → Product**

**Relationship:** One-to-Many (1:N)

Satu merchant dapat memiliki banyak produk.

merchant.merchant\_id  
        ↓  
product.merchant\_id

**Foreign Key:**

`product.merchant_id → merchant.merchant_id`

---

## **3.6 Category → Product**

**Relationship:** One-to-Many (1:N)

Satu kategori dapat memiliki banyak produk.

category.category\_id  
        ↓  
product.category\_id

**Foreign Key:**

`product.category_id → category.category_id`

---

## **3.7 Outlet → Inventory**

**Relationship:** One-to-Many (1:N)

Satu outlet dapat memiliki banyak data inventory.

outlet.outlet\_id  
        ↓  
inventory.outlet\_id

**Foreign Key:**

`inventory.outlet_id → outlet.outlet_id`

---

## **3.8 Product → Inventory**

**Relationship:** One-to-Many (1:N)

Satu produk dapat memiliki data inventory pada beberapa outlet.

product.product\_id  
        ↓  
inventory.product\_id

**Foreign Key:**

`inventory.product_id → product.product_id`

---

## **3.9 Outlet → Transaction**

**Relationship:** One-to-Many (1:N)

Satu outlet dapat memiliki banyak transaksi.

outlet.outlet\_id  
        ↓  
transaction.outlet\_id

**Foreign Key:**

`transaction.outlet_id → outlet.outlet_id`

---

## **3.10 User → Transaction**

**Relationship:** One-to-Many (1:N)

Satu user dapat melakukan banyak transaksi.

user.user\_id  
        ↓  
transaction.user\_id

**Foreign Key:**

`transaction.user_id → user.user_id`

---

## **3.11 Transaction → Transaction Item**

**Relationship:** One-to-Many (1:N)

Satu transaksi dapat memiliki banyak item produk.

transaction.transaction\_id  
        ↓  
transaction\_item.transaction\_id

**Foreign Key:**

`transaction_item.transaction_id → transaction.transaction_id`

---

## **3.12 Product → Transaction Item**

**Relationship:** One-to-Many (1:N)

Satu produk dapat muncul pada banyak transaction item.

product.product\_id  
        ↓  
transaction\_item.product\_id

**Foreign Key:**

`transaction_item.product_id → product.product_id`

---

## **3.13 Merchant → AI Insight**

**Relationship:** One-to-One (1:1)

Satu merchant hanya memiliki satu hasil analisis AI. Sistem tidak menyimpan histori; analisis terbaru (maksimal 1x/hari) meng-update insight yang sama.

merchant.merchant\_id  
        ↓  
ai\_insight.merchant\_id (unique)

**Foreign Key:**

`ai_insight.merchant_id → merchant.merchant_id`

---

# **4\. Relationship Summary**

| Parent Entity | Child Entity | Foreign Key | Relationship |
| ----- | ----- | ----- | ----- |
| Merchant | Outlet | `outlet.merchant_id` | 1:N |
| Merchant | User | `user.merchant_id` | 1:N |
| Outlet | User | `user.outlet_id` | 1:N |
| Merchant | Category | `category.merchant_id` | 1:N |
| Merchant | Product | `product.merchant_id` | 1:N |
| Category | Product | `product.category_id` | 1:N |
| Outlet | Inventory | `inventory.outlet_id` | 1:N |
| Product | Inventory | `inventory.product_id` | 1:N |
| Outlet | Transaction | `transaction.outlet_id` | 1:N |
| User | Transaction | `transaction.user_id` | 1:N |
| Transaction | Transaction Item | `transaction_item.transaction_id` | 1:N |
| Product | Transaction Item | `transaction_item.product_id` | 1:N |
| Merchant | AI Insight | `ai_insight.merchant_id` | 1:1 |

