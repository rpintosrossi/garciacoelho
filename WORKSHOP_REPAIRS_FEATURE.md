# Feature: Reparaciones en Talleres

## Descripción
Sistema completo para gestionar reparaciones de porteros que se envían a talleres externos. Permite crear talleres, registrar reparaciones asociadas a servicios en estado "Con Remito", hacer seguimiento de costos, precios al cliente y estado de pago.

## Estructura Implementada

### Backend

#### Modelos de Base de Datos (Prisma)
- **Workshop** (Taller)
  - id, name, address, phone, contact
  - Relación con WorkshopRepair

- **WorkshopRepair** (Reparación en Taller)
  - id, serviceId, workshopId
  - buildingAddress (dirección del edificio)
  - doormanBrand (marca del portero)
  - workshopCost (costo del taller)
  - clientPrice (precio al cliente)
  - visitDate, workshopEntryDate, installationDate
  - paid (estado de pago)
  - Relaciones con Service y Workshop

#### Controladores
- **workshopController.js**
  - `getWorkshops()` - Listar talleres
  - `createWorkshop()` - Crear taller
  - `updateWorkshop()` - Actualizar taller
  - `deleteWorkshop()` - Eliminar taller (solo si no tiene reparaciones)

- **workshopRepairController.js**
  - `getWorkshopRepairs()` - Listar reparaciones (con filtro opcional por servicio)
  - `getWorkshopRepairById()` - Obtener reparación por ID
  - `createWorkshopRepair()` - Crear reparación (solo si servicio está en CON_REMITO)
  - `updateWorkshopRepair()` - Actualizar reparación
  - `deleteWorkshopRepair()` - Eliminar reparación

#### Rutas
- `/api/workshops` - CRUD de talleres
- `/api/workshop-repairs` - CRUD de reparaciones

### Frontend

#### Páginas
1. **[/dashboard/workshops/page.tsx](frontend/src/app/dashboard/workshops/page.tsx)**
   - Listado de talleres
   - Crear/editar/eliminar talleres
   - Botón para ver reparaciones
   - Muestra contador de reparaciones por taller

2. **[/dashboard/workshops/repairs/page.tsx](frontend/src/app/dashboard/workshops/repairs/page.tsx)**
   - Listado completo de reparaciones
   - Tabs para filtrar: Todas / Pagadas / Pendientes
   - Editar reparaciones existentes
   - Vista de todos los datos relevantes

3. **[/dashboard/services/page.tsx](frontend/src/app/dashboard/services/page.tsx)** (Modificada)
   - Nuevo botón "🔧" en servicios con estado CON_REMITO
   - Abre modal para crear reparación a taller

#### Componentes
- **[WorkshopRepairModal.tsx](frontend/src/components/WorkshopRepairModal.tsx)**
  - Modal para crear nueva reparación a taller
  - Campos autocompletados: dirección edificio, marca portero, fecha visita
  - Selector de taller con botón "+" para crear taller rápido
  - Campos opcionales: costos, fechas, estado de pago

#### Navegación
- Nuevo item en el menú lateral del dashboard: "Talleres" con ícono 🔧

## Flujo de Uso

1. **Crear Talleres**
   - Ir a Dashboard > Talleres
   - Clic en "Nuevo Taller"
   - Completar datos básicos del taller

2. **Registrar Reparación**
   - Ir a Dashboard > Servicios
   - Buscar servicio en estado "Con Remito"
   - Clic en botón 🔧 "Reparación a Taller"
   - Completar datos:
     * Dirección (autocompletada)
     * Marca portero (autocompletada, editable)
     * Seleccionar taller (o crear uno nuevo con +)
     * Costo taller (opcional)
     * Precio a cliente (opcional)
     * Fecha visita (autocompletada)
     * Fecha ingreso al taller (opcional)
     * Fecha instalación (opcional)
     * Estado de pago (opcional)

3. **Ver y Gestionar Reparaciones**
   - Dashboard > Talleres > "Ver Reparaciones"
   - O desde el botón en la página de talleres
   - Usar tabs para filtrar por estado de pago
   - Editar cualquier reparación para actualizar datos

## Validaciones Implementadas

- Solo se puede crear reparación si el servicio está en estado CON_REMITO
- El nombre del taller es obligatorio
- No se puede eliminar un taller que tenga reparaciones asociadas
- Campos numéricos validados (costos, precios)

## Archivos Modificados

### Backend
- `backend/prisma/schema.prisma` - Modelos Workshop y WorkshopRepair
- `backend/src/controllers/workshopController.js` - NUEVO
- `backend/src/controllers/workshopRepairController.js` - NUEVO
- `backend/src/routes/workshops.js` - NUEVO
- `backend/src/routes/workshopRepairs.js` - NUEVO
- `backend/src/routes/index.js` - Agregadas rutas de talleres y reparaciones

### Frontend
- `frontend/src/app/dashboard/workshops/page.tsx` - NUEVO
- `frontend/src/app/dashboard/workshops/repairs/page.tsx` - NUEVO
- `frontend/src/components/WorkshopRepairModal.tsx` - NUEVO
- `frontend/src/app/dashboard/services/page.tsx` - Agregado botón de reparación
- `frontend/src/app/dashboard/layout.tsx` - Agregado item de menú "Talleres"

## Base de Datos

Las tablas fueron creadas con éxito usando `prisma db push`:
- ✅ Workshop
- ✅ WorkshopRepair
- ✅ Relaciones y índices

## Próximos Pasos (Opcional)

- [ ] Agregar reportes de rentabilidad (precio cliente - costo taller)
- [ ] Notificaciones cuando una reparación esté lista
- [ ] Exportar listado de reparaciones a Excel/PDF
- [ ] Dashboard con estadísticas de talleres
- [ ] Historial de cambios en reparaciones
- [ ] Adjuntar documentos/fotos a reparaciones
