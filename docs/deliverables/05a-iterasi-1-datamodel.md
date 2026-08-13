merchant [icon: briefcase, color: purple] {
  merchant_id string pk
  owner_user_id string fk unique
  name string
  timezone string
  currency string
  low_stock_threshold int
  service_charge_pct decimal   // FR-TEN-011, OD-004: 5-15, default 10
  status string
  created_at datetime
  updated_at datetime
}

outlet [icon: map-pin, color: blue] {
  outlet_id string pk
  merchant_id string fk
  name string
  address string nullable
  status string
  created_at datetime
  updated_at datetime
}

user [icon: user, color: orange] {
  user_id string pk
  merchant_id string fk
  outlet_id string fk nullable    // CHECK: wajib utk CASHIER, null utk OWNER/ADMIN (raw SQL)
  email_normalized string unique
  email_original string
  password_hash string
  full_name string
  role string
  status string
  created_by string fk nullable
  created_at datetime
  updated_at datetime

  indexes {
    (merchant_id, role)
  }
}

category [icon: tag, color: green] {
  category_id string pk
  merchant_id string fk
  name string
  is_active boolean
  created_at datetime
  updated_at datetime

  indexes {
    (merchant_id, name) [unique]   // DR-010
  }
}

product [icon: package, color: green] {
  product_id string pk
  merchant_id string fk
  category_id string fk
  name string
  price decimal
  is_active boolean
  created_at datetime
  updated_at datetime

  indexes {
    (merchant_id, is_active)
  }
}

product_outlet_price [icon: tag, color: teal] {   // NEW: FR-CAT-011, OD-002
  product_outlet_price_id string pk
  merchant_id string fk
  outlet_id string fk
  product_id string fk
  price decimal
  created_at datetime
  updated_at datetime

  indexes {
    (outlet_id, product_id) [unique]
    (merchant_id)
  }
}

inventory [icon: layers, color: yellow] {
  inventory_id string pk
  merchant_id string fk
  outlet_id string fk
  product_id string fk
  quantity int    // CHECK quantity >= 0 (raw SQL)
  updated_at datetime

  indexes {
    (outlet_id, product_id) [unique]
    (merchant_id)
  }
}

stock_movement [icon: refresh-cw, color: yellow] {
  stock_movement_id string pk
  merchant_id string fk
  outlet_id string fk
  product_id string fk
  type string
  delta int
  quantity_before int
  quantity_after int
  reason string nullable
  reference_id string fk nullable   // transaction_id kalau type = SALE
  actor_user_id string fk
  created_at datetime

  indexes {
    (outlet_id, product_id, created_at)
  }
}

transaction [icon: shopping-cart, color: red] {
  transaction_id string pk
  merchant_id string fk
  outlet_id string fk
  cashier_user_id string fk
  receipt_number string
  status string
  subtotal decimal
  discount_pct decimal        // FIX: OD-004, default 0 (dari Kasir, 0-100)
  discount decimal            // FIX: OD-004
  service_charge_pct decimal  // FIX: OD-004, snapshot dari merchant (5-15)
  service_charge decimal      // FIX: OD-004
  tax_pct decimal             // FIX: OD-004, fiks 11%
  tax decimal                 // FIX: OD-004
  total decimal
  created_at datetime

  indexes {
    (merchant_id, receipt_number) [unique]   // FIX: DR-003, per-merchant bukan global
    (merchant_id, outlet_id, created_at)
  }
}

transaction_line [icon: list, color: red] {
  transaction_line_id string pk
  transaction_id string fk
  product_id string fk
  product_name_snapshot string
  unit_price_snapshot decimal
  quantity int
  subtotal decimal
}

payment [icon: credit-card, color: teal] {
  payment_id string pk
  transaction_id string fk unique
  method string
  amount decimal
  status string
  confirmed_by string fk
  confirmed_at datetime
}

