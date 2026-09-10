-- CreateEnum
CREATE TYPE "InvoiceEmissionSource" AS ENUM ('IMPORT', 'AFIP', 'INFORMAL');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "emissionSource" "InvoiceEmissionSource" NOT NULL DEFAULT 'IMPORT';
ALTER TABLE "Invoice" ADD COLUMN "cae" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "caeVto" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "puntoVenta" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN "tipoComprobante" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN "docTipo" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN "docNro" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "impNeto" DOUBLE PRECISION;
ALTER TABLE "Invoice" ADD COLUMN "impIVA" DOUBLE PRECISION;
ALTER TABLE "Invoice" ADD COLUMN "impTotal" DOUBLE PRECISION;
ALTER TABLE "Invoice" ADD COLUMN "afipRaw" JSONB;

-- CreateIndex
CREATE INDEX "Invoice_cae_idx" ON "Invoice"("cae");
