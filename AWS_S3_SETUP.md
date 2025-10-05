# Configuración de AWS S3 para Almacenamiento de Archivos

Este proyecto soporta almacenamiento de archivos tanto en el servidor local como en AWS S3. 

## Configuración

### 1. Variables de Entorno

Para habilitar el almacenamiento en S3, configura las siguientes variables en tu archivo `.env`:

```env
# Habilitar S3 (cambiar a true para usar S3)
USE_S3=true

# Credenciales de AWS
AWS_ACCESS_KEY_ID=tu_access_key_id
AWS_SECRET_ACCESS_KEY=tu_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=nombre-de-tu-bucket
```

### 2. Crear un Bucket en AWS S3

1. Inicia sesión en la [Consola de AWS](https://console.aws.amazon.com/)
2. Navega a S3
3. Crea un nuevo bucket con las siguientes configuraciones:
   - **Nombre del bucket**: Un nombre único (ej: `garciacoelho-uploads`)
   - **Región**: Elige la región más cercana a tus usuarios
   - **Object Ownership**: ACLs disabled (recommended) - DEJAR POR DEFECTO
   - **Block Public Access**: Desmarcar "Block all public access" (necesario para archivos públicos)
   - **Versioning**: Opcional
   - **Tags**: Opcional

⚠️ **IMPORTANTE**: No habilites ACLs. AWS recomienda usar políticas de bucket en lugar de ACLs.

### 3. Configurar Permisos del Bucket

#### Política del Bucket (Bucket Policy)

**⚠️ PASO CRÍTICO**: Para permitir acceso público de lectura a los archivos subidos, agrega esta política al bucket:

1. En la consola de S3, ve a tu bucket
2. Click en la pestaña "Permissions"
3. Scroll hasta "Bucket policy" y click en "Edit"
4. Pega la siguiente política (reemplaza `nombre-de-tu-bucket` con tu bucket real):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::nombre-de-tu-bucket/*"
        }
    ]
}
```

5. Click en "Save changes"

Esta política permite que cualquier persona pueda **leer** (GET) los archivos del bucket, pero solo tu aplicación puede **escribir** (PUT) archivos usando las credenciales de AWS.

#### CORS Configuration

Para permitir que tu frontend acceda a los archivos:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"]
    }
]
```

### 4. Crear Usuario IAM

1. Ve a IAM en la consola de AWS
2. Crea un nuevo usuario con acceso programático
3. Adjunta la política `AmazonS3FullAccess` o crea una política personalizada:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::nombre-de-tu-bucket/*"
        },
        {
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::nombre-de-tu-bucket"
        }
    ]
}
```

4. Guarda las credenciales (Access Key ID y Secret Access Key)

### 5. Estructura del Código

El sistema está configurado para cambiar automáticamente entre almacenamiento local y S3 según la variable `USE_S3`:

- **USE_S3=false**: Los archivos se guardan en la carpeta `uploads/` del servidor
- **USE_S3=true**: Los archivos se suben a AWS S3

#### Archivos Modificados

1. **`backend/src/config/s3.js`**: Configuración del cliente S3
2. **`backend/src/middleware/upload.js`**: Middleware de multer que soporta S3 y local
3. **`backend/src/utils/fileUtils.js`**: Utilidades para generar URLs correctas
4. **`backend/src/routes/serviceRoutes.js`**: Usa el middleware unificado

### 6. Migración de Archivos Existentes

Si ya tienes archivos en almacenamiento local y quieres migrarlos a S3:

```bash
# Usar AWS CLI
aws s3 sync ./uploads s3://nombre-de-tu-bucket/

# O usar un script de migración personalizado
```

### 7. Ventajas de Usar S3

- **Escalabilidad**: No hay límite de almacenamiento
- **Durabilidad**: 99.999999999% de durabilidad de datos
- **Disponibilidad**: Alta disponibilidad global
- **CDN**: Fácil integración con CloudFront para entrega rápida
- **Costos**: Pago por uso, generalmente más económico para grandes volúmenes
- **Backup**: No necesitas preocuparte por backups del servidor

### 8. Costos Estimados

Para un proyecto pequeño a mediano:
- Almacenamiento: ~$0.023 por GB/mes
- Transferencia: Primeros 100 GB gratis, luego ~$0.09 por GB
- Solicitudes: ~$0.005 por 1,000 solicitudes GET

### 9. Solución de Problemas

**Error: "Access Denied"**
- Verifica que las credenciales sean correctas
- Verifica que el usuario IAM tenga los permisos necesarios
- Verifica la política del bucket

**Archivos no accesibles públicamente**
- Verifica que "Block Public Access" esté desactivado
- Verifica la política del bucket (debe permitir GetObject público)
- El sistema NO usa ACLs, usa políticas de bucket

**URLs incorrectas**
- Verifica que `AWS_REGION` y `AWS_S3_BUCKET` sean correctos
- Verifica que `USE_S3=true` esté configurado

### 10. Seguridad

- **Nunca** subas credenciales de AWS al repositorio
- Usa variables de entorno para las credenciales
- Considera usar AWS IAM Roles si estás en EC2 o ECS
- Implementa límites de tamaño de archivo
- Valida tipos de archivo en el servidor

## Contacto

Para dudas sobre la configuración, contacta al equipo de desarrollo.

