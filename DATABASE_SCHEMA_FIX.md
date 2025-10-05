# Fix: Columnas faltantes en DB + Error de tipo de datos en frontend

## ❌ Problemas Encontrados

### 1. Columnas faltantes en la base de datos
```
The column `Administrator.officeAddress` does not exist in the current database.
The column `Service.cancellationReason` does not exist in the current database.
```

### 2. Error de tipo en frontend
```
TypeError: K.filter is not a function
```
El `CommonDataContext` estaba esperando arrays directos pero recibía objetos con estructura `{ buildings: [...], pagination: {...} }`

## ✅ Soluciones Aplicadas

### Fix 1: Ejecutar SQL en Railway (PENDIENTE - DEBES HACERLO TÚ)

**Pasos:**

1. **Ve a tu proyecto en Railway**: https://railway.app
2. **Selecciona la base de datos** PostgreSQL
3. **Click en la pestaña "Query"** o "Data"
4. **Ejecuta este SQL**:

```sql
-- Add missing columns
ALTER TABLE "Administrator" ADD COLUMN IF NOT EXISTS "officeAddress" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
```

5. **Reinicia el servicio backend** en Railway (Settings → Restart)

### Fix 2: CommonDataContext corregido ✅

**Archivo modificado:** `frontend/src/contexts/CommonDataContext.tsx`

**Cambio aplicado:**
```typescript
// ANTES (INCORRECTO)
setAdministrators(adminsRes.data);
setBuildings(buildingsRes.data);

// DESPUÉS (CORRECTO)
setAdministrators(adminsRes.data.administrators || adminsRes.data);
setBuildings(buildingsRes.data.buildings || buildingsRes.data);
```

Ahora maneja correctamente ambos formatos:
- Objeto con paginación: `{ buildings: [...], pagination: {...} }`
- Array directo: `[...]`

## 🚀 Para Deployar

```bash
# 1. Ver cambios
git status

# 2. Agregar archivos del frontend
git add frontend/src/contexts/CommonDataContext.tsx

# 3. Agregar migraciones y documentación
git add backend/prisma/migrations/
git add backend/src/controllers/
git add DATABASE_SCHEMA_FIX.md

# 4. Commit
git commit -m "Fix: Corregir estructura de datos en CommonDataContext y agregar columnas faltantes"

# 5. Push a Railway
git push origin main
```

## ⚠️ IMPORTANTE: Orden de Aplicación

1. **PRIMERO**: Ejecuta el SQL manualmente en Railway (Fix 1)
2. **SEGUNDO**: Reinicia el backend en Railway
3. **TERCERO**: Haz el commit y push del frontend (Fix 2)

## 🧪 Verificación

Después de aplicar ambos fixes:

- ✅ No más errores de columnas faltantes en backend
- ✅ No más error `filter is not a function` en frontend
- ✅ Registro de servicios funciona correctamente
- ✅ Filtros de edificios por administrador funcionan
- ✅ Todos los endpoints responden correctamente

## 📝 Archivos Modificados

### Backend
- `backend/prisma/migrations/20251005000000_add_missing_columns/migration.sql` - Nueva migración
- `backend/src/controllers/buildingController.js` - Fixes de queries OR vacíos
- `backend/src/controllers/administratorController.js` - Fixes de queries OR vacíos
- `backend/src/controllers/dashboardController.js` - Fixes de queries OR vacíos
- `backend/src/controllers/reportController.js` - Fixes de queries OR vacíos

### Frontend
- `frontend/src/contexts/CommonDataContext.tsx` - Fix estructura de datos buildings/administrators

## 📄 Archivos de Ayuda
- `FIX_COLUMNS_MANUAL.sql` - SQL para ejecutar en Railway
- `fix-railway-db.ps1` - Script PowerShell (alternativo)
- `DATABASE_SCHEMA_FIX.md` - Este documento
