const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los servicios
const getAllServices = async (req, res) => {
  try {
    const { 
      status,
      page = 1,
      limit = 10,
      administratorId,
      buildingId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Construir el objeto where para los filtros
    const where = {};
    
    if (status) {
      where.status = status;
    }

    if (buildingId) {
      where.buildingId = buildingId;
    }

    if (administratorId) {
      where.building = {
        administratorId: administratorId
      };
    }

    // Obtener el total de registros para la paginación
    const total = await prisma.service.count({ where });

    const services = await prisma.service.findMany({
      where,
      include: {
        building: {
          select: {
            name: true,
            cuit: true,
            administrator: {
              select: {
                name: true
              }
            }
          }
        },
        technician: true,
        invoice: true
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip,
      take: limitNumber
    });

    res.json({
      services,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber)
      }
    });
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ message: 'Error al obtener servicios' });
  }
};

// Obtener un servicio por ID
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        building: {
          select: {
            name: true,
            cuit: true,
            administrator: {
              select: {
                name: true
              }
            }
          }
        },
        invoice: true
      }
    });

    if (!service) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    res.json(service);
  } catch (error) {
    console.error('Error al obtener servicio:', error);
    res.status(500).json({ message: 'Error al obtener servicio' });
  }
};

// Crear un nuevo servicio (Paso a: Ingreso de llamada)
const createService = async (req, res) => {
  try {
    const { buildingId, description } = req.body;

    // Verificar que el edificio existe
    const building = await prisma.building.findUnique({
      where: { id: buildingId }
    });

    if (!building) {
      return res.status(404).json({ message: 'Edificio no encontrado' });
    }

    const service = await prisma.service.create({
      data: {
        name: `Servicio ${building.name}`,
        description,
        buildingId,
        status: 'PENDIENTE'
      },
      include: {
        building: {
          select: {
            name: true,
            cuit: true,
            administrator: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    res.status(201).json(service);
  } catch (error) {
    console.error('Error al crear servicio:', error);
    res.status(500).json({ message: 'Error al crear servicio' });
  }
};

// Actualizar un servicio
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, status, buildingId } = req.body;

    // Verificar que el edificio existe si se está cambiando
    if (buildingId) {
      const building = await prisma.building.findUnique({
        where: { id: buildingId }
      });

      if (!building) {
        return res.status(404).json({ message: 'Edificio no encontrado' });
      }
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        name,
        description,
        price,
        status,
        buildingId
      },
      include: {
        building: {
          select: {
            name: true,
            cuit: true,
            administrator: {
              select: {
                name: true
              }
            }
          }
        },
        invoice: true
      }
    });

    res.json(service);
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({ message: 'Error al actualizar servicio' });
  }
};

// Eliminar un servicio
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el servicio tiene una factura asociada
    const service = await prisma.service.findUnique({
      where: { id },
      include: { invoice: true }
    });

    if (service?.invoice) {
      return res.status(400).json({ 
        message: 'No se puede eliminar el servicio porque tiene una factura asociada' 
      });
    }

    await prisma.service.delete({
      where: { id }
    });

    res.json({ message: 'Servicio eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ message: 'Error al eliminar servicio' });
  }
};

// Guardar borrador de servicio
const saveDraft = async (req, res) => {
  try {
    const { buildingId, description } = req.body;

    // Verificar que el edificio existe
    const building = await prisma.building.findUnique({
      where: { id: buildingId }
    });

    if (!building) {
      return res.status(404).json({ message: 'Edificio no encontrado' });
    }

    const draft = await prisma.serviceDraft.create({
      data: {
        name: `Servicio ${building.name}`,
        description,
        buildingId,
        userId: req.user.id,
        status: 'PENDIENTE',
        price: 0 // Valor temporal hasta que se defina el precio
      }
    });

    res.status(201).json(draft);
  } catch (error) {
    console.error('Error al guardar borrador:', error);
    res.status(500).json({ message: 'Error al guardar borrador' });
  }
};

// Asignar técnico (Paso b: Designación de trabajos)
const assignTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const { technicianId, visitDate } = req.body;

    // Verificar que el servicio existe
    const service = await prisma.service.findUnique({
      where: { id }
    });

    if (!service) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    // Verificar que el técnico existe
    const technician = await prisma.technician.findUnique({
      where: { id: technicianId }
    });

    if (!technician) {
      return res.status(404).json({ message: 'Técnico no encontrado' });
    }

    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        technicianId,
        visitDate: new Date(visitDate),
        status: 'ASIGNADO'
      },
      include: {
        technician: true,
        building: true
      }
    });

    res.json(updatedService);
  } catch (error) {
    console.error('Error al asignar técnico:', error);
    res.status(500).json({ message: 'Error al asignar técnico' });
  }
};

