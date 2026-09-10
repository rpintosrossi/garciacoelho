# Facturación electrónica AFIP — Homologación y producción

## Componentes

1. **afip-service** (repo aparte en `Proyectos/afip-service`, Railway): obtiene CAE vía WSAA/WSFE con certificados PEM.
2. **backend GarciaCoelho** (Railway): arma el comprobante, llama al servicio, genera PDF y guarda `Invoice`.
3. **frontend** (Vercel): botón **Facturación Electrónica** en servicios con remito.

## 1. Desplegar afip-service en Railway

1. Crear un repo/servicio Railway desde `C:\Users\RP.Escritorio\Proyectos\afip-service` (Dockerfile incluido).
2. Variables:
   - `API_KEY`
   - `ADMIN_API_KEY`
   - `DATABASE_URL` (recomendado Postgres de Railway)
3. Verificar `GET /health`.

## 2. Registrar issuer (homologación)

Convertí tus certificados a PEM si hace falta y corré:

```bash
cd C:\Users\RP.Escritorio\Proyectos\afip-service
npm start   # local, o usá la URL de Railway

node scripts/register-issuer.js \
  --url=https://TU-AFIP-SERVICE.up.railway.app \
  --cuit=TU_CUIT \
  --ambiente=H \
  --pv=TU_PUNTO_VENTA \
  --cert=./certs/cert.pem \
  --key=./certs/key.pem \
  --razonSocial="Garcia Coelho" \
  --domicilio="Tu domicilio" \
  --condicionIva="IVA Responsable Inscripto"
```

## 3. Probar emisión AFIP

```bash
cd C:\Users\RP.Escritorio\Proyectos\afip-service
node scripts/test-generar.js \
  --cuit=TU_CUIT \
  --pv=TU_PUNTO_VENTA \
  --total=1210
```

Respuesta esperada: `cae`, `fechaVencimiento`, `numeroComprobante`.

## 4. Configurar backend GarciaCoelho

Variables de entorno:

```
AFIP_SERVICE_URL=https://TU-AFIP-SERVICE.up.railway.app
AFIP_SERVICE_API_KEY=la-misma-API_KEY
AFIP_CUIT_EMISOR=TU_CUIT
AFIP_PUNTO_VENTA=TU_PUNTO_VENTA
AFIP_RAZON_SOCIAL=Garcia Coelho
AFIP_DOMICILIO=...
AFIP_CONDICION_IVA=IVA Responsable Inscripto
AFIP_INGRESOS_BRUTOS=...
AFIP_INICIO_ACTIVIDADES=01/01/2020
AFIP_MODO_HOMOLOGACION=true
```

Aplicar migración Prisma:

```bash
cd backend
npx prisma migrate deploy
```

## 5. Probar desde la UI

1. Ir a Servicios → Con remito.
2. Click **Facturación Electrónica**.
3. Revisar datos / montos → **Emitir factura AFIP**.
4. Debe quedar el servicio en `FACTURADO` con PDF y CAE.

## 6. Pasar a producción

1. Registrar issuer con `--ambiente=P` y certificados productivos.
2. En backend: `AFIP_MODO_HOMOLOGACION=false`.
3. Verificar punto de venta habilitado en AFIP producción.
4. Emitir una factura de prueba de bajo monto.
