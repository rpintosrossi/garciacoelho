-- AlterTable
ALTER TABLE "Administrator" ADD COLUMN IF NOT EXISTS "lastPackagePaymentMethodId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Administrator_lastPackagePaymentMethodId_idx" ON "Administrator"("lastPackagePaymentMethodId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Administrator_lastPackagePaymentMethodId_fkey'
  ) THEN
    ALTER TABLE "Administrator"
      ADD CONSTRAINT "Administrator_lastPackagePaymentMethodId_fkey"
      FOREIGN KEY ("lastPackagePaymentMethodId") REFERENCES "PaymentMethod"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
