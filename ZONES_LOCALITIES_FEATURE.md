# Funcionalidad de Gestión de Localidades en Zonas

## Descripción

Se ha implementado una funcionalidad completa para gestionar localidades dentro de las zonas del sistema. Esta funcionalidad permite a los usuarios crear, editar, eliminar y gestionar localidades individuales dentro de cada zona.

## Características Implementadas

### Backend

#### Nuevas Funciones del Controlador (`zoneController.js`)

1. **`addLocalityToZone`** - Agrega una localidad específica a una zona existente
2. **`removeLocalityFromZone`** - Elimina una localidad específica de una zona
3. **`getZoneLocalities`** - Obtiene todas las localidades de una zona específica

#### Nuevas Rutas (`zoneRoutes.js`)

- `POST /zones/:zoneId/localities` - Agregar localidad a una zona
- `DELETE /zones/:zoneId/localities/:localityId` - Eliminar localidad de una zona
- `GET /zones/:zoneId/localities` - Obtener localidades de una zona

### Frontend

#### Nuevas Funcionalidades en la Interfaz

1. **Botón de Gestión de Localidades** - Nuevo botón azul con ícono de ubicación en cada tarjeta de zona
2. **Modal de Gestión de Localidades** - Interfaz dedicada para gestionar localidades individuales
3. **Formulario de Agregar Localidad** - Permite seleccionar y agregar nuevas localidades a una zona
4. **Lista de Localidades** - Muestra todas las localidades de la zona con opción de eliminación
5. **Filtrado Inteligente** - Solo muestra localidades disponibles que no estén ya en la zona

## Cómo Usar

### 1. Crear una Nueva Zona con Localidades

1. Haz clic en "Nueva Zona"
2. Completa el nombre y descripción
3. Selecciona las localidades iniciales del autocompletado
4. Guarda la zona

### 2. Gestionar Localidades de una Zona Existente

1. Haz clic en el botón azul de ubicación (📍) en la tarjeta de la zona
2. Se abrirá el modal de gestión de localidades
3. **Para agregar una localidad:**
   - Selecciona una localidad del dropdown (solo muestra las disponibles)
   - Haz clic en "Agregar"
4. **Para eliminar una localidad:**
   - Haz clic en el botón rojo de eliminar (🗑️) junto a la localidad
   - Confirma la eliminación

### 3. Editar una Zona Completa

1. Haz clic en el botón de editar (✏️) en la tarjeta de la zona
2. Modifica nombre, descripción y localidades
3. Guarda los cambios

## Estructura de Datos

### Modelo Zone
```prisma
model Zone {
  id          String         @id @default(uuid())
  name        String         @unique
  description String?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  localities  ZoneLocality[]
}
```

### Modelo ZoneLocality
```prisma
model ZoneLocality {
  id        String   @id @default(uuid())
  zoneId    String
  locality  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  zone      Zone     @relation(fields: [zoneId], references: [id], onDelete: Cascade)

  @@unique([zoneId, locality])
}
```

## Validaciones

### Backend
- Verifica que la zona existe antes de agregar/eliminar localidades
- Valida que la localidad sea válida según la lista de localidades disponibles
- Previene duplicados de localidades dentro de la misma zona
- Verifica que la localidad pertenezca a la zona antes de eliminarla

### Frontend
- Formulario de validación con Yup
- Filtrado de localidades ya existentes en la zona
- Confirmación antes de eliminar localidades
- Manejo de errores y mensajes de éxito

## Localidades Disponibles

El sistema incluye localidades predefinidas de:
- Ciudad Autónoma de Buenos Aires (48 barrios)
- Conurbano Bonaerense (15 partidos)
- Zona Norte (20 partidos)
- Zona Oeste (35 partidos)
- Costa Atlántica (12 partidos)
- Interior Sur (40 partidos)

## Scripts de Utilidad

### Seed de Zonas
```bash
cd backend
node scripts/seed-zones.js
```

Este script crea zonas predefinidas con sus localidades correspondientes.

## Consideraciones Técnicas

1. **Relaciones en Cascada** - Al eliminar una zona, se eliminan automáticamente todas sus localidades
2. **Índices de Rendimiento** - Se han agregado índices para optimizar las consultas
3. **Validación de Unicidad** - No se pueden duplicar localidades dentro de la misma zona
4. **Manejo de Errores** - Respuestas HTTP apropiadas para diferentes tipos de errores

## Próximas Mejoras Sugeridas

1. **Búsqueda de Localidades** - Implementar búsqueda por texto en el dropdown
2. **Importación Masiva** - Permitir importar localidades desde archivos CSV/Excel
3. **Estadísticas** - Mostrar estadísticas de uso de localidades
4. **Auditoría** - Registrar cambios en localidades para auditoría
5. **API de Localidades** - Endpoint público para obtener localidades por zona

## Soporte

Para reportar problemas o solicitar nuevas funcionalidades relacionadas con zonas y localidades, contacta al equipo de desarrollo.