// Subir remito
const uploadReceipt = async (req, res) => {
  try {
    console.log('--- [REMITO] Intentando subir remito ---');
    console.log('Usuario autenticado:', req.user);
    console.log('Archivos recibidos:', req.files);
    
    const { id } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No se han subido archivos' });
    }

    const service = await prisma.service.findUnique({
      where: { id },
      include: { technician: true }
    });

    if (!service) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    // Verificar que el usuario es el técnico asignado o tiene permisos
    const isTechnician = service.technician && service.technician.email === req.user.email;
    const isAdminOrOperador = req.user.role === 'ADMIN' || req.user.role === 'OPERADOR';

    if (!isTechnician && !isAdminOrOperador) {
      return res.status(403).json({ 
        message: 'Solo el técnico asignado, un administrador o un operador pueden subir el remito' 
      });
    }

    // Guardar las URLs de las imágenes
    const imageUrls = files.map(file => `/uploads/${file.filename}`);
    
    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        receiptImages: [...(service.receiptImages || []), ...imageUrls],
        status: 'CON_REMITO'
      },
      include: {
        technician: true
      }
    });

    res.json({ 
      message: 'Remito subido exitosamente', 
      service: updatedService 
    });
  } catch (error) {
    console.error('Error al subir remito:', error);
    res.status(500).json({ message: 'Error al subir remito' });
  }
};

// Obtener técnicos
const getTechnicians = async (req, res) => {
  try {
    const technicians = await prisma.technician.findMany();
    res.json(technicians);
  } catch (error) {
    console.error('Error al obtener técnicos:', error);
    res.status(500).json({ message: 'Error al obtener técnicos' });
  }
};

// Obtener conteos de servicios por estado
const getServiceCounts = async (req, res) => {
  try {
    const counts = await prisma.service.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const formattedCounts = {
      pendientes: 0,
      asignados: 0,
      conRemito: 0,
      facturados: 0,
    };

    counts.forEach((count) => {
      switch (count.status) {
        case 'PENDIENTE':
          formattedCounts.pendientes = count._count.status;
          break;
        case 'ASIGNADO':
          formattedCounts.asignados = count._count.status;
          break;
        case 'CON_REMITO':
          formattedCounts.conRemito = count._count.status;
          break;
        case 'FACTURADO':
          formattedCounts.facturados = count._count.status;
          break;
      }
    });

    res.json(formattedCounts);
  } catch (error) {
    console.error('Error al obtener conteos de servicios:', error);
    res.status(500).json({ message: 'Error al obtener conteos de servicios' });
  }
};

// Estadísticas de servicios: trabajos realizados por mes (remitos subidos)
const getServiceStats = async (req, res) => {
  try {
    // Agrupar remitos por mes y año
    const remitosPorMes = await prisma.remito.groupBy({
      by: ['date'],
      _count: { id: true },
      orderBy: {
        date: 'asc'
      }
    });
    // Formatear resultado: { '2024-05': 10, ... }
    const stats = {};
    remitosPorMes.forEach(r => {
      const date = new Date(r.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      stats[key] = (stats[key] || 0) + r._count.id;
    });
    res.json({ trabajosPorMes: stats });
  } catch (error) {
    console.error('Error al obtener estadísticas de servicios:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas de servicios' });
  }
};

// Obtener trabajos asignados a un técnico autenticado
const getAssignedServicesForTechnician = async (req, res) => {
  try {
    const { dateFilter, estadoRemito } = req.query; // 'hoy', 'maniana', 'semana', 'todos', 'estadoRemito'
    let dateFrom, dateTo;
    const now = new Date();
    if (dateFilter === 'hoy') {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateFilter === 'maniana') {
      const manana = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      dateFrom = manana;
      dateTo = new Date(manana.getFullYear(), manana.getMonth(), manana.getDate(), 23, 59, 59, 999);
    } else if (dateFilter === 'semana') {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      dateFrom = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
      dateTo = new Date(now.getFullYear(), now.getMonth(), diffToMonday + 6, 23, 59, 59, 999);
    }

    // Mostrar todos los servicios antes de filtrar
    const allServices = await prisma.service.findMany({
      include: { building: true, remitos: true, technician: true },
      orderBy: { visitDate: 'asc' }
    });
    console.log('[DEBUG] Todos los servicios:', allServices.map(s => ({
      id: s.id,
      status: s.status,
      technicianId: s.technicianId,
      visitDate: s.visitDate,
      building: s.building?.name
    })));

    // Construir el objeto where para los filtros
    const where = {
      status: { in: ['ASIGNADO', 'CON_REMITO'] },
    };

    // Si es un técnico, solo mostrar sus trabajos asignados
    if (req.user.role === 'TECNICO') {
      where.technicianId = req.user.technicianId;
    }

    // Agregar filtro de fecha si se especificó
    if (dateFilter && dateFilter !== 'todos') {
      where.visitDate = { gte: dateFrom, lte: dateTo };
    }

    // Filtrar por estadoRemito si se especifica
    if (estadoRemito === 'pendiente') {
      where.status = 'ASIGNADO';
    } else if (estadoRemito === 'subido') {
      where.status = 'CON_REMITO';
    } else {
      where.status = { in: ['ASIGNADO', 'CON_REMITO'] };
    }

    console.log('[TECNICO] Filtros usados:', where);
    const services = await prisma.service.findMany({
      where,
      include: {
        building: true,
        remitos: true,
        technician: true
      },
      orderBy: { visitDate: 'asc' }
    });

    console.log('[TECNICO] Servicios encontrados:', services.length, services.map(s => ({
      id: s.id,
      status: s.status,
      technicianId: s.technicianId,
      visitDate: s.visitDate,
      building: s.building?.name
    })));
    
    // Mapear a formato amigable
    const result = services.map(s => {
      // Determinar estado del remito
      const tieneRemito = s.remitos && s.remitos.length > 0;
      let estadoRemito = 'Pendiente de remito';
      let remitoImagenes = [];
      if (tieneRemito) {
        estadoRemito = 'Remito subido';
        remitoImagenes = s.remitos.map(r => r.receiptImages).flat();
      }

      // Texto de fecha
      let fechaTexto = '';
      const hoy = new Date();
      const fechaVisita = s.visitDate ? new Date(s.visitDate) : null;
      if (fechaVisita) {
        const diff = Math.floor((fechaVisita - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / (1000*60*60*24));
        if (diff === 0) fechaTexto = 'Hoy';
        else if (diff === 1) fechaTexto = 'Mañana';
        else if (diff === -1) fechaTexto = 'Ayer';
        else if (diff > 1 && diff < 7) fechaTexto = `En ${diff} días`;
        else fechaTexto = fechaVisita.toLocaleDateString('es-AR');
      }

      return {
        id: s.id,
        descripcion: s.description,
        edificio: s.building.name,
        direccion: s.building.address,
        fechaVisita: s.visitDate,
        fechaTexto,
        estadoRemito,
        remitoImagenes,
        tecnico: s.technician ? {
          id: s.technician.id,
          nombre: s.technician.name
        } : null
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error al obtener trabajos del técnico:', error);
    res.status(500).json({ message: 'Error al obtener trabajos del técnico' });
  }
};

// Anular servicio
const cancelService = async (req, res) => {
  try {
    console.log('--- [CANCELAR] Intentando anular servicio ---');
    console.log('Usuario autenticado:', req.user);
    
    const { id } = req.params;

    const service = await prisma.service.findUnique({
      where: { id },
      include: { technician: true }
    });

    if (!service) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    // Verificar que el usuario es el técnico asignado o tiene permisos
    const isTechnician = service.technician && service.technician.email === req.user.email;
    const isAdminOrOperador = req.user.role === 'ADMIN' || req.user.role === 'OPERADOR';

    if (!isTechnician && !isAdminOrOperador) {
      return res.status(403).json({ 
        message: 'Solo el técnico asignado, un administrador o un operador pueden anular el servicio' 
      });
    }

    // Actualizar el estado del servicio
    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        status: 'PENDIENTE',
        technicianId: null,
        visitDate: null,
        receiptImages: []
      },
      include: {
        technician: true
      }
    });

    res.json({ 
      message: 'Servicio anulado exitosamente', 
      service: updatedService 
    });
  } catch (error) {
    console.error('Error al anular servicio:', error);
    res.status(500).json({ message: 'Error al anular servicio' });
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  saveDraft,
  assignTechnician,
  uploadReceipt,
  getTechnicians,
  getServiceCounts,
  getServiceStats,
  getAssignedServicesForTechnician,
  cancelService
}; 