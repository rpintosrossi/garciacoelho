-- Add cuits and cuitNames arrays to Administrator table
ALTER TABLE "Administrator" ADD COLUMN IF NOT EXISTS "cuits" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Administrator" ADD COLUMN IF NOT EXISTS "cuitNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
