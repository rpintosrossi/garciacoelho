# 🔧 Manual de Usuario - Módulo de Reparaciones en Talleres

## Descripción General
El módulo de Reparaciones en Talleres permite gestionar el envío de equipos porteros a talleres externos para su reparación, llevando un control detallado de costos, precios, fechas y estados de pago.

---

## 📋 Índice
1. [Gestión de Talleres](#gestión-de-talleres)
2. [Crear Reparación desde un Servicio](#crear-reparación-desde-un-servicio)
3. [Ver y Editar Reparaciones](#ver-y-editar-reparaciones)
4. [Reportes y Seguimiento](#reportes-y-seguimiento)

---

## 1. Gestión de Talleres

### Acceder a Talleres
1. Inicia sesión en el sistema
2. En el menú lateral, haz clic en **"Talleres"** 🔧

### Crear Nuevo Taller
1. Haz clic en el botón **"Nuevo Taller"**
2. Completa los campos:
   - **Nombre*** (requerido): Nombre del taller
   - **Dirección**: Dirección física del taller
   - **Teléfono**: Número de contacto
   - **Contacto**: Nombre de la persona de contacto
3. Haz clic en **"Crear"**

### Editar Taller
1. En la lista de talleres, haz clic en el ícono ✏️ (editar)
2. Modifica los campos necesarios
3. Haz clic en **"Guardar"**

### Eliminar Taller
1. Haz clic en el ícono 🗑️ (eliminar) junto al taller
2. Confirma la eliminación
   
   ⚠️ **Nota**: Solo se pueden eliminar talleres que no tengan reparaciones asociadas

---

## 2. Crear Reparación desde un Servicio

### Requisitos Previos
- El servicio debe estar en estado **"Con Remito"**

### Proceso de Creación
1. Ve a **Dashboard > Servicios**
2. Busca el servicio que necesita ir a taller
3. Verifica que el estado sea **"Con Remito"**
4. Haz clic en el botón 🔧 **"Reparación a Taller"**

### Completar Formulario de Reparación

El modal mostrará los siguientes campos:

#### Campos Auto-completados
- **Dirección del Edificio**: Se completa automáticamente con la dirección del edificio asociado al servicio
- **Marca del Portero**: Se completa con el tipo de portero del edificio (puedes editarlo si es necesario)
- **Fecha Visita**: Se completa con la fecha de visita del servicio

#### Campos a Completar

**Taller** (requerido)
- Selecciona un taller de la lista desplegable
- O haz clic en el botón **"+"** para crear un taller nuevo rápidamente

**Costos** (opcionales - se pueden completar después)
- **Costo Taller**: Monto que cobra el taller por la reparación
- **Precio a Cliente**: Monto que se le cobra al cliente

**Fechas** (opcionales - se pueden completar después)
- **Fecha Ingreso al Taller**: Cuando se envió el equipo al taller
- **Fecha de Instalación**: Cuando se reinstalará el equipo reparado

**Estado de Pago**
- ☑️ **Pagado**: Marca si el pago al taller ya se realizó

### Crear Taller Rápido desde el Modal
1. En el campo "Taller", haz clic en el botón **"+"**
2. Se abrirá un mini-formulario
3. Completa el nombre del taller (mínimo)
4. Haz clic en **"Crear"**
5. El taller nuevo se seleccionará automáticamente

---

## 3. Ver y Editar Reparaciones

### Acceder al Listado de Reparaciones
Hay dos formas:

**Opción 1**: Desde el menú de Talleres
1. Ve a **Dashboard > Talleres**
2. Haz clic en **"Ver Reparaciones"**

**Opción 2**: Directamente
1. Ve a **Dashboard > Talleres > Reparaciones**

### Filtrar Reparaciones por Estado de Pago
En la parte superior de la tabla verás 3 pestañas:
- **Todas**: Muestra todas las reparaciones
- **Pagadas**: Solo reparaciones con pago completado
- **Pendientes de Pago**: Reparaciones sin pagar

### Información Mostrada en la Tabla
- Edificio y descripción del servicio
- Dirección del edificio
- Taller asignado
- Marca del portero
- Costo del taller
- Precio al cliente
- Fecha de visita
- Fecha de ingreso al taller
- Fecha de instalación
- Estado de pago (Pagado/Pendiente)

### Editar Reparación
1. Haz clic en el ícono ✏️ (editar) en la fila de la reparación
2. Modifica los campos necesarios:
   - Cambiar taller
   - Actualizar costos
   - Completar fechas
   - Marcar como pagado
3. Haz clic en **"Guardar"**

---

## 4. Reportes y Seguimiento

### Información en Tiempo Real

**En la página de Talleres**:
- Columna **"Reparaciones"**: muestra cuántas reparaciones tiene cada taller

**En la página de Reparaciones**:
- **Rentabilidad**: Compara el "Costo Taller" vs "Precio Cliente" para ver el margen
- **Estado de pago**: Identifica rápidamente qué reparaciones tienen pagos pendientes

### Tips de Uso

✅ **Mejores Prácticas**:
1. Crea los talleres más usados al inicio
2. Completa la información básica de la reparación inmediatamente
3. Actualiza costos y fechas cuando tengas la información
4. Marca como "Pagado" cuando se realice el pago al taller
5. Usa las pestañas de filtro para ver rápidamente lo pendiente

⚠️ **Importante**:
- Solo servicios en estado "Con Remito" pueden ir a taller
- Los costos y precios son opcionales, pero útiles para tracking
- Las fechas ayudan a hacer seguimiento del proceso
- No puedes eliminar un taller que tenga reparaciones asociadas

---

## 🎯 Casos de Uso Comunes

### Caso 1: Portero dañado que va a taller
1. Crea el servicio normalmente
2. Genera el remito (el servicio pasa a "Con Remito")
3. Desde servicios, haz clic en 🔧 para crear la reparación
4. Selecciona el taller
5. Cuando el taller te de el presupuesto, edita la reparación y completa los costos
6. Cuando instales el equipo, marca la fecha de instalación
7. Cuando pagues al taller, marca como "Pagado"

### Caso 2: Buscar reparaciones de un taller específico
1. Ve a Dashboard > Talleres > Reparaciones
2. Usa Ctrl+F o la búsqueda del navegador
3. Busca por nombre del taller

### Caso 3: Ver reparaciones pendientes de pago
1. Ve a Dashboard > Talleres > Reparaciones
2. Haz clic en la pestaña **"Pendientes de Pago"**
3. Verás solo las reparaciones sin pagar

---

## ❓ Preguntas Frecuentes

**P: ¿Puedo crear una reparación para un servicio pendiente?**  
R: No, el servicio debe estar en estado "Con Remito" para poder crear una reparación.

**P: ¿Qué pasa si me equivoco de taller?**  
R: Puedes editar la reparación y cambiar el taller asignado.

**P: ¿Es obligatorio completar los costos?**  
R: No, los costos son opcionales. Puedes agregarlos después cuando tengas la información.

**P: ¿Puedo eliminar una reparación?**  
R: Actualmente no está implementado en la UI, pero se puede hacer desde el backend si es necesario.

**P: ¿Cómo sé qué reparaciones están listas?**  
R: Verifica la fecha de instalación. Si está completa, significa que ya se instaló el equipo reparado.

---

## 📞 Soporte
Si tienes problemas o sugerencias sobre el módulo de Reparaciones en Talleres, contacta al administrador del sistema.
