const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los técnicos
const getAllTechnicians = async (req, res) => {
  try {
    console.log('Buscando técnicos...');
    const technicians = await prisma.technician.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
      },
      where: {
        status: 'ACTIVE',
      },
    });
    console.log('Técnicos encontrados:', technicians);
    res.json(technicians);
  } catch (error) {
    console.error('Error al obtener técnicos:', error);
    res.status(500).json({ message: 'Error al obtener técnicos' });
  }
};

// Obtener un técnico por ID
const getTechnicianById = async (req, res) => {
  try {
    const { id } = req.params;
    const technician = await prisma.technician.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
      },
    });

    if (!technician) {
      return res.status(404).json({ message: 'Técnico no encontrado' });
    }

    res.json(technician);
  } catch (error) {
    console.error('Error al obtener técnico:', error);
    res.status(500).json({ message: 'Error al obtener técnico' });
  }
};

// Crear un nuevo técnico
const createTechnician = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Verificar si el email ya está registrado
    const existingTechnician = await prisma.technician.findUnique({
      where: { email },
    });

    if (existingTechnician) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    const technician = await prisma.technician.create({
      data: {
        name,
        email,
        phone,
        status: 'ACTIVE',
      },
    });

    res.status(201).json(technician);
  } catch (error) {
    console.error('Error al crear técnico:', error);
    res.status(500).json({ message: 'Error al crear técnico' });
  }
};

// Actualizar un técnico
const updateTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, status } = req.body;

    // Verificar si el técnico existe
    const existingTechnician = await prisma.technician.findUnique({
      where: { id },
    });

    if (!existingTechnician) {
      return res.status(404).json({ message: 'Técnico no encontrado' });
    }

    // Si se está cambiando el email, verificar que no esté en uso
    if (email && email !== existingTechnician.email) {
      const emailExists = await prisma.technician.findUnique({
        where: { email },
      });

      if (emailExists) {
        return res.status(400).json({ message: 'El email ya está registrado' });
      }
    }

    const technician = await prisma.technician.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        status,
      },
    });

    res.json(technician);
  } catch (error) {
    console.error('Error al actualizar técnico:', error);
    res.status(500).json({ message: 'Error al actualizar técnico' });
  }
};

// Eliminar un técnico (soft delete)
const deleteTechnician = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el técnico existe
    const existingTechnician = await prisma.technician.findUnique({
      where: { id },
    });

    if (!existingTechnician) {
      return res.status(404).json({ message: 'Técnico no encontrado' });
    }

    // Realizar soft delete cambiando el estado
    const technician = await prisma.technician.update({
      where: { id },
      data: {
        status: 'INACTIVE',
      },
    });

    res.json({ message: 'Técnico eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar técnico:', error);
    res.status(500).json({ message: 'Error al eliminar técnico' });
  }
};

module.exports = {
  getAllTechnicians,
  getTechnicianById,
  createTechnician,
  updateTechnician,
  deleteTechnician,
}; 