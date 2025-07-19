/*
  Warnings:

  - You are about to drop the column `address` on the `Administrator` table. All the data in the column will be lost.
  - You are about to drop the column `cuit` on the `Administrator` table. All the data in the column will be lost.
  - You are about to drop the column `taxCondition` on the `Administrator` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Administrator_cuit_key";

-- AlterTable
ALTER TABLE "Administrator" DROP COLUMN "address",
DROP COLUMN "cuit",
DROP COLUMN "taxCondition";
