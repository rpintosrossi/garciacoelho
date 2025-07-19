/*
  Warnings:

  - You are about to drop the column `invoiceId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `remitoId` on the `Payment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[comprobante]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `comprobante` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_remitoId_fkey";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "invoiceId",
DROP COLUMN "remitoId",
ADD COLUMN     "comprobante" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "PaymentDocument" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "remitoId" TEXT,

    CONSTRAINT "PaymentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_comprobante_key" ON "Payment"("comprobante");

-- AddForeignKey
ALTER TABLE "PaymentDocument" ADD CONSTRAINT "PaymentDocument_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDocument" ADD CONSTRAINT "PaymentDocument_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDocument" ADD CONSTRAINT "PaymentDocument_remitoId_fkey" FOREIGN KEY ("remitoId") REFERENCES "Remito"("id") ON DELETE SET NULL ON UPDATE CASCADE;
