const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
  try {
    // Solo log en desarrollo y para rutas importantes
    if (process.env.NODE_ENV === 'development' && 
        (req.originalUrl.includes('/auth/me') || req.originalUrl.includes('/auth/login'))) {
      console.log('[AUTH MIDDLEWARE] Petición:', req.method, req.originalUrl);
    }
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    // Si el usuario es técnico, buscar su id en la tabla Technician y agregarlo a req.user
    if (user.role === 'TECNICO') {
      const technician = await prisma.technician.findUnique({ where: { email: user.email } });
      if (technician) {
        req.user.technicianId = technician.id;
      }
    }
    next();
  } catch (error) {
    console.error('[AUTH MIDDLEWARE] Error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    res.status(500).json({ message: 'Error en la autenticación' });
  }
};

const roleMiddleware = (roles) => {
  return (req, res, next) => {
    // Solo log en desarrollo y cuando hay un error de autorización
    if (!roles.includes(req.user.role)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ROLE] Acceso denegado - Usuario:', req.user.email, 'Rol:', req.user.role, 'Requerido:', roles);
      }
      return res.status(403).json({ message: 'Unauthorized role' });
    }
    next();
  };
};

module.exports = { authMiddleware, roleMiddleware }; 