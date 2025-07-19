const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
  try {
    console.log('[AUTH MIDDLEWARE] Nueva petición recibida');
    console.log('[AUTH MIDDLEWARE] Método:', req.method);
    console.log('[AUTH MIDDLEWARE] URL:', req.originalUrl);
    console.log('[AUTH MIDDLEWARE] Headers:', req.headers);
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[AUTH MIDDLEWARE] No token provided or invalid format');
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    console.log('[AUTH MIDDLEWARE] Token recibido:', token);
    
    if (!token) {
      console.log('[AUTH MIDDLEWARE] No token provided');
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[AUTH MIDDLEWARE] Token decodificado:', decoded);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      console.log('[AUTH MIDDLEWARE] User not found');
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
    console.log('[AUTH MIDDLEWARE] Usuario autenticado:', req.user);
    next();
  } catch (error) {
    console.log('[AUTH MIDDLEWARE] Error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const roleMiddleware = (roles) => {
  return (req, res, next) => {
    console.log('[ROLE] Usuario:', req.user, 'Rol requerido:', roles);
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized role' });
    }
    next();
  };
};

module.exports = {
  authMiddleware,
  roleMiddleware
}; 