# Instrucciones para aplicar las migraciones de la base de datos

## Backend

1. Generar el cliente de Prisma:
```bash
cd backend
npx prisma generate
```

2. Crear y aplicar la migración:
```bash
npx prisma migrate dev --name add_workshop_repairs
```

O si estás en producción:
```bash
npx prisma migrate deploy
```

## Frontend

No requiere cambios en la base de datos, pero asegúrate de instalar las dependencias si es necesario:
```bash
cd frontend
npm install
```

## Verificar

1. Verifica que las tablas se hayan creado correctamente:
```sql
-- Verifica que existan las tablas Workshop y WorkshopRepair
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('Workshop', 'WorkshopRepair');
```

2. Inicia el servidor backend:
```bash
cd backend
npm run dev
```

3. Inicia el servidor frontend:
```bash
cd frontend
npm run dev
```

## Uso

1. Ve a http://localhost:3001/dashboard/workshops para administrar talleres
2. Desde la lista de servicios, cuando un servicio esté en estado "CON_REMITO", verás un botón con ícono de herramienta (🔧) para crear una "Reparación a Taller"
3. Ve a http://localhost:3001/dashboard/workshops/repairs para ver todas las reparaciones
