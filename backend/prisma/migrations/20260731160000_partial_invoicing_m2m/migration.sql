-- CreateTable
CREATE TABLE "InvoiceService" (
    "invoiceId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "InvoiceService_pkey" PRIMARY KEY ("invoiceId","serviceId")
);

-- Migrate existing Service.invoiceId links into join table
INSERT INTO "InvoiceService" ("invoiceId", "serviceId")
SELECT "invoiceId", "id"
FROM "Service"
WHERE "invoiceId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Service" DROP CONSTRAINT IF EXISTS "Service_invoiceId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Service_invoiceId_idx";

-- AlterTable
ALTER TABLE "Service" DROP COLUMN IF EXISTS "invoiceId";

-- CreateIndex
CREATE INDEX "InvoiceService_serviceId_idx" ON "InvoiceService"("serviceId");

-- CreateIndex
CREATE INDEX "InvoiceService_invoiceId_idx" ON "InvoiceService"("invoiceId");

-- AddForeignKey
ALTER TABLE "InvoiceService" ADD CONSTRAINT "InvoiceService_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceService" ADD CONSTRAINT "InvoiceService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterEnum
ALTER TYPE "ServiceStatus" ADD VALUE 'FACTURADO_PARCIAL';
