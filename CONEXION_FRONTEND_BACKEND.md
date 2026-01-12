# Instrucciones para Solucionar el Problema de Conexión

## El problema
El frontend no está conectando con el backend porque las variables de entorno de Next.js no se han cargado.

## Solución

### 1. Detener completamente el servidor frontend
Presiona `Ctrl+C` en la terminal donde está corriendo el frontend (si aún está corriendo)

### 2. Limpiar el cache de Next.js
```bash
cd frontend
Remove-Item -Recurse -Force .next
```

### 3. Reiniciar el servidor frontend
```bash
npm run dev
```

### 4. Verificar que el backend esté corriendo
En otra terminal:
```bash
cd backend
npm run dev
```

## Verificar la configuración

Abre la consola del navegador (F12) y verifica que veas:
```
[AXIOS] Realizando petición: { method: 'post', url: '/auth/login', ... }
```

Debería conectarse a `http://localhost:3000/api`

## Si sigue sin funcionar

Verifica que el archivo `.env.local` esté en la raíz de la carpeta `frontend`:
```
frontend/
  .env.local    <- Debe estar aquí
  src/
  package.json
  ...
```

El contenido de `.env.local` debe ser:
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

**IMPORTANTE**: Las variables que empiezan con `NEXT_PUBLIC_` solo se cargan al iniciar el servidor de Next.js. Por eso es necesario reiniciar completamente.
