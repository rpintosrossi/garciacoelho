# Script PowerShell para ejecutar migración manual en Railway
# Requiere tener Railway CLI instalado: https://docs.railway.app/develop/cli

Write-Host "Conectando a Railway y ejecutando migración manual..." -ForegroundColor Cyan

# Ejecutar las migraciones
Write-Host "`nAgregando columna officeAddress..." -ForegroundColor Yellow
railway run psql -c "ALTER TABLE \`"Administrator\`" ADD COLUMN IF NOT EXISTS \`"officeAddress\`" TEXT;"

Write-Host "`nAgregando columna cancellationReason..." -ForegroundColor Yellow
railway run psql -c "ALTER TABLE \`"Service\`" ADD COLUMN IF NOT EXISTS \`"cancellationReason\`" TEXT;"

# Verificar
Write-Host "`nVerificando columnas creadas..." -ForegroundColor Cyan
railway run psql -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'Administrator' AND column_name = 'officeAddress';"
railway run psql -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'Service' AND column_name = 'cancellationReason';"

Write-Host "`n✅ ¡Listo! Ahora reinicia el servicio backend en Railway." -ForegroundColor Green

