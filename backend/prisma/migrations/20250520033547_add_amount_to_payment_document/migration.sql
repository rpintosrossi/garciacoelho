/*
  Warnings:

  - Added the required column `amount` to the `PaymentDocument` table without a default value. This is not possible if the table is not empty.

*/
-- Primero agregamos la columna con un valor por defecto
ALTER TABLE "PaymentDocument" ADD COLUMN "amount" DOUBLE PRECISION DEFAULT 0;

-- Actualizamos los registros existentes
UPDATE "PaymentDocument" SET "amount" = 0 WHERE "amount" IS NULL;

-- Finalmente hacemos la columna NOT NULL
ALTER TABLE "PaymentDocument" ALTER COLUMN "amount" SET NOT NULL;
ALTER TABLE "PaymentDocument" ALTER COLUMN "amount" DROP DEFAULT;
