/*
  Warnings:

  - You are about to drop the column `clientId` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `operatorId` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `receiptImages` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `technicianId` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `visitDate` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Technician` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[buildingId]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `buildingId` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `buildingId` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `Service` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Service" DROP CONSTRAINT "Service_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Service" DROP CONSTRAINT "Service_operatorId_fkey";

-- DropForeignKey
ALTER TABLE "Service" DROP CONSTRAINT "Service_technicianId_fkey";

-- DropIndex
DROP INDEX "Account_clientId_key";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "clientId",
ADD COLUMN     "buildingId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Service" DROP COLUMN "clientId",
DROP COLUMN "operatorId",
DROP COLUMN "receiptImages",
DROP COLUMN "technicianId",
DROP COLUMN "visitDate",
ADD COLUMN     "buildingId" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL;

-- DropTable
DROP TABLE "Client";

-- DropTable
DROP TABLE "Technician";

-- CreateTable
CREATE TABLE "Administrator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "taxCondition" "TaxCondition" NOT NULL DEFAULT 'CONSUMIDOR_FINAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Administrator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "taxCondition" "TaxCondition" NOT NULL DEFAULT 'CONSUMIDOR_FINAL',
    "administratorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Administrator_email_key" ON "Administrator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Administrator_cuit_key" ON "Administrator"("cuit");

-- CreateIndex
CREATE UNIQUE INDEX "Building_cuit_key" ON "Building"("cuit");

-- CreateIndex
CREATE UNIQUE INDEX "Account_buildingId_key" ON "Account"("buildingId");

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_administratorId_fkey" FOREIGN KEY ("administratorId") REFERENCES "Administrator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
