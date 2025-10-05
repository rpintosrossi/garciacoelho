# Fix: Error 500 en Railway - Queries de Prisma con OR vacíos

## Problema

Después del deploy en Railway, varios endpoints estaban devolviendo errores 500:
- `/api/buildings`
- `/api/administrators`
- Dashboard endpoints
- Reports endpoints

## Causa

El problema se debía a queries de Prisma que usaban cláusulas `OR` con arrays que podían estar vacíos. Por ejemplo:

```javascript
// ❌ INCORRECTO - Falla cuando invoiceIds o remitoIds están vacíos
const paymentDocs = await prisma.paymentDocument.findMany({
  where: {
    OR: [
      { invoiceId: { in: invoiceIds } },
      { remitoId: { in: remitoIds } }
    ]
  }
});
```

Cuando la base de datos está vacía o no hay datos, `invoiceIds` y `remitoIds` son arrays vacíos `[]`, lo que causa que Prisma genere un error SQL inválido.

## Solución

Se agregaron validaciones para verificar que los arrays no estén vacíos antes de hacer el query:

```javascript
// ✅ CORRECTO - Valida arrays antes de hacer el query
const invoiceIds = allServices.map(s => s.invoice?.id).filter(Boolean);
const remitoIds = allServices.flatMap(s => s.remitos.map(r => r.id));

const allPaymentDocs = (invoiceIds.length > 0 || remitoIds.length > 0) 
  ? await prisma.paymentDocument.findMany({
      where: {
        OR: [
          ...(invoiceIds.length > 0 ? [{ invoiceId: { in: invoiceIds } }] : []),
          ...(remitoIds.length > 0 ? [{ remitoId: { in: remitoIds } }] : [])
        ]
      },
      include: { payment: true }
    })
  : [];
```

## Archivos Modificados

1. **backend/src/controllers/buildingController.js**
   - `getBuildings()` - línea ~38
   - `getBuildingAccountMovements()` - línea ~457

2. **backend/src/controllers/administratorController.js**
   - `getAdministrators()` - línea ~67
   - `getBuildingsBalances()` - línea ~319

3. **backend/src/controllers/dashboardController.js**
   - `getDashboardData()` - línea ~75
   - `getDashboardData()` - línea ~196 (dentro del loop)

4. **backend/src/controllers/reportController.js**
   - `getDebtReport()` - línea ~40
   - `getCollectionReport()` - línea ~169

## Beneficios

- ✅ Evita errores cuando la base de datos está vacía
- ✅ Evita queries SQL inválidos
- ✅ Mejora el manejo de casos edge
- ✅ Funciona correctamente en Railway con bases de datos nuevas

## Para Deployar

1. Hacer commit de los cambios:
```bash
git add .
git commit -m "Fix: Corregir queries de Prisma con OR vacíos que causaban errores 500"
```

2. Push a Railway:
```bash
git push origin main
```

3. Railway detectará automáticamente los cambios y hará redeploy.

