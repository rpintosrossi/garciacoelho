-- AlterTable: Remove unique constraint from Invoice.serviceId and add invoiceId to Service
-- This migration allows multiple services to be associated with a single invoice

-- Step 1: Add invoiceId column to Service table (nullable)
ALTER TABLE "Service" ADD COLUMN "invoiceId" TEXT;

-- Step 2: Migrate existing data - copy serviceId from Invoice to Service.invoiceId
UPDATE "Service" 
SET "invoiceId" = "Invoice"."id"
FROM "Invoice"
WHERE "Service"."id" = "Invoice"."serviceId";

-- Step 3: Drop the old relationship
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_serviceId_fkey";
DROP INDEX IF EXISTS "Invoice_serviceId_key";
DROP INDEX IF EXISTS "Invoice_serviceId_status_idx";

-- Step 4: Remove serviceId from Invoice table
ALTER TABLE "Invoice" DROP COLUMN "serviceId";

-- Step 5: Add foreign key constraint from Service to Invoice
ALTER TABLE "Service" ADD CONSTRAINT "Service_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 6: Create index on Service.invoiceId
CREATE INDEX "Service_invoiceId_idx" ON "Service"("invoiceId");
