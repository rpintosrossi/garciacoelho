-- Nota interna de cada servicio, editable desde el historial del edificio
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "historyNote" TEXT;
