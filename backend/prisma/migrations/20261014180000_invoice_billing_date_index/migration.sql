-- Índices para el reporte de facturación por mes.
-- El filtro por fecha de comprobante y, si no tiene, por fecha de alta.
CREATE INDEX IF NOT EXISTS "Invoice_date_idx" ON "Invoice"("date");
CREATE INDEX IF NOT EXISTS "Invoice_createdAt_idx" ON "Invoice"("createdAt");
