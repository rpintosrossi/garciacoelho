/*
  Warnings:

  - You are about to drop the column `receiptImage` on the `Service` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Service" DROP COLUMN "receiptImage",
ADD COLUMN     "receiptImages" TEXT[];
