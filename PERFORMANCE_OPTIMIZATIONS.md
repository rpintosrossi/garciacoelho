# Optimizaciones de Rendimiento - Garcia Coelho

## Problemas Identificados

### 1. Consultas N+1 en el Backend
- **Problema**: El controlador de edificios estaba haciendo múltiples consultas innecesarias
- **Impacto**: Lentitud en la carga de la página de servicios
- **Solución**: Optimización de consultas con `select` específico en lugar de `include` completo

### 2. Falta de Índices en la Base de Datos
- **Problema**: No había índices optimizados para las consultas más frecuentes
- **Impacto**: Consultas lentas en la base de datos
- **Solución**: Agregados índices en campos críticos

### 3. Sistema de Caché Ineficiente
- **Problema**: El caché tenía duración muy corta (30 segundos)
- **Impacto**: Peticiones repetidas innecesarias
- **Solución**: Aumentada duración del caché a 2 minutos

### 4. Carga de Datos Secuencial
- **Problema**: Los datos se cargaban uno tras otro
- **Impacto**: Tiempo de carga acumulativo
- **Solución**: Implementado `Promise.all` para carga paralela

## Optimizaciones Implementadas

### Backend

#### 1. Controlador de Edificios (`buildingController.js`)
```javascript
// ANTES: Consulta pesada con múltiples includes
const buildings = await prisma.building.findMany({
  include: {
    administrator: true,
    account: true
  }
});

// DESPUÉS: Consulta optimizada con select específico
const buildings = await prisma.building.findMany({
  select: {
    id: true,
    name: true,
    address: true,
    // ... solo campos necesarios
    administrator: {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      }
    },
    _count: {
      select: {
        services: true
      }
    }
  }
});
```

#### 2. Controlador de Servicios (`serviceController.js`)
```javascript
// ANTES: Include completo con conversión de URLs
const services = await prisma.service.findMany({
  include: {
    building: { /* ... */ },
    technician: true,
    invoice: true,
    remitos: true
  }
});

// DESPUÉS: Select optimizado sin conversión innecesaria
const services = await prisma.service.findMany({
  select: {
    id: true,
    name: true,
    description: true,
    status: true,
    building: {
      select: {
        id: true,
        name: true,
        cuit: true,
        administrator: {
          select: {
            id: true,
            name: true
          }
        }
      }
    },
    technician: {
      select: {
        id: true,
        name: true,
        email: true
      }
    }
  }
});
```

#### 3. Índices de Base de Datos
```sql
-- Índices agregados para mejorar rendimiento
CREATE INDEX "Service_status_idx" ON "Service"("status");
CREATE INDEX "Service_buildingId_idx" ON "Service"("buildingId");
CREATE INDEX "Service_technicianId_idx" ON "Service"("technicianId");
CREATE INDEX "Service_createdAt_idx" ON "Service"("createdAt");
CREATE INDEX "Service_status_createdAt_idx" ON "Service"("status", "createdAt");
CREATE INDEX "Service_buildingId_status_idx" ON "Service"("buildingId", "status");

CREATE INDEX "Building_administratorId_idx" ON "Building"("administratorId");
CREATE INDEX "Building_name_idx" ON "Building"("name");
CREATE INDEX "Building_locality_idx" ON "Building"("locality");
CREATE INDEX "Building_administratorId_name_idx" ON "Building"("administratorId", "name");
```

### Frontend

#### 1. Sistema de Caché Mejorado (`axios.ts`)
```javascript
// ANTES: Caché de 30 segundos
const CACHE_DURATION = 30000;

// DESPUÉS: Caché de 2 minutos con logs
const CACHE_DURATION = 120000;

// Agregados logs para monitoreo
console.log(`⚡ [CACHE] Usando caché para: ${url}`);
console.log(`🚀 [CACHE] Nueva petición para: ${url}`);
```

#### 2. Carga Paralela de Datos
```javascript
// ANTES: Carga secuencial
const buildingsRes = await api.get('/buildings');
const techniciansRes = await api.get('/technicians');

// DESPUÉS: Carga paralela
const [buildingsRes, techniciansRes] = await Promise.all([
  api.get('/buildings'),
  api.get('/technicians'),
]);
```

#### 3. Indicadores de Carga
```javascript
// Agregado estado de carga
const [isLoading, setIsLoading] = useState(true);

// UI con indicador de carga
{isLoading && (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
    <CircularProgress size={60} />
    <Typography variant="h6" sx={{ ml: 2 }}>
      Cargando datos...
    </Typography>
  </Box>
)}
```

## Resultados Esperados

### Antes de las Optimizaciones
- ⏱️ **Página de servicios**: 5-10 segundos de carga
- ⏱️ **Nuevo servicio**: 10+ segundos para aparecer la pantalla
- 🔄 **Consultas de base de datos**: Múltiples consultas N+1
- 💾 **Caché**: 30 segundos, peticiones repetidas frecuentes

### Después de las Optimizaciones
- ⚡ **Página de servicios**: 1-3 segundos de carga
- ⚡ **Nuevo servicio**: 2-5 segundos para aparecer la pantalla
- 🔄 **Consultas de base de datos**: Consultas optimizadas con índices
- 💾 **Caché**: 2 minutos, menos peticiones repetidas

## Monitoreo y Logs

Se han agregado logs detallados para monitorear el rendimiento:

```javascript
// Backend
console.log('🏢 [BUILDINGS] Iniciando consulta optimizada...');
console.log('🔧 [SERVICES] Consulta completada. ${services.length} servicios encontrados');

// Frontend
console.log('🚀 [CACHE] Nueva petición para: ${url}');
console.log('✅ [NEW SERVICE] Datos cargados exitosamente');
```

## Próximos Pasos

1. **Monitoreo en Producción**: Observar los logs para identificar cuellos de botella restantes
2. **Optimización de Imágenes**: Implementar compresión y lazy loading
3. **Paginación Virtual**: Para listas muy grandes
4. **CDN**: Para archivos estáticos
5. **Compresión Gzip**: En el servidor

## Comandos para Aplicar Cambios

```bash
# Aplicar migraciones de base de datos
cd backend
npx prisma migrate dev --name add-performance-indexes

# Regenerar cliente Prisma
npx prisma generate

# Reiniciar servidor
npm run dev
```

## Notas Importantes

- Los índices mejorarán el rendimiento de las consultas pero pueden afectar ligeramente las operaciones de escritura
- El caché aumentado puede causar datos ligeramente desactualizados (2 minutos máximo)
- Los logs de rendimiento están habilitados solo en desarrollo
- Se recomienda monitorear el uso de memoria del caché en producción
