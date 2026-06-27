-- AlterTable
ALTER TABLE "payments" ADD COLUMN "pix_code" TEXT,
ADD COLUMN "card_brand" TEXT,
ADD COLUMN "card_authorization" TEXT,
ADD COLUMN "installments" INTEGER,
ADD COLUMN "cash_received" DECIMAL(12,2),
ADD COLUMN "change_amount" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "fiscal_settings" ADD COLUMN "provider_endpoint" TEXT,
ADD COLUMN "pix_key" TEXT,
ADD COLUMN "pix_merchant_name" TEXT,
ADD COLUMN "pix_merchant_city" TEXT;
