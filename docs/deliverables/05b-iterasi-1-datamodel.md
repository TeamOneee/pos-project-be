# Multi-Outlet POS System — ERD

```mermaid
erDiagram
    user ||--o| merchant : "owner_user_id"
    merchant ||--o{ ai_analysis_job : "merchant_id"
    merchant ||--o{ stock_movement : "merchant_id"
    outlet ||--o{ stock_movement : "outlet_id"
    product ||--o{ stock_movement : "product_id"
    user ||--o{ stock_movement : "actor_user_id"
    merchant ||--o{ outlet : "merchant_id"
    merchant ||--o{ user : "merchant_id"
    merchant ||--o{ category : "merchant_id"
    merchant ||--o{ product : "merchant_id"
    merchant ||--o{ inventory : "merchant_id"
    merchant ||--o{ outlet_product_price : "merchant_id"
    merchant ||--o{ transaction : "merchant_id"
    merchant ||--o{ ai_insight : "merchant_id"
    outlet ||--o{ user : "outlet_id"
    outlet ||--o{ inventory : "outlet_id"
    product ||--o{ inventory : "product_id"
    category ||--o{ product : "category_id"
    outlet ||--o{ outlet_product_price : "outlet_id"
    product ||--o{ outlet_product_price : "product_id"
    outlet ||--o{ transaction : "outlet_id"
    user ||--o{ transaction : "operator_user_id"
    transaction ||--o{ transaction_item : "transaction_id"
    product ||--o{ transaction_item : "product_id"
    transaction ||--o{ stock_movement : "transaction_id"

    merchant {
        string merchant_id PK
        string owner_user_id FK
        string name
        string timezone
        string status
        datetime created_at
        datetime updated_at
    }

    outlet {
        string outlet_id PK
        string merchant_id FK
        string name
        string address
        string status
        datetime created_at
        datetime updated_at
    }

    user {
        string user_id PK
        string merchant_id FK
        string outlet_id FK "nullable"
        string name
        string email
        string password_hash
        string role
        string status
        datetime created_at
        datetime updated_at
    }

    category {
        string category_id PK
        string merchant_id FK
        string name
        boolean is_active
    }

    product {
        string product_id PK
        string merchant_id FK
        string category_id FK
        string name
        decimal price
        int low_stock_threshold
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    inventory {
        string inventory_id PK
        string merchant_id FK
        string outlet_id FK
        string product_id FK
        int quantity
        int low_stock_threshold_override "nullable"
        datetime updated_at
    }

    outlet_product_price {
        string outlet_product_price_id PK
        string merchant_id FK
        string outlet_id FK
        string product_id FK
        decimal price
        datetime updated_at
    }

    transaction {
        string transaction_id PK
        string merchant_id FK
        string outlet_id FK
        string operator_user_id FK
        string transaction_number
        string status
        string payment_method
        string payment_status
        datetime paid_at
        string checkout_request_id
        string request_hash
        decimal subtotal
        decimal total
        datetime created_at
    }

    transaction_item {
        string transaction_item_id PK
        string transaction_id FK
        string product_id FK
        string product_name_snapshot
        int quantity
        decimal unit_price_snapshot
    }

    ai_insight {
        string insight_id PK
        string merchant_id FK
        string type
        string title
        text content
        json evidence_summary
        string status
        datetime period_start
        datetime period_end
        string data_version
        datetime generated_at
    }

    stock_movement {
        string stock_movement_id PK
        string merchant_id FK
        string outlet_id FK
        string product_id FK
        string type
        int delta
        int quantity_before
        int quantity_after
        string reason "nullable"
        string transaction_id FK "nullable"
        string actor_user_id FK
        datetime created_at
    }

    ai_analysis_job {
        string ai_analysis_job_id PK
        string merchant_id FK
        date analysis_date
        string state
        int attempts
        datetime next_retry_at "nullable"
        string error_category "nullable"
        datetime created_at
        datetime updated_at
    }
```

## Catatan model

- diagram ini berfokus pada entitas dan relasi; unique key, check, index, dan detail constraint fisik ditetapkan saat rancangan Prisma/migration.
- `Cart`, `Payment`, `IdempotencyRecord`, audit trail umum, outbox reporting, dan reporting projection sengaja tidak menjadi tabel MVP.
- `Transaction` menyimpan atribut pembayaran manual dan idempotency checkout secara langsung.
- `TransactionItem.subtotal` tidak disimpan; nilainya selalu dihitung dari `unit_price_snapshot × quantity` ketika dibutuhkan.
- `StockMovement` adalah riwayat perubahan stok, bukan audit trail umum; `transaction_id` hanya diisi untuk pergerakan bertipe `SALE`.

## Siklus AI insight

Satu `AiAnalysisJob` dibuat untuk satu analisis harian Merchant. Job yang selesai dapat menghasilkan nol atau lebih tipe insight. Untuk setiap tipe yang memiliki data cukup, sistem memperbarui row `AiInsight` terbaru milik Merchant tersebut; sistem tidak membuat histori insight per tipe.

`AiInsight.type` adalah tipe yang ditentukan pengembang untuk MVP: tren penjualan, perbandingan Outlet, produk terlaris/tidak laku, pola waktu penjualan, dan tren AOV. Job memperbarui hasil insight terbaru tanpa menyimpan relasi permanen ke riwayat job.
