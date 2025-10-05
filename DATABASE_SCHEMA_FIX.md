# Fix: Columnas faltantes en la base de datos de Railway

## Problema

Después del deploy en Railway, varios endpoints estaban fallando con error 500:

```
The column `Administrator.officeAddress` does not exist in the current database.
The column `Service.cancellationReason` does not exist in the current database.
```

## Causa

El schema de Prisma (`backend/prisma/schema.prisma`) tiene definidas estas columnas:
- `Administrator.officeAddress` (opcional)
- `Service.cancellationReason` (opcional)

Pero nunca se creó una migración para agregarlas a la base de datos en Railway.

## Solución

Se creó la migración `20251005000000_add_missing_columns` que agrega ambas columnas:

```sql
-- Add officeAddress column to Administrator table
ALTER TABLE "Administrator" ADD COLUMN IF NOT EXISTS "officeAddress" TEXT;

-- Add cancellationReason column to Service table
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
```

## Archivos Creados

1. **backend/prisma/migrations/20251005000000_add_missing_columns/migration.sql**
   - Migración SQL que agrega las columnas faltantes

## Archivos Modificados Previamente

1. **backend/src/controllers/buildingController.js** - Fixes de queries OR vacíos
2. **backend/src/controllers/administratorController.js** - Fixes de queries OR vacíos
3. **backend/src/controllers/dashboardController.js** - Fixes de queries OR vacíos
4. **backend/src/controllers/reportController.js** - Fixes de queries OR vacíos

## Para Deployar

1. Hacer commit de todos los cambios:
```bash
git add backend/
git add DATABASE_SCHEMA_FIX.md
git commit -m "Fix: Agregar columnas faltantes y corregir queries de Prisma"
```

2. Push a Railway (esto disparará el redeploy automáticamente):
```bash
git push origin main
```

3. Railway ejecutará automáticamente:
   - `npm run build` (que ejecuta `npx prisma generate`)
   - `npm start` (que ejecuta `node start.js`)
   - El `start.js` ejecuta `npx prisma migrate deploy` que aplicará la nueva migración

## Verificación

Después del deploy, los endpoints deben funcionar correctamente:
- ✅ `/api/buildings`
- ✅ `/api/administrators`
- ✅ `/api/dashboard` (todos los endpoints)

## Notas Importantes

- Las columnas se agregan con `IF NOT EXISTS` para evitar errores si ya existen
- Ambas columnas son opcionales (`TEXT` permite NULL)
- La migración es segura y no afecta datos existentes

