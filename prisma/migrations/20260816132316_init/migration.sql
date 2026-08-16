-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'CASHIER');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'QRIS', 'TRANSFER');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('ADJUSTMENT', 'SALE');

-- CreateEnum
CREATE TYPE "AiAnalysisJobState" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'RETRY_SCHEDULED', 'FAILED');

-- CreateEnum
CREATE TYPE "InsightStatus" AS ENUM ('READY', 'STALE');

-- CreateTable
CREATE TABLE "merchant" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outlet" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "outlet_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "low_stock_threshold" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outlet_product_price" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outlet_product_price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold_override" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movement" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "quantity_before" INTEGER NOT NULL,
    "quantity_after" INTEGER NOT NULL,
    "reason" TEXT,
    "transaction_id" TEXT,
    "actor_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "operator_user_id" TEXT NOT NULL,
    "transaction_number" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkout_request_id" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_item" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name_snapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_snapshot" DECIMAL(14,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "transaction_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analysis_job" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "analysis_date" DATE NOT NULL,
    "state" "AiAnalysisJobState" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "error_category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_analysis_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_insight" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "evidence_summary" JSONB NOT NULL,
    "status" "InsightStatus" NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "data_version" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_insight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "merchant_owner_user_id_key" ON "merchant"("owner_user_id");

-- CreateIndex
CREATE INDEX "outlet_merchant_id_idx" ON "outlet"("merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_merchant_id_role_idx" ON "user"("merchant_id", "role");

-- CreateIndex
CREATE INDEX "user_merchant_id_outlet_id_idx" ON "user"("merchant_id", "outlet_id");

-- CreateIndex
CREATE UNIQUE INDEX "category_merchant_id_name_key" ON "category"("merchant_id", "name");

-- CreateIndex
CREATE INDEX "product_merchant_id_is_active_idx" ON "product"("merchant_id", "is_active");

-- CreateIndex
CREATE INDEX "outlet_product_price_merchant_id_idx" ON "outlet_product_price"("merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "outlet_product_price_outlet_id_product_id_key" ON "outlet_product_price"("outlet_id", "product_id");

-- CreateIndex
CREATE INDEX "inventory_merchant_id_idx" ON "inventory"("merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_outlet_id_product_id_key" ON "inventory"("outlet_id", "product_id");

-- CreateIndex
CREATE INDEX "stock_movement_outlet_id_product_id_created_at_idx" ON "stock_movement"("outlet_id", "product_id", "created_at");

-- CreateIndex
CREATE INDEX "transaction_merchant_id_outlet_id_created_at_idx" ON "transaction"("merchant_id", "outlet_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_merchant_id_checkout_request_id_key" ON "transaction"("merchant_id", "checkout_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_merchant_id_transaction_number_key" ON "transaction"("merchant_id", "transaction_number");

-- CreateIndex
CREATE INDEX "transaction_item_transaction_id_idx" ON "transaction_item"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_analysis_job_merchant_id_analysis_date_key" ON "ai_analysis_job"("merchant_id", "analysis_date");

-- CreateIndex
CREATE UNIQUE INDEX "ai_insight_merchant_id_type_key" ON "ai_insight"("merchant_id", "type");

-- AddForeignKey
ALTER TABLE "outlet" ADD CONSTRAINT "outlet_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlet_product_price" ADD CONSTRAINT "outlet_product_price_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlet_product_price" ADD CONSTRAINT "outlet_product_price_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlet_product_price" ADD CONSTRAINT "outlet_product_price_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_operator_user_id_fkey" FOREIGN KEY ("operator_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_item" ADD CONSTRAINT "transaction_item_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_item" ADD CONSTRAINT "transaction_item_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analysis_job" ADD CONSTRAINT "ai_analysis_job_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_insight" ADD CONSTRAINT "ai_insight_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraint
ALTER TABLE "user" ADD CONSTRAINT "chk_cashier_outlet" CHECK (
  (role = 'CASHIER' AND outlet_id IS NOT NULL) OR (role IN ('OWNER','ADMIN') AND outlet_id IS NULL)
);

ALTER TABLE "inventory" ADD CONSTRAINT "chk_inventory_quantity" CHECK (quantity >= 0);

-- DR-005: cegah amount negatif
ALTER TABLE "transaction" ADD CONSTRAINT "chk_transaction_amounts" CHECK (subtotal >= 0 AND total >= 0);
ALTER TABLE "transaction_item" ADD CONSTRAINT "chk_item_subtotal" CHECK (subtotal >= 0);
ALTER TABLE "outlet_product_price" ADD CONSTRAINT "chk_price_nonneg" CHECK (price >= 0);
ALTER TABLE "product" ADD CONSTRAINT "chk_product_price_nonneg" CHECK (price >= 0);
