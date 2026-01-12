const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todas las zonas
const getZones = async (req, res) => {
  try {
    const zones = await prisma.zone.findMany({
      include: {
        localities: {
          orderBy: {
            locality: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json(zones);
  } catch (error) {
    console.error('Error al obtener zonas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener una zona por ID
const getZoneById = async (req, res) => {
  try {
    const { id } = req.params;
    const zone = await prisma.zone.findUnique({
      where: { id },
      include: {
        localities: {
          orderBy: {
            locality: 'asc'
          }
        }
      }
    });

    if (!zone) {
      return res.status(404).json({ message: 'Zona no encontrada' });
    }

    res.json(zone);
  } catch (error) {
    console.error('Error al obtener zona:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Crear una nueva zona
const createZone = async (req, res) => {
  try {
    const { name, description, localities } = req.body;

    // Validar que el nombre no esté duplicado
    const existingZone = await prisma.zone.findUnique({
      where: { name }
    });

    if (existingZone) {
      return res.status(400).json({ message: 'Ya existe una zona con ese nombre' });
    }

    // Validar que las localidades sean válidas (existan en la tabla Locality)
    if (localities && localities.length > 0) {
      const validLocalities = await prisma.locality.findMany({
        where: {
          name: { in: localities },
          isActive: true
        },
        select: { name: true }
      });

      const validLocalityNames = validLocalities.map(l => l.name);
      const invalidLocalities = localities.filter(locality => !validLocalityNames.includes(locality));
      
      if (invalidLocalities.length > 0) {
        return res.status(400).json({ 
          message: 'Localidades inválidas', 
          invalidLocalities 
        });
      }
    }

    const zone = await prisma.zone.create({
      data: {
        name,
        description,
        localities: {
          create: localities ? localities.map(locality => ({
            locality
          })) : []
        }
      },
      include: {
        localities: {
          orderBy: {
            locality: 'asc'
          }
        }
      }
    });

    res.status(201).json(zone);
  } catch (error) {
    console.error('Error al crear zona:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actualizar una zona
const updateZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, localities } = req.body;

    // Verificar que la zona existe
    const existingZone = await prisma.zone.findUnique({
      where: { id }
    });

    if (!existingZone) {
      return res.status(404).json({ message: 'Zona no encontrada' });
    }

    // Validar que el nombre no esté duplicado (si se está cambiando)
    if (name && name !== existingZone.name) {
      const duplicateZone = await prisma.zone.findUnique({
        where: { name }
      });

      if (duplicateZone) {
        return res.status(400).json({ message: 'Ya existe una zona con ese nombre' });
      }
    }

    // Validar que las localidades sean válidas
    if (localities && localities.length > 0) {
      const validLocalities = await prisma.locality.findMany({
        where: {
          name: { in: localities },
          isActive: true
        },
        select: { name: true }
      });

      const validLocalityNames = validLocalities.map(l => l.name);
      const invalidLocalities = localities.filter(locality => !validLocalityNames.includes(locality));
      
      if (invalidLocalities.length > 0) {
        return res.status(400).json({ 
          message: 'Localidades inválidas', 
          invalidLocalities 
        });
      }
    }

    // Actualizar la zona y sus localidades
    const zone = await prisma.zone.update({
      where: { id },
      data: {
        name,
        description,
        localities: {
          deleteMany: {},
          create: localities ? localities.map(locality => ({
            locality
          })) : []
        }
      },
      include: {
        localities: {
          orderBy: {
            locality: 'asc'
          }
        }
      }
    });

    res.json(zone);
  } catch (error) {
    console.error('Error al actualizar zona:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Eliminar una zona
const deleteZone = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la zona existe
    const existingZone = await prisma.zone.findUnique({
      where: { id }
    });

    if (!existingZone) {
      return res.status(404).json({ message: 'Zona no encontrada' });
    }

    await prisma.zone.delete({
      where: { id }
    });

    res.json({ message: 'Zona eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar zona:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener todas las localidades disponibles (para crear zonas)
const getAvailableLocalities = async (req, res) => {
  try {
    // Si no hay zonas creadas, devolver todas las localidades activas
    const zonesCount = await prisma.zone.count();
    
    if (zonesCount === 0) {
      const allLocalities = await prisma.locality.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { name: true }
      });
      return res.json(allLocalities.map(l => l.name));
    }

    // Si hay zonas, obtener las localidades que ya están en uso
    const usedLocalities = await prisma.zoneLocality.findMany({
      select: {
        locality: true
      }
    });

    // Obtener localidades únicas que ya están en uso
    const usedLocalitiesSet = new Set(usedLocalities.map(l => l.locality));
    
    // Filtrar las localidades activas para mostrar solo las disponibles
    const availableLocalities = await prisma.locality.findMany({
      where: {
        isActive: true,
        name: { notIn: Array.from(usedLocalitiesSet) }
      },
      orderBy: { name: 'asc' },
      select: { name: true }
    });
    
    // Si no hay localidades disponibles (todas están en uso), mostrar todas las activas
    if (availableLocalities.length === 0) {
      const allActiveLocalities = await prisma.locality.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { name: true }
      });
      return res.json(allActiveLocalities.map(l => l.name));
    }
    
    res.json(availableLocalities.map(l => l.name));
  } catch (error) {
    console.error('Error al obtener localidades disponibles:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener todas las localidades predefinidas (útil para crear la primera zona)
const getAllPredefinedLocalities = async (req, res) => {
  try {
    const localities = await prisma.locality.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { name: true }
    });
    
    res.json(localities.map(l => l.name));
  } catch (error) {
    console.error('Error al obtener localidades predefinidas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Crear una localidad personalizada
const createCustomLocality = async (req, res) => {
  try {
    const { locality, category = 'Personalizada' } = req.body;

    if (!locality || locality.trim() === '') {
      return res.status(400).json({ message: 'El nombre de la localidad es obligatorio' });
    }

    // Verificar que la localidad no esté ya en la tabla
    const existingLocality = await prisma.locality.findUnique({
      where: { name: locality.trim() }
    });

    if (existingLocality) {
      return res.status(400).json({ message: 'Esta localidad ya existe' });
    }

    // Verificar que la localidad no esté ya creada en alguna zona
    const existingZoneLocality = await prisma.zoneLocality.findFirst({
      where: {
        locality: locality.trim()
      }
    });

    if (existingZoneLocality) {
      return res.status(400).json({ message: 'Esta localidad ya existe en una zona' });
    }

    // Crear la localidad en la tabla Locality
    const newLocality = await prisma.locality.create({
      data: {
        name: locality.trim(),
        category: category,
        isActive: true
      }
    });

    res.status(201).json({ 
      message: 'Localidad creada exitosamente',
      locality: newLocality,
      totalLocalities: await prisma.locality.count()
    });
  } catch (error) {
    console.error('Error al crear localidad personalizada:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Agregar localidad a una zona
const addLocalityToZone = async (req, res) => {
  try {
    const { zoneId } = req.params;
    const { locality } = req.body;

    // Verificar que la zona existe
    const existingZone = await prisma.zone.findUnique({
      where: { id: zoneId }
    });

    if (!existingZone) {
      return res.status(404).json({ message: 'Zona no encontrada' });
    }

    // Validar que la localidad sea válida (exista en la tabla Locality)
    const validLocality = await prisma.locality.findFirst({
      where: {
        name: locality,
        isActive: true
      }
    });

    if (!validLocality) {
      return res.status(400).json({ 
        message: 'Localidad inválida', 
        invalidLocality: locality 
      });
    }

    // Verificar que la localidad no esté ya en la zona
    const existingLocality = await prisma.zoneLocality.findUnique({
      where: {
        zoneId_locality: {
          zoneId,
          locality
        }
      }
    });

    if (existingLocality) {
      return res.status(400).json({ message: 'La localidad ya existe en esta zona' });
    }

    // Crear la localidad
    const newLocality = await prisma.zoneLocality.create({
      data: {
        zoneId,
        locality
      }
    });

    res.status(201).json(newLocality);
  } catch (error) {
    console.error('Error al agregar localidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Eliminar localidad de una zona
const removeLocalityFromZone = async (req, res) => {
  try {
    const { zoneId, localityId } = req.params;

    // Verificar que la zona existe
    const existingZone = await prisma.zone.findUnique({
      where: { id: zoneId }
    });

    if (!existingZone) {
      return res.status(404).json({ message: 'Zona no encontrada' });
    }

    // Verificar que la localidad existe y pertenece a la zona
    const existingLocality = await prisma.zoneLocality.findFirst({
      where: {
        id: localityId,
        zoneId
      }
    });

    if (!existingLocality) {
      return res.status(404).json({ message: 'Localidad no encontrada en esta zona' });
    }

    // Eliminar la localidad
    await prisma.zoneLocality.delete({
      where: { id: localityId }
    });

    res.json({ message: 'Localidad eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar localidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener localidades de una zona específica
const getZoneLocalities = async (req, res) => {
  try {
    const { zoneId } = req.params;

    // Verificar que la zona existe
    const existingZone = await prisma.zone.findUnique({
      where: { id: zoneId }
    });

    if (!existingZone) {
      return res.status(404).json({ message: 'Zona no encontrada' });
    }

    // Obtener las localidades de la zona
    const localities = await prisma.zoneLocality.findMany({
      where: { zoneId },
      orderBy: {
        locality: 'asc'
      }
    });

    res.json(localities);
  } catch (error) {
    console.error('Error al obtener localidades de la zona:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = {
  getZones,
  getZoneById,
  createZone,
  updateZone,
  deleteZone,
  getAvailableLocalities,
  getAllPredefinedLocalities,
  createCustomLocality,
  addLocalityToZone,
  removeLocalityFromZone,
  getZoneLocalities
};
