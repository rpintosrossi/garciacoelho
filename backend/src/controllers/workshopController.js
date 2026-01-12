const prisma = require('../lib/prisma');

// Obtener todos los talleres
const getWorkshops = async (req, res) => {
  try {
    const workshops = await prisma.workshop.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { workshopRepairs: true }
        }
      }
    });
    res.json(workshops);
  } catch (error) {
    console.error('Error obteniendo talleres:', error);
    res.status(500).json({ error: 'Error al obtener talleres' });
  }
};

// Crear taller
const createWorkshop = async (req, res) => {
  try {
    const { name, address, phone, contact } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre del taller es requerido' });
    }

    const workshop = await prisma.workshop.create({
      data: {
        name,
        address,
        phone,
        contact
      }
    });

    res.status(201).json(workshop);
  } catch (error) {
    console.error('Error creando taller:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un taller con ese nombre' });
    }
    res.status(500).json({ error: 'Error al crear taller' });
  }
};

// Actualizar taller
const updateWorkshop = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone, contact } = req.body;

    const workshop = await prisma.workshop.update({
      where: { id },
      data: {
        name,
        address,
        phone,
        contact
      }
    });

    res.json(workshop);
  } catch (error) {
    console.error('Error actualizando taller:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Taller no encontrado' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un taller con ese nombre' });
    }
    res.status(500).json({ error: 'Error al actualizar taller' });
  }
};

// Eliminar taller
const deleteWorkshop = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si tiene reparaciones asociadas
    const repairCount = await prisma.workshopRepair.count({
      where: { workshopId: id }
    });

    if (repairCount > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el taller porque tiene reparaciones asociadas' 
      });
    }

    await prisma.workshop.delete({
      where: { id }
    });

    res.json({ message: 'Taller eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando taller:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Taller no encontrado' });
    }
    res.status(500).json({ error: 'Error al eliminar taller' });
  }
};

module.exports = {
  getWorkshops,
  createWorkshop,
  updateWorkshop,
  deleteWorkshop
};