idempotency_record [icon: shield, color: gray] {
  idempotency_record_id string pk
  merchant_id string fk
  outlet_id string fk
  actor_user_id string fk
  idempotency_key string
  payload_fingerprint string
  state string
  transaction_id string fk nullable
  expires_at datetime
  created_at datetime

  indexes {
    (merchant_id, outlet_id, idempotency_key) [unique]   // FIX: BR-008
  }
}

outbox_event [icon: send, color: gray] {
  outbox_event_id string pk
  aggregate_type string
  aggregate_id string
  event_type string
  payload json
  status string
  attempts int
  next_attempt_at datetime
  created_at datetime

  indexes {
    (status, next_attempt_at)
  }
}

job_record [icon: clock, color: gray] {
  job_record_id string pk
  type string
  tenant_merchant_id string fk
  dedupe_key string
  state string
  attempts int
  next_retry_at datetime nullable
  error_category string nullable
  created_at datetime
  updated_at datetime

  indexes {
    (type, dedupe_key) [unique]   // FR-AI-007
  }
}

reporting_projection [icon: bar-chart, color: indigo] {
  reporting_projection_id string pk
  merchant_id string fk
  outlet_id string fk nullable
  period_start datetime
  period_end datetime
  granularity string
  gross_sales decimal
  transaction_count bigint
  units_sold decimal
  metrics json
  source_watermark datetime
  updated_at datetime

  indexes {
    (merchant_id, outlet_id, period_start, granularity) [unique]
    (merchant_id, period_start)
  }
}

insight [icon: zap, color: purple] {
  insight_id string pk
  merchant_id string fk
  outlet_id string fk nullable
  type string
  period_start datetime
  period_end datetime
  data_version string
  title string
  explanation string nullable
  evidence json nullable
  status string
  generated_at datetime nullable
  created_at datetime

  indexes {
    (merchant_id, created_at)
  }
}

audit_event [icon: file-text, color: gray] {
  audit_event_id string pk
  merchant_id string fk
  outlet_id string fk nullable
  actor_user_id string fk
  action string
  target_type string
  target_id string
  before_json json nullable
  after_json json nullable
  correlation_id string
  result string
  created_at datetime

  indexes {
    (merchant_id, created_at)
  }
}

user.user_id - merchant.owner_user_id

merchant.merchant_id < outlet.merchant_id
merchant.merchant_id < user.merchant_id
merchant.merchant_id < category.merchant_id
merchant.merchant_id < product.merchant_id
merchant.merchant_id < product_outlet_price.merchant_id
merchant.merchant_id < inventory.merchant_id
merchant.merchant_id < stock_movement.merchant_id
merchant.merchant_id < transaction.merchant_id
merchant.merchant_id < idempotency_record.merchant_id
merchant.merchant_id < job_record.tenant_merchant_id
merchant.merchant_id < reporting_projection.merchant_id
merchant.merchant_id < insight.merchant_id
merchant.merchant_id < audit_event.merchant_id

outlet.outlet_id < user.outlet_id
outlet.outlet_id < product_outlet_price.outlet_id
outlet.outlet_id < inventory.outlet_id
outlet.outlet_id < stock_movement.outlet_id
outlet.outlet_id < transaction.outlet_id
outlet.outlet_id < idempotency_record.outlet_id
outlet.outlet_id < reporting_projection.outlet_id
outlet.outlet_id < insight.outlet_id
outlet.outlet_id < audit_event.outlet_id

user.user_id < transaction.cashier_user_id
user.user_id < stock_movement.actor_user_id
user.user_id < payment.confirmed_by
user.user_id < idempotency_record.actor_user_id
user.user_id < audit_event.actor_user_id
user.user_id < user.created_by

category.category_id < product.category_id
product.product_id < product_outlet_price.product_id
product.product_id < inventory.product_id
product.product_id < stock_movement.product_id
product.product_id < transaction_line.product_id

transaction.transaction_id < transaction_line.transaction_id
transaction.transaction_id - payment.transaction_id
transaction.transaction_id < idempotency_record.transaction_id   // FIX: many-to-one (nullable, non-unique)
transaction.transaction_id < stock_movement.reference_id