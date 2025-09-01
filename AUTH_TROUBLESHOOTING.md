# Solución de Problemas de Autenticación - Garcia Coelho

## Error 401: Request failed with status code 401

### Problema Identificado
El sistema está devolviendo un error 401 (Unauthorized) al intentar hacer login.

### Posibles Causas y Soluciones

#### 1. **Servidor Backend No Ejecutándose**
**Síntomas:**
- Error de conexión
- Timeout en las peticiones

**Solución:**
```bash
# En el directorio backend
cd backend
npm run dev
```

**Verificar que el servidor esté corriendo en:**
- http://localhost:3000

#### 2. **Credenciales Incorrectas**
**Síntomas:**
- Error 401 con mensaje "Credenciales inválidas"

**Credenciales de Prueba Creadas:**
```
Email: admin@admin.com
Password: 123456
```

**Para crear un nuevo usuario:**
```bash
cd backend
node scripts/create-admin.js
```

#### 3. **Problema con JWT_SECRET**
**Síntomas:**
- Error 401 con mensaje "Token inválido"

**Solución:**
Verificar que el archivo `.env` en el backend tenga:
```env
JWT_SECRET="tu-clave-secreta-aqui"
```

#### 4. **Problema de CORS**
**Síntomas:**
- Error de CORS en el navegador
- Peticiones bloqueadas

**Solución:**
Verificar que en `backend/env.example` esté:
```env
CORS_ORIGIN="http://localhost:3001"
```

#### 5. **Problema de Base de Datos**
**Síntomas:**
- Error 500 en el servidor
- Usuarios no encontrados

**Solución:**
```bash
# Verificar conexión a la base de datos
cd backend
npx prisma db push

# Crear usuario de prueba
node scripts/create-admin.js
```

### Pasos de Diagnóstico

#### Paso 1: Verificar Servidor Backend
```bash
# Terminal 1
cd backend
npm run dev
```

#### Paso 2: Verificar Frontend
```bash
# Terminal 2
cd frontend
npm run dev
```

#### Paso 3: Probar Login
1. Ir a http://localhost:3001/login
2. Usar credenciales: admin@admin.com / 123456
3. Verificar logs en la consola del navegador

#### Paso 4: Verificar Logs
**Backend logs deberían mostrar:**
```
[AUTH] Iniciando proceso de login para: admin@admin.com
[AUTH] Login exitoso para usuario: admin@admin.com
```

**Frontend logs deberían mostrar:**
```
[AUTH] Intentando login para: admin@admin.com
[AUTH] Login exitoso para: admin@admin.com
[LOGIN] Login exitoso, redirigiendo...
```

### Comandos de Verificación

#### Verificar Usuarios en Base de Datos
```bash
cd backend
npx prisma studio
```

#### Probar Endpoint de Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"123456"}'
```

#### Verificar Variables de Entorno
```bash
# Backend
cd backend
echo $JWT_SECRET
echo $DATABASE_URL

# Frontend
cd frontend
echo $NEXT_PUBLIC_API_URL
```

### Configuración Recomendada

#### Backend (.env)
```env
DATABASE_URL="postgresql://username:password@localhost:5432/garcia_coelho"
JWT_SECRET="tu-clave-secreta-muy-segura-aqui"
PORT=3000
CORS_ORIGIN="http://localhost:3001"
BACKEND_URL="http://localhost:3000"
NODE_ENV="development"
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
NEXT_PUBLIC_APP_URL="http://localhost:3001"
```

### Logs Mejorados

Se han agregado logs detallados para facilitar el diagnóstico:

**Backend:**
- `[AUTH]` - Proceso de autenticación
- `[AUTH MIDDLEWARE]` - Middleware de autenticación

**Frontend:**
- `[AUTH]` - Contexto de autenticación
- `[LOGIN]` - Página de login
- `[AXIOS]` - Peticiones HTTP

### Próximos Pasos

1. **Verificar que ambos servidores estén ejecutándose**
2. **Usar las credenciales de prueba creadas**
3. **Revisar los logs en la consola del navegador**
4. **Verificar la configuración de variables de entorno**

### Contacto

Si el problema persiste después de seguir estos pasos, revisar:
- Logs del servidor backend
- Logs de la consola del navegador
- Configuración de red/firewall
- Estado de la base de datos PostgreSQL
