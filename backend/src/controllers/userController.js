const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Obtener todos los usuarios
const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

// Obtener un usuario por ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ message: 'Error al obtener usuario' });
  }
};

// Crear un nuevo usuario
const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validar que el rol sea válido
    if (!['ADMIN', 'OPERADOR', 'TECNICO'].includes(role)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }

    // Validar que el usuario que hace la petición tenga permisos
    if (req.user.role !== 'ADMIN' && req.user.role !== 'OPERADOR') {
      return res.status(403).json({ message: 'No tienes permisos para crear usuarios' });
    }

    // Validar que un operador no pueda crear administradores
    if (req.user.role === 'OPERADOR' && role === 'ADMIN') {
      return res.status(403).json({ message: 'No puedes crear usuarios administradores' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Si el usuario es técnico, crear también en Technician
    if (role === 'TECNICO') {
      await prisma.technician.create({
        data: {
          name,
          email,
        }
      });
    }

    res.status(201).json(user);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ message: 'Error al crear usuario' });
  }
};

// Actualizar un usuario
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;

    // Validar que el rol sea válido
    if (role && !['ADMIN', 'OPERADOR', 'TECNICO'].includes(role)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }

    // Validar que el usuario que hace la petición tenga permisos
    if (req.user.role !== 'ADMIN' && req.user.role !== 'OPERADOR') {
      return res.status(403).json({ message: 'No tienes permisos para actualizar usuarios' });
    }

    // Validar que un operador no pueda actualizar a administradores
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (req.user.role === 'OPERADOR' && existingUser.role === 'ADMIN') {
      return res.status(403).json({ message: 'No puedes modificar usuarios administradores' });
    }

    // Validar que un operador no pueda crear administradores
    if (req.user.role === 'OPERADOR' && role === 'ADMIN') {
      return res.status(403).json({ message: 'No puedes asignar el rol de administrador' });
    }

    const updateData = {
      name,
      email,
      role
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ message: 'Error al actualizar usuario' });
  }
};

// Eliminar un usuario
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que el usuario que hace la petición tenga permisos
    if (req.user.role !== 'ADMIN' && req.user.role !== 'OPERADOR') {
      return res.status(403).json({ message: 'No tienes permisos para eliminar usuarios' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Validar que un operador no pueda eliminar administradores
    if (req.user.role === 'OPERADOR' && existingUser.role === 'ADMIN') {
      return res.status(403).json({ message: 'No puedes eliminar usuarios administradores' });
    }

    // Validar que no se pueda eliminar el último administrador
    if (existingUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' }
      });

      if (adminCount <= 1) {
        return res.status(400).json({ message: 'No se puede eliminar el último administrador' });
      }
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
}; 