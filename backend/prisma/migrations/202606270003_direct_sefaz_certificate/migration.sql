-- AlterTable
ALTER TABLE "fiscal_settings" ADD COLUMN "certificate_pfx_encrypted" TEXT,
ADD COLUMN "certificate_password_encrypted" TEXT,
ADD COLUMN "certificate_subject" TEXT,
ADD COLUMN "certificate_serial" TEXT,
ADD COLUMN "sefaz_authorization_url" TEXT,
ADD COLUMN "sefaz_soap_action" TEXT,
ADD COLUMN "sefaz_state_code" TEXT NOT NULL DEFAULT '13',
ADD COLUMN "csc_id" TEXT,
ADD COLUMN "csc_token_encrypted" TEXT;
