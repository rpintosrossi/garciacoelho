#!/bin/bash
# Script para ejecutar en Railway CLI

echo "Conectando a Railway y ejecutando migración manual..."

railway run psql -c "ALTER TABLE \"Administrator\" ADD COLUMN IF NOT EXISTS \"officeAddress\" TEXT;"
railway run psql -c "ALTER TABLE \"Service\" ADD COLUMN IF NOT EXISTS \"cancellationReason\" TEXT;"

echo "Verificando columnas creadas..."
railway run psql -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'Administrator' AND column_name = 'officeAddress';"
railway run psql -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'Service' AND column_name = 'cancellationReason';"

echo "¡Listo! Ahora reinicia el servicio backend en Railway."

