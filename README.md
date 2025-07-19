# Garcia Coelho - Sistema de Gestión

## 🚀 Despliegue en Railway

### Estructura del Proyecto
```
GarciaCoelho/
├── backend/          # API Node.js + Express + Prisma
└── frontend/         # Frontend Next.js + Material-UI
```

### 📋 Pasos para Desplegar en Railway

#### 1. Preparar el Repositorio
- Asegúrate de que todos los cambios estén committeados
- Sube el código a GitHub

#### 2. Crear Proyecto en Railway
1. Ve a [railway.app](https://railway.app)
2. Inicia sesión con GitHub
3. Crea un nuevo proyecto
4. Selecciona "Deploy from GitHub repo"

#### 3. Configurar Backend
1. En Railway, crea un nuevo servicio
2. Selecciona el repositorio
3. Configura la carpeta raíz como `backend`
4. Agrega las variables de entorno:
   ```
   DATABASE_URL=tu_url_de_postgresql
   JWT_SECRET=tu_secret_key
   PORT=3000
   CORS_ORIGIN=https://tu-frontend-url.railway.app
   ```

#### 4. Configurar Base de Datos
1. En Railway, agrega un servicio PostgreSQL
2. Copia la URL de conexión
3. Configura la variable `DATABASE_URL` en el backend
4. Ejecuta las migraciones:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

#### 5. Configurar Frontend
1. Crea otro servicio en Railway
2. Selecciona el mismo repositorio
3. Configura la carpeta raíz como `frontend`
4. Agrega las variables de entorno:
   ```
   NEXT_PUBLIC_API_URL=https://tu-backend-url.railway.app/api
   NEXT_PUBLIC_APP_URL=https://tu-frontend-url.railway.app
   ```

#### 6. Configurar Dominios
1. En cada servicio, ve a "Settings" → "Domains"
2. Railway asignará URLs automáticamente
3. Actualiza las variables de entorno con las URLs correctas

### 🔧 Variables de Entorno

#### Backend (.env)
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="tu-secret-key"
PORT=3000
CORS_ORIGIN="https://tu-frontend-url.railway.app"
```

#### Frontend (.env)
```env
NEXT_PUBLIC_API_URL="https://tu-backend-url.railway.app/api"
NEXT_PUBLIC_APP_URL="https://tu-frontend-url.railway.app"
```

### 📝 Comandos Útiles

#### Backend
```bash
# Instalar dependencias
npm install

# Ejecutar migraciones
npx prisma migrate deploy
npx prisma generate

# Iniciar en desarrollo
npm run dev

# Iniciar en producción
npm start
```

#### Frontend
```bash
# Instalar dependencias
npm install

# Construir para producción
npm run build

# Iniciar en desarrollo
npm run dev

# Iniciar en producción
npm start
```

### 🌐 URLs de Producción
- **Frontend**: `https://tu-frontend-url.railway.app`
- **Backend**: `https://tu-backend-url.railway.app`
- **API**: `https://tu-backend-url.railway.app/api`

### 🔍 Troubleshooting

#### Problemas Comunes:
1. **Error de CORS**: Verifica que `CORS_ORIGIN` apunte a la URL correcta del frontend
2. **Error de Base de Datos**: Asegúrate de que las migraciones se ejecutaron correctamente
3. **Error de Build**: Verifica que todas las dependencias estén en `package.json`

#### Logs:
- Revisa los logs en Railway Dashboard
- Los logs te ayudarán a identificar problemas específicos

### 📞 Soporte
Si tienes problemas, revisa:
1. Los logs en Railway Dashboard
2. La configuración de variables de entorno
3. La conectividad entre servicios 