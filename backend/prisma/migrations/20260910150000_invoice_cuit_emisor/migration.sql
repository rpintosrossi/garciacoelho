-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "cuitEmisor" TEXT;

-- Backfill from AFIP raw payload when available
UPDATE "Invoice"
SET "cuitEmisor" = NULLIF(regexp_replace(COALESCE("afipRaw"->>'cuitEmisor', ''), '[^0-9]', '', 'g'), '')
WHERE "cuitEmisor" IS NULL
  AND "afipRaw" IS NOT NULL
  AND "afipRaw"->>'cuitEmisor' IS NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_cuitEmisor_idx" ON "Invoice"("cuitEmisor");
CREATE INDEX IF NOT EXISTS "Invoice_cuitEmisor_date_idx" ON "Invoice"("cuitEmisor", "date");
