-- Add comment column to Payment table
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "comment" TEXT;
