-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "discountReason" TEXT,
ADD COLUMN     "originalAmount" DOUBLE PRECISION;
