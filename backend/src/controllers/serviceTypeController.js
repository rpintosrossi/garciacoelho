const prisma = require('../lib/prisma');

// Obtener todos los tipos de servicio
const getAllServiceTypes = async (req, res) => {
  try {
    const serviceTypes = await prisma.serviceType.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    res.json(serviceTypes);
  } catch (error) {
    console.error('Error al obtener tipos de servicio:', error);
    res.status(500).json({ message: 'Error al obtener tipos de servicio' });
  }
};

// Crear un nuevo tipo de servicio
const createServiceType = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Verificar si ya existe
    const existing = await prisma.serviceType.findUnique({
      where: { name }
    });

    if (existing) {
      return res.status(400).json({ message: 'Ya existe un tipo de servicio con ese nombre' });
    }

    const serviceType = await prisma.serviceType.create({
      data: {
        name,
        description
      }
    });

    res.status(201).json(serviceType);
  } catch (error) {
    console.error('Error al crear tipo de servicio:', error);
    res.status(500).json({ message: 'Error al crear tipo de servicio' });
  }
};

// Actualizar un tipo de servicio
const updateServiceType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const serviceType = await prisma.serviceType.update({
      where: { id },
      data: {
        name,
        description
      }
    });

    res.json(serviceType);
  } catch (error) {
    console.error('Error al actualizar tipo de servicio:', error);
    res.status(500).json({ message: 'Error al actualizar tipo de servicio' });
  }
};

// Eliminar un tipo de servicio
const deleteServiceType = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.serviceType.delete({
      where: { id }
    });

    res.json({ message: 'Tipo de servicio eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar tipo de servicio:', error);
    res.status(500).json({ message: 'Error al eliminar tipo de servicio' });
  }
};

module.exports = {
  getAllServiceTypes,
  createServiceType,
  updateServiceType,
  deleteServiceType
};
