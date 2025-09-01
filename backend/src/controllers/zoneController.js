const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Lista de localidades disponibles
const AVAILABLE_LOCALITIES = [
  // Ciudad Autónoma de Buenos Aires
  'Agronomía', 'Almagro', 'Balvanera', 'Barracas', 'Belgrano', 'Boedo', 'Caballito', 'Chacarita', 'Coghlan', 'Colegiales', 'Constitución', 'Flores', 'Floresta', 'La Boca', 'La Paternal', 'Liniers', 'Mataderos', 'Monte Castro', 'Montserrat', 'Nueva Pompeya', 'Núñez', 'Palermo', 'Parque Avellaneda', 'Parque Chacabuco', 'Parque Chas', 'Parque Patricios', 'Puerto Madero', 'Recoleta', 'Retiro', 'Saavedra', 'San Cristóbal', 'San Nicolás', 'San Telmo', 'Versalles', 'Villa Crespo', 'Villa del Parque', 'Villa Devoto', 'Villa General Mitre', 'Villa Lugano', 'Villa Luro', 'Villa Ortúzar', 'Villa Pueyrredón', 'Villa Real', 'Villa Riachuelo', 'Villa Santa Rita', 'Villa Soldati', 'Villa Urquiza', 'Vélez Sarsfield',
  // Conurbano Bonaerense
  'Almirante Brown', 'Avellaneda', 'Berazategui', 'Berisso', 'Cañuelas', 'Ensenada', 'Esteban Echeverría', 'Ezeiza', 'Florencio Varela', 'La Plata', 'Lanús', 'Lomas de Zamora', 'Presidente Perón', 'Quilmes', 'San Vicente',
  // Interior de Buenos Aires
  '25 de Mayo', 'Adolfo Alsina', 'Ayacucho', 'Azul', 'Balcarce', 'Benito Juárez', 'Bolívar', 'Castelli', 'Chascomús', 'Coronel Dorrego', 'Coronel Pringles', 'Coronel Rosales', 'Daireaux', 'Dolores', 'General Alvarado', 'General Alvear', 'General Belgrano', 'General Guido', 'General Lamadrid', 'General Lavalle', 'General Madariaga', 'General Paz', 'General Pueyrredón', 'González Chávez', 'Guaminí', 'La Costa', 'Laprida', 'Las Flores', 'Lezama', 'Lobería', 'Maipú', 'Mar Chiquita', 'Monte', 'Necochea', 'Olavarría', 'Patagones', 'Pellegrini', 'Pila', 'Pinamar', 'Puán', 'Rauch', 'Roque Pérez', 'Saavedra', 'Saladillo', 'Salliqueló',
  // Zona Norte
  'Escobar', 'General Rodríguez', 'General San Martín', 'Hurlingham', 'Ituzaingó', 'José C. Paz', 'La Matanza', 'Luján', 'Malvinas Argentinas', 'Marcos Paz', 'Merlo', 'Moreno', 'Morón', 'Pilar', 'San Fernando', 'San Isidro', 'San Miguel', 'Tigre', 'Tres de Febrero', 'Vicente López',
  // Zona Oeste
  'Alberti', 'Arrecifes', 'Baradero', 'Bragado', 'Capitán Sarmiento', 'Carlos Casares', 'Carlos Tejedor', 'Carmen de Areco', 'Chacabuco', 'Chivilcoy', 'Colón', 'Florentino Ameghino', 'General Arenales', 'General Pinto', 'General Villegas', 'Hipólito Yrigoyen', 'Junín', 'Leandro N. Alem', 'Lincoln', 'Mercedes', 'Navarro', 'Nueve de Julio', 'Pehuajó', 'Pergamino', 'Ramallo', 'Rivadavia', 'Salto', 'San Andrés de Giles', 'San Antonio de Areco', 'San Nicolás', 'San Pedro', 'Suipacha', 'Trenque Lauquen', 'Zárate', 'San Cayetano', 'Tandil', 'Tapalqué', 'Tordillo', 'Tornquist', 'Tres Arroyos', 'Tres Lomas', 'Villa Gesell', 'Villarino'
];

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

    // Validar que las localidades sean válidas
    if (localities && localities.length > 0) {
      const invalidLocalities = localities.filter(locality => !AVAILABLE_LOCALITIES.includes(locality));
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
      const invalidLocalities = localities.filter(locality => !AVAILABLE_LOCALITIES.includes(locality));
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

// Obtener todas las localidades disponibles desde la base de datos
const getAvailableLocalities = async (req, res) => {
  try {
    const localities = await prisma.zoneLocality.findMany({
      select: {
        locality: true
      },
      orderBy: {
        locality: 'asc'
      }
    });

    // Obtener localidades únicas
    const uniqueLocalities = [...new Set(localities.map(l => l.locality))];
    
    res.json(uniqueLocalities);
  } catch (error) {
    console.error('Error al obtener localidades disponibles:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = {
  getZones,
  getZoneById,
  createZone,
  updateZone,
  deleteZone,
  getAvailableLocalities
};
