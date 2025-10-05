-- Script SQL para ejecutar manualmente en Railway
-- Ir a Railway -> Database -> Query

-- Add officeAddress column to Administrator table
ALTER TABLE "Administrator" ADD COLUMN IF NOT EXISTS "officeAddress" TEXT;

-- Add cancellationReason column to Service table
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;

-- Verificar que las columnas se crearon correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Administrator' AND column_name = 'officeAddress';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Service' AND column_name = 'cancellationReason';
