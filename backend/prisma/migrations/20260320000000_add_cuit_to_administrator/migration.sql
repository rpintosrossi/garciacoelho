-- Add cuit column to Administrator table (nullable, safe to add without data loss)
ALTER TABLE "Administrator" ADD COLUMN IF NOT EXISTS "cuit" TEXT;
