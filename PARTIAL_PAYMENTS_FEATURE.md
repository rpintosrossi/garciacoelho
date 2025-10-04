# Funcionalidad de Pagos Parciales

## Descripción
Se ha implementado la funcionalidad de pagos parciales que permite a los edificios y administradores pagar menos del monto total de las facturas, dejando un saldo pendiente que puede ser pagado posteriormente.

## Características Implementadas

### 1. Backend - Controlador de Pagos
**Archivo**: `backend/src/controllers/paymentController.js`

**Cambios realizados**:
- Eliminada la validación que requería que el monto del pago fuera igual al total de los documentos
- Agregada lógica para permitir pagos parciales donde el monto puede ser menor al total
- Mantenida la validación de que el monto no puede superar el total de los documentos
- Agregados logs para identificar pagos parciales

### 2. Frontend - Modal de Pagos
**Archivo**: `frontend/src/app/dashboard/administrators/BuildingPaymentModal.tsx`

**Nuevas funcionalidades**:
- Campo de monto editable que permite al usuario especificar un monto menor al total
- **Monto por defecto**: Se establece automáticamente como la suma total de las facturas seleccionadas
- **Prioridad de pago**: Las facturas más antiguas se pagan primero, dejando el saldo a las más nuevas
- Validación del monto máximo permitido
- Cálculo automático del saldo pendiente que quedará después del pago
- **Distribución inteligente**: Muestra cómo se distribuirá el pago entre las facturas
- Advertencia visual cuando se realiza un pago parcial

## Flujo de Funcionamiento

### 1. Selección de Documentos
1. El usuario selecciona las facturas/remitos que desea pagar
2. El sistema calcula automáticamente el monto total
3. Se pueden aplicar descuentos (opcional)

### 2. Especificación del Monto
1. El usuario puede modificar el monto final a pagar
2. El sistema valida que no exceda el monto máximo permitido
3. Se muestra el saldo pendiente que quedará después del pago

### 3. Procesamiento del Pago
1. El sistema distribuye proporcionalmente el pago entre los documentos
2. Se registra el pago con el monto especificado
3. Los documentos quedan con saldo pendiente para futuros pagos

## Ejemplo de Uso

### Escenario: Pago Parcial de Factura
1. **Factura generada**: $100,000
2. **Pago realizado**: $60,000 (pago parcial)
3. **Saldo pendiente**: $40,000
4. **Resultado**: La factura queda con $40,000 pendientes que pueden ser pagados en futuras transacciones

### Distribución por Prioridad (Nueva Funcionalidad)
Si se seleccionan múltiples documentos:
- **Factura A** (más antigua): $50,000 - Fecha: 01/01/2024
- **Factura B** (más nueva): $30,000 - Fecha: 15/01/2024
- **Total**: $80,000
- **Pago realizado**: $60,000

**Distribución por prioridad**:
- **Factura A**: $50,000 (completa) ✅
- **Factura B**: $10,000 (parcial) - Saldo pendiente: $20,000

### Monto por Defecto
- Al seleccionar facturas, el monto se establece automáticamente al total
- El usuario puede modificar el monto para hacer un pago parcial
- Si no modifica nada, se paga el monto completo

## Beneficios

1. **Flexibilidad**: Los edificios pueden pagar según su capacidad financiera
2. **Control de flujo**: Mejor gestión del flujo de caja
3. **Seguimiento**: El sistema mantiene el registro del saldo pendiente
4. **Transparencia**: Se muestra claramente cuánto queda pendiente

## Validaciones

1. **Monto máximo**: No se puede pagar más del monto total de los documentos
2. **Monto mínimo**: Debe ser mayor a 0
3. **Documentos seleccionados**: Debe haber al menos un documento seleccionado
4. **Método de pago**: Debe estar especificado

## Interfaz de Usuario

### Indicadores Visuales
- **Campo de monto**: Editable con validación en tiempo real
- **Advertencia de pago parcial**: Se muestra cuando queda saldo pendiente
- **Helper text**: Indica el monto máximo permitido
- **Cálculo automático**: Del saldo pendiente

### Mensajes de Validación
- Error si el monto excede el máximo permitido
- Advertencia visual del saldo pendiente
- Confirmación del pago parcial

## Compatibilidad

Esta funcionalidad es completamente compatible con:
- Sistema de descuentos existente
- Cálculo de saldos en cuenta corriente
- Reportes y consultas existentes
- Sistema de notificaciones

## Consideraciones Técnicas

1. **Base de datos**: No requiere cambios en el esquema
2. **API**: Mantiene compatibilidad con endpoints existentes
3. **Frontend**: Mejora la experiencia de usuario sin romper funcionalidad existente
4. **Validaciones**: Se mantienen todas las validaciones de seguridad
