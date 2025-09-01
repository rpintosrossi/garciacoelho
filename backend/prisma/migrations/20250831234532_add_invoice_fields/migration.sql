-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "date" TIMESTAMP(3),
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "number" TEXT,
ADD COLUMN     "paymentMethod" TEXT;
