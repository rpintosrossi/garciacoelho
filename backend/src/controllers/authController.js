const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

const login = async (req, res) => {
  try {
    console.log('[AUTH] Iniciando proceso de login');
    console.log('[AUTH] Body recibido:', req.body);
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('[AUTH] Error: Email o password faltante');
      return res.status(400).json({ 
        message: 'Email y contraseña son requeridos',
        type: 'VALIDATION_ERROR'
      });
    }

    console.log('[AUTH] Buscando usuario con email:', email);
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('[AUTH] Usuario no encontrado');
      return res.status(401).json({ 
        message: 'No existe un usuario con ese email',
        type: 'USER_NOT_FOUND'
      });
    }

    console.log('[AUTH] Usuario encontrado, verificando contraseña');
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      console.log('[AUTH] Contraseña incorrecta');
      return res.status(401).json({ 
        message: 'Contraseña incorrecta',
        type: 'INVALID_PASSWORD'
      });
    }

    console.log('[AUTH] Contraseña válida, generando token');
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('[AUTH] Login exitoso para usuario:', user.email);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[AUTH] Error en login:', error);
    res.status(500).json({ 
      message: 'Error en el servidor',
      type: 'SERVER_ERROR'
    });
  }
};

const register = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'OPERADOR'
      }
    });

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = {
  login,
  register
}; 