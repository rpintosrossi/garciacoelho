const prisma = require('../lib/prisma');

// Obtener todas las reparaciones
const getWorkshopRepairs = async (req, res) => {
  try {
    const { serviceId } = req.query;

    const where = serviceId ? { serviceId } : {};

    const repairs = await prisma.workshopRepair.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        service: {
          include: {
            building: true
          }
        },
        workshop: true
      }
    });

    res.json(repairs);
  } catch (error) {
    console.error('Error obteniendo reparaciones:', error);
    res.status(500).json({ error: 'Error al obtener reparaciones' });
  }
};

// Obtener reparación por ID
const getWorkshopRepairById = async (req, res) => {
  try {
    const { id } = req.params;

    const repair = await prisma.workshopRepair.findUnique({
      where: { id },
      include: {
        service: {
          include: {
            building: true
          }
        },
        workshop: true
      }
    });

    if (!repair) {
      return res.status(404).json({ error: 'Reparación no encontrada' });
    }

    res.json(repair);
  } catch (error) {
    console.error('Error obteniendo reparación:', error);
    res.status(500).json({ error: 'Error al obtener reparación' });
  }
};

// Crear reparación
const createWorkshopRepair = async (req, res) => {
  try {
    const {
      serviceId,
      workshopId,
      buildingAddress,
      doormanBrand,
      workshopCost,
      clientPrice,
      visitDate,
      workshopEntryDate,
      installationDate,
      paid
    } = req.body;

    if (!serviceId || !workshopId || !buildingAddress) {
      return res.status(400).json({ 
        error: 'ServiceId, workshopId y buildingAddress son requeridos' 
      });
    }

    // Verificar que el servicio existe y está en estado ASIGNADO
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { building: true }
    });

    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    if (service.status !== 'ASIGNADO') {
      return res.status(400).json({ 
        error: 'El servicio debe estar en estado "Asignado" para crear una reparación' 
      });
    }

    // Verificar que el taller existe
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId }
    });

    if (!workshop) {
      return res.status(404).json({ error: 'Taller no encontrado' });
    }

    // Verificar que no existe ya una reparación de taller para este servicio
    const existingRepair = await prisma.workshopRepair.findFirst({
      where: { serviceId }
    });

    if (existingRepair) {
      return res.status(400).json({ 
        error: 'Ya existe una reparación de taller para este servicio' 
      });
    }

    const repair = await prisma.workshopRepair.create({
      data: {
        serviceId,
        workshopId,
        buildingAddress,
        doormanBrand,
        workshopCost: workshopCost ? parseFloat(workshopCost) : null,
        clientPrice: clientPrice ? parseFloat(clientPrice) : null,
        visitDate: visitDate ? new Date(visitDate) : null,
        workshopEntryDate: workshopEntryDate ? new Date(workshopEntryDate) : null,
        installationDate: installationDate ? new Date(installationDate) : null,
        paid: paid || false
      },
      include: {
        service: {
          include: {
            building: true
          }
        },
        workshop: true
      }
    });

    res.status(201).json(repair);
  } catch (error) {
    console.error('Error creando reparación:', error);
    res.status(500).json({ error: 'Error al crear reparación' });
  }
};

// Actualizar reparación
const updateWorkshopRepair = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      workshopId,
      buildingAddress,
      doormanBrand,
      workshopCost,
      clientPrice,
      visitDate,
      workshopEntryDate,
      installationDate,
      paid
    } = req.body;

    const data = {};

    if (workshopId !== undefined) data.workshopId = workshopId;
    if (buildingAddress !== undefined) data.buildingAddress = buildingAddress;
    if (doormanBrand !== undefined) data.doormanBrand = doormanBrand;
    if (workshopCost !== undefined) data.workshopCost = workshopCost ? parseFloat(workshopCost) : null;
    if (clientPrice !== undefined) data.clientPrice = clientPrice ? parseFloat(clientPrice) : null;
    if (visitDate !== undefined) data.visitDate = visitDate ? new Date(visitDate) : null;
    if (workshopEntryDate !== undefined) data.workshopEntryDate = workshopEntryDate ? new Date(workshopEntryDate) : null;
    if (installationDate !== undefined) data.installationDate = installationDate ? new Date(installationDate) : null;
    if (paid !== undefined) data.paid = paid;

    const repair = await prisma.workshopRepair.update({
      where: { id },
      data,
      include: {
        service: {
          include: {
            building: true
          }
        },
        workshop: true
      }
    });

    res.json(repair);
  } catch (error) {
    console.error('Error actualizando reparación:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Reparación no encontrada' });
    }
    res.status(500).json({ error: 'Error al actualizar reparación' });
  }
};

// Eliminar reparación
const deleteWorkshopRepair = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.workshopRepair.delete({
      where: { id }
    });

    res.json({ message: 'Reparación eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando reparación:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Reparación no encontrada' });
    }
    res.status(500).json({ error: 'Error al eliminar reparación' });
  }
};

module.exports = {
  getWorkshopRepairs,
  getWorkshopRepairById,
  createWorkshopRepair,
  updateWorkshopRepair,
  deleteWorkshopRepair
};
