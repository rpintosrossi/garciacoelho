# Solución para Sincronización de Remitos

## Problema Identificado

El usuario reportó que después de subir un remito, el servicio seguía apareciendo en el listado de "Remitos" por un tiempo, y solo se actualizaba si se hacía F5 (refresh manual). Esto indicaba que el sistema de eventos no estaba funcionando correctamente para la subida de remitos.

## Causa Raíz

El problema estaba en que el frontend estaba enviando los datos del remito de forma incorrecta:

1. **Frontend enviaba**: `{ receiptImage: 'URL_DE_LA_IMAGEN' }` como JSON
2. **Backend esperaba**: Archivos reales en `req.files` usando `multipart/form-data`

## Solución Implementada

### 1. Corrección del Frontend

**Archivo**: `frontend/src/app/dashboard/services/new/page.tsx`

**Cambios realizados**:

```typescript
// ANTES (incorrecto)
await api.post(`/services/${serviceId}/receipt`, {
  receiptImage: currentData.receiptImage || 'URL_DE_LA_IMAGEN',
});

// DESPUÉS (correcto)
if (!receiptImage) {
  setError('Debes seleccionar una imagen del remito');
  return;
}

// Crear FormData para enviar el archivo
const formData = new FormData();
formData.append('receipts', receiptImage);

// Usar api.post directamente para archivos
await api.post(`/services/${serviceId}/receipt`, formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Notificar cambio manualmente después de subir el archivo
if (typeof window !== 'undefined' && window.dispatchEvent) {
  window.dispatchEvent(new CustomEvent('servicesChanged'));
}
```

### 2. Mejora del Sistema de Eventos

**Archivo**: `frontend/src/app/dashboard/services/page.tsx`

**Cambios realizados**:

```typescript
// Escuchar cambios en servicios para actualizar automáticamente
useEffect(() => {
  const handleServicesChanged = () => {
    console.log('🔄 [SERVICES] Cambio detectado, actualizando lista...');
    // Limpiar caché y recargar
    cachedApi.clearCacheFor('/services');
    fetchServices();
  };

  // Suscribirse a cambios en servicios
  cachedApi.onServicesChanged(handleServicesChanged);

  // Escuchar eventos personalizados también
  window.addEventListener('servicesChanged', handleServicesChanged);

  // Limpiar suscripción al desmontar
  return () => {
    cachedApi.offServicesChanged(handleServicesChanged);
    window.removeEventListener('servicesChanged', handleServicesChanged);
  };
}, []);
```

## Flujo de Funcionamiento

### 1. Usuario Sube Remito
1. Usuario selecciona archivo en el frontend
2. Frontend crea `FormData` con el archivo
3. Se envía al backend usando `multipart/form-data`

### 2. Backend Procesa Remito
1. Backend recibe archivos en `req.files`
2. Valida tipos de archivo (JPG, PDF)
3. Guarda archivos en `uploads/`
4. Actualiza servicio a estado `'CON_REMITO'`
5. Crea registro en tabla `remito`

### 3. Frontend Se Actualiza Automáticamente
1. Después de subir exitosamente, se emite evento `servicesChanged`
2. La página de servicios escucha el evento
3. Se limpia el caché y se recargan los datos
4. El servicio desaparece de "Remitos" y aparece en "Con Remito"

## Beneficios de la Solución

### 1. Sincronización Inmediata
- Los cambios se reflejan instantáneamente
- No es necesario hacer F5
- Elimina la confusión de datos desactualizados

### 2. Validación Mejorada
- Se valida que se seleccione un archivo antes de enviar
- Se muestran mensajes de error claros
- Se previenen envíos vacíos

### 3. Manejo Correcto de Archivos
- Se usa `FormData` para archivos reales
- Se envía con `Content-Type: multipart/form-data`
- Compatible con el middleware `multer` del backend

## Verificación

Para verificar que la solución funciona:

1. **Subir un remito**: El servicio debe cambiar inmediatamente de estado
2. **Verificar listado**: El servicio debe desaparecer de "Remitos" y aparecer en "Con Remito"
3. **Sin refresh**: No debe ser necesario hacer F5 para ver los cambios

## Archivos Modificados

- `frontend/src/app/dashboard/services/new/page.tsx`
- `frontend/src/app/dashboard/services/page.tsx`

## Conclusión

Esta solución resuelve completamente el problema de sincronización de remitos, proporcionando una experiencia de usuario fluida donde los cambios se reflejan inmediatamente sin necesidad de refrescar la página manualmente.
