-- Add missing columns to Administrator and Service tables

-- Add officeAddress column to Administrator table
ALTER TABLE "Administrator" ADD COLUMN IF NOT EXISTS "officeAddress" TEXT;

-- Add cancellationReason column to Service table
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;

