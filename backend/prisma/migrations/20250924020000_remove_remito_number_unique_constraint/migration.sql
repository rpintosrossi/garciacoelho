-- Remove unique constraint on Remito.number and add composite unique constraint
-- This allows the same remito number to exist for different services

-- First, drop the existing unique constraint on number
ALTER TABLE "Remito" DROP CONSTRAINT IF EXISTS "Remito_number_key";

-- Add a composite unique constraint on serviceId and number
-- This ensures that the same number can exist for different services
-- but not for the same service
ALTER TABLE "Remito" ADD CONSTRAINT "Remito_serviceId_number_key" UNIQUE ("serviceId", "number");



