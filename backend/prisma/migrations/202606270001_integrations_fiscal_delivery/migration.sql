-- CreateEnum
CREATE TYPE "FiscalEnvironment" AS ENUM ('HOMOLOGATION', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "FiscalDocumentStatus" AS ENUM ('NEEDS_CONFIGURATION', 'PENDING', 'AUTHORIZED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('IFOOD');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('DISABLED', 'CONFIGURED', 'CONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('WAITING', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "fiscal_settings" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_issue_cupom" BOOLEAN NOT NULL DEFAULT true,
    "environment" "FiscalEnvironment" NOT NULL DEFAULT 'HOMOLOGATION',
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "provider_token" TEXT,
    "certificate_name" TEXT,
    "certificate_expires_at" TIMESTAMP(3),
    "cnpj" TEXT,
    "legal_name" TEXT,
    "trade_name" TEXT,
    "state_registration" TEXT,
    "municipal_registration" TEXT,
    "tax_regime" TEXT,
    "cep" TEXT,
    "street" TEXT,
    "number" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "nfce_series" INTEGER NOT NULL DEFAULT 1,
    "nfce_next_number" INTEGER NOT NULL DEFAULT 1,
    "nfe_series" INTEGER NOT NULL DEFAULT 1,
    "nfe_next_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_settings" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'DISABLED',
    "store_id" TEXT,
    "merchant_id" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "webhook_secret" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couriers" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "vehicle" TEXT,
    "plate" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "couriers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_orders" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "order_id" TEXT,
    "courier_id" TEXT,
    "external_provider" "IntegrationProvider",
    "external_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT,
    "address" TEXT NOT NULL,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "delivery_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'WAITING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_at" TIMESTAMP(3),
    "picked_up_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "delivery_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_documents" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "tab_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'NFC_E',
    "status" "FiscalDocumentStatus" NOT NULL DEFAULT 'NEEDS_CONFIGURATION',
    "environment" "FiscalEnvironment" NOT NULL DEFAULT 'HOMOLOGATION',
    "series" INTEGER,
    "number" INTEGER,
    "access_key" TEXT,
    "protocol" TEXT,
    "xml_url" TEXT,
    "danfe_url" TEXT,
    "error_message" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "customer_cpf" TEXT,
    "issued_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_settings_restaurant_id_key" ON "fiscal_settings"("restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_settings_restaurant_id_provider_key" ON "integration_settings"("restaurant_id", "provider");

-- CreateIndex
CREATE INDEX "couriers_restaurant_id_active_idx" ON "couriers"("restaurant_id", "active");

-- CreateIndex
CREATE INDEX "delivery_orders_restaurant_id_status_idx" ON "delivery_orders"("restaurant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_orders_restaurant_id_external_provider_external_id_key" ON "delivery_orders"("restaurant_id", "external_provider", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_documents_payment_id_key" ON "fiscal_documents"("payment_id");

-- CreateIndex
CREATE INDEX "fiscal_documents_restaurant_id_status_created_at_idx" ON "fiscal_documents"("restaurant_id", "status", "created_at");

-- AddForeignKey
ALTER TABLE "fiscal_settings" ADD CONSTRAINT "fiscal_settings_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_settings" ADD CONSTRAINT "integration_settings_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couriers" ADD CONSTRAINT "couriers_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "couriers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_tab_id_fkey" FOREIGN KEY ("tab_id") REFERENCES "tabs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
