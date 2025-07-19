# Funcionalidad de Descuentos en Pagos

## Descripción
Se ha agregado la funcionalidad para registrar pagos con descuentos (coimas) que afectan la deuda total pero quedan registrados como pagos parciales.

## Campos Nuevos en el Modelo Payment

- `originalAmount`: Monto original antes del descuento
- `discount`: Monto del descuento aplicado
- `discountReason`: Razón del descuento (ej: "coima", "descuento comercial", etc.)

## API Endpoints

### Crear Pago con Descuento
**POST** `/api/payments`

```json
{
  "amount": 90000,           // Monto final a pagar
  "originalAmount": 100000,  // Monto original antes del descuento
  "discount": 10000,         // Monto del descuento
  "discountReason": "coima", // Razón del descuento
  "date": "2024-01-15",
  "paymentMethodId": "uuid-del-metodo-pago",
  "docsToAssociate": [
    {
      "id": "uuid-factura",
      "type": "FACTURA",
      "amount": 90000
    }
  ]
}
```

### Obtener Pagos con Información de Descuentos
**GET** `/api/payments`

Retorna todos los pagos con información adicional de descuentos:
- `hasDiscount`: Boolean que indica si tiene descuento
- `discountPercentage`: Porcentaje de descuento calculado
- `originalAmount`: Monto original
- `discount`: Monto del descuento
- `discountReason`: Razón del descuento

## Ejemplo de Uso

### Escenario: Administrador paga con descuento
1. Se genera una factura por $100,000
2. El administrador paga $90,000 con descuento de $10,000
3. Se registra el pago con:
   - `amount`: 90000
   - `originalAmount`: 100000
   - `discount`: 10000
   - `discountReason`: "coima"

### En la Cuenta Corriente
- La factura aparece como pagada por $90,000
- Se muestra información del descuento en los movimientos
- El saldo queda en $0 (factura pagada completamente)

## Validaciones

1. **Monto Final**: `amount` debe ser igual a `originalAmount - discount`
2. **Descuento Positivo**: `discount` debe ser mayor a 0 si se especifica
3. **Suma de Documentos**: La suma de montos aplicados no puede superar el monto final

## Migración de Base de Datos

Para aplicar los cambios al esquema:

```bash
cd backend
npx prisma migrate dev --name add_payment_discount_fields
```

## Notas Importantes

- Los descuentos se aplican al pago completo, no a documentos individuales
- La información de descuento se muestra en los movimientos de cuenta corriente
- Los descuentos no afectan el cálculo de saldos, solo se registran para auditoría
- Se mantiene trazabilidad completa de montos originales vs. montos pagados 