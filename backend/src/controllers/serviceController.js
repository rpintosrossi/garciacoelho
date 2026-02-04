const { getFileUrl, convertToAbsoluteUrls } = require('../utils/fileUtils');
const prisma = require('../lib/prisma');

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
            address: true,
            doormanType: true,
            cuit: true,
            administrator: {
              select: {
                name: true
              }
            }
          }
        },
        technician: true,
        invoice: true,
        remitos: true,
        workshopRepairs: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip,
      take: limitNumber
    });

    // Convertir URLs relativas a absolutas para las imágenes
    const servicesWithAbsoluteUrls = services.map(service => ({
      ...service,
      receiptImages: convertToAbsoluteUrls(service.receiptImages),
      remitos: service.remitos ? service.remitos.map(remito => ({
        ...remito,
        receiptImages: convertToAbsoluteUrls(remito.receiptImages)
      })) : []
    }));

    res.json({
      services: servicesWithAbsoluteUrls,
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
            address: true,
            cuit: true,
            administrator: {
              select: {
                name: true
              }
            }
          }
        },
        technician: true,
        remitos: true,
        invoice: true
      }
    });

    if (!service) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    // Convertir URLs relativas a absolutas para las imágenes
    if (service.receiptImages) {
      service.receiptImages = convertToAbsoluteUrls(service.receiptImages);
    }
    
    if (service.remitos) {
      service.remitos = service.remitos.map(remito => ({
        ...remito,
        receiptImages: convertToAbsoluteUrls(remito.receiptImages)
      }));
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

// Crear un servicio anterior rápido (estado INVOICED)
const createPastService = async (req, res) => {
  try {
    const { buildingId, description, visitDate, technicianId } = req.body;
    const remitoFiles = req.files; // Array de archivos

    // Verificar que el edificio existe
    const building = await prisma.building.findUnique({
      where: { id: buildingId }
    });

    if (!building) {
      return res.status(404).json({ message: 'Edificio no encontrado' });
    }

    // Verificar que el técnico existe
    const technician = await prisma.user.findUnique({
      where: { id: technicianId }
    });

    if (!technician) {
      return res.status(404).json({ message: 'Técnico no encontrado' });
    }

    // Crear el servicio en estado INVOICED
    const service = await prisma.service.create({
      data: {
        name: `Servicio ${building.name}`,
        description,
        buildingId,
        technicianId,
        visitDate: visitDate ? new Date(visitDate) : new Date(),
        status: 'INVOICED'
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
        technician: true
      }
    });

    // Si hay archivos de remito, crear el remito con múltiples imágenes
    if (remitoFiles && remitoFiles.length > 0) {
      const imagePaths = remitoFiles.map(file => file.path);
      
      await prisma.remito.create({
        data: {
          serviceId: service.id,
          number: `R-${service.id}-${Date.now()}`,
          date: visitDate ? new Date(visitDate) : new Date(),
          amount: 0, // Se puede actualizar después
          receiptImages: imagePaths
        }
      });
    }

    res.status(201).json(service);
  } catch (error) {
    console.error('Error al crear servicio anterior:', error);
    res.status(500).json({ message: 'Error al crear servicio anterior' });
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

    // Verificar si el servicio existe
    const service = await prisma.service.findUnique({
      where: { id },
      include: { invoice: true }
    });

    if (!service) {
      return res.status(404).json({ 
        message: 'Servicio no encontrado' 
      });
    }

    // Solo permitir eliminación si el servicio está en estado PENDIENTE
    if (service.status !== 'PENDIENTE') {
      return res.status(400).json({ 
        message: 'Solo se pueden eliminar servicios en estado de Asignación (pendientes de técnico)' 
      });
    }

    // Verificar si el servicio tiene una factura asociada
    if (service.invoice) {
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

// Asignar técnico (Paso b: Designación de trabajos) - VERSIÓN MEJORADA
const assignTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    let { technicianId, visitDate } = req.body;
    
    // Sanitize input
    if (typeof technicianId === 'string') {
        technicianId = technicianId.trim();
    }

    console.log(`👨‍🔧 [ASSIGN] Iniciando asignación. ServiceID: ${id}, TechID: ${technicianId}`);

    // Validaciones
    if (!technicianId) {
      return res.status(400).json({ 
        message: 'technicianId es requerido',
        type: 'VALIDATION_ERROR'
      });
    }

    // Verificar que el servicio existe
    const service = await prisma.service.findUnique({
      where: { id },
      include: { technician: true }
    });

    if (!service) {
      console.log(`❌ [ASSIGN] Servicio no encontrado: ${id}`);
      return res.status(404).json({ 
        message: 'Servicio no encontrado',
        type: 'SERVICE_NOT_FOUND'
      });
    }

    // Verificar que el servicio no esté ya asignado al mismo técnico
    if (service.technicianId === technicianId && service.status === 'ASIGNADO') {
      console.log('⚠️ [ASSIGN] Servicio ya asignado al mismo técnico:', technicianId);
      return res.status(409).json({ 
        message: 'El servicio ya está asignado a este técnico',
        type: 'ALREADY_ASSIGNED',
        currentTechnicianId: service.technicianId
      });
    }

    // Verificar que el técnico existe
    console.log(`🔍 [ASSIGN] Buscando técnico con ID: ${technicianId}`);
    const technician = await prisma.technician.findUnique({
      where: { id: technicianId }
    });

    if (!technician) {
      console.log(`❌ [ASSIGN] Técnico no encontrado en DB. ID buscado: ${technicianId}`);
      // DEBUG: Listar todos los IDs para ver si hay mismatch
      const allTechs = await prisma.technician.findMany({ select: { id: true, name: true } });
      console.log('📋 [DEBUG] Técnicos disponibles:', JSON.stringify(allTechs));
      
      return res.status(404).json({ 
        message: 'Técnico no encontrado',
        type: 'TECHNICIAN_NOT_FOUND'
      });
    }

    console.log('✅ [ASSIGN] Asignando técnico:', technician.name, 'al servicio:', id);

    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        technicianId,
        visitDate: visitDate ? new Date(visitDate) : null,
        status: 'ASIGNADO'
      },
      include: {
        technician: true,
        building: true
      }
    });

    console.log('✅ [ASSIGN] Técnico asignado exitosamente');
    res.json(updatedService);
  } catch (error) {
    console.error('❌ [ASSIGN] Error al asignar técnico:', error);
    
    // Manejar errores específicos de Prisma
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        message: 'Ya existe una asignación con estos datos',
        type: 'DUPLICATE_ASSIGNMENT'
      });
    }
    
    res.status(500).json({ 
      message: 'Error interno del servidor al asignar técnico',
      type: 'SERVER_ERROR'
    });
  }
};

// Subir remito
const uploadReceipt = async (req, res) => {
  try {
    console.log('--- [REMITO] Intentando subir remito ---');
    console.log('Usuario autenticado:', req.user);
    console.log('Archivos recibidos:', req.files);
    console.log('Datos del formulario:', req.body);
    
    const { id } = req.params;
    const { remitoNumber } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No se han subido archivos' });
    }

    let finalRemitoNumber = remitoNumber?.trim();
    
    // Si no se proporciona número de remito, generar uno automáticamente
    if (!finalRemitoNumber) {
      let unique = false;
      let generatedNumber;
      while (!unique) {
        // Generar número con formato REM-YYYY-XXXX
        const year = new Date().getFullYear();
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        generatedNumber = `REM-${year}-${randomNum}`;
        
        // Verificar si ya existe (usar findFirst porque number no es único por sí solo)
        const exists = await prisma.remito.findFirst({
          where: { number: generatedNumber }
        });
        if (!exists) unique = true;
      }
      finalRemitoNumber = generatedNumber;
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

    // Validar tipos de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'application/pdf'];
    for (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ 
          message: 'Solo se permiten archivos JPG y PDF' 
        });
      }
      
      // Validar tamaño (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return res.status(400).json({ 
          message: 'El archivo es demasiado grande. Máximo 10MB' 
        });
      }
    }

    // Verificar si ya existe un remito con ese número para el mismo servicio
    if (remitoNumber?.trim()) {
      console.log('Verificando si existe remito con número:', finalRemitoNumber);
      try {
        const existingRemito = await prisma.remito.findFirst({
          where: { 
            number: finalRemitoNumber,
            serviceId: id // Solo verificar para el mismo servicio
          }
        });

        if (existingRemito) {
          console.log('Remito ya existe para este servicio:', existingRemito);
          return res.status(400).json({ 
            message: `Ya existe un remito con el número "${finalRemitoNumber}" para este servicio. Por favor, usa un número diferente.` 
          });
        }
      } catch (dbError) {
        console.error('Error al verificar remito existente:', dbError);
        return res.status(500).json({ 
          message: 'Error al verificar remito existente',
          error: dbError.message 
        });
      }
    }

    // Guardar las URLs de los archivos
    // Si usamos S3, file.location ya tiene la URL completa
    // Si usamos almacenamiento local, file.filename contiene el nombre del archivo
    const fileUrls = files.map(file => {
      if (file.location) {
        // S3: usar la URL completa que proporciona multer-s3
        return file.location;
      } else {
        // Local: construir la URL usando el filename
        return getFileUrl(file.filename);
      }
    });
    console.log('URLs de archivos a guardar:', fileUrls);
    
    // Crear el remito en la base de datos
    console.log('Creando remito con datos:', {
      serviceId: id,
      number: finalRemitoNumber,
      amount: 0,
      date: new Date(),
      receiptImages: fileUrls
    });
    
    let remito;
    try {
      remito = await prisma.remito.create({
        data: {
          serviceId: id,
          number: finalRemitoNumber,
          amount: 0, // Se puede actualizar después
          date: new Date(),
          receiptImages: fileUrls
        }
      });
      
      console.log('Remito creado exitosamente:', remito);
    } catch (remitoError) {
      console.error('Error al crear remito:', remitoError);
      return res.status(500).json({ 
        message: 'Error al crear remito en la base de datos',
        error: remitoError.message 
      });
    }
    
    console.log('Actualizando servicio con ID:', id);
    console.log('ReceiptImages actuales del servicio:', service.receiptImages);
    console.log('Nuevas URLs a agregar:', fileUrls);
    
    let updatedService;
    try {
      updatedService = await prisma.service.update({
        where: { id },
        data: {
          receiptImages: [...(service.receiptImages || []), ...fileUrls],
          status: 'CON_REMITO'
        },
        include: {
          technician: true,
          remitos: true
        }
      });
      
      console.log('Servicio actualizado exitosamente:', updatedService);
    } catch (serviceError) {
      console.error('Error al actualizar servicio:', serviceError);
      return res.status(500).json({ 
        message: 'Error al actualizar servicio',
        error: serviceError.message 
      });
    }

    res.status(200).json({ 
      message: 'Remito subido exitosamente', 
      service: updatedService,
      remito: remito
    });
  } catch (error) {
    console.error('Error al subir remito:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: 'Error al subir remito', error: error.message });
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

    // Solo log en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('[TECNICO] Filtros usados:', where);
    }
    
    const services = await prisma.service.findMany({
      where,
      include: {
        building: true,
        remitos: true,
        technician: true
      },
      orderBy: { visitDate: 'asc' }
    });

    // Solo log en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('[TECNICO] Servicios encontrados:', services.length);
    }
    
    // Mapear a formato amigable
    const result = services.map(s => {
      // Determinar estado del remito
      const tieneRemito = s.remitos && s.remitos.length > 0;
      let estadoRemito = 'Pendiente de remito';
      let remitoImagenes = [];
      if (tieneRemito) {
        estadoRemito = 'Remito subido';
        remitoImagenes = s.remitos.map(r => convertToAbsoluteUrls(r.receiptImages)).flat();
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

// Crear factura en negro (cobro sin factura) - INDIVIDUAL
const createInformalInvoice = async (req, res) => {
  try {
    console.log('--- [FACTURA INFORMAL] Intentando crear cobro sin factura ---');
    console.log('Usuario autenticado:', req.user);
    console.log('Datos recibidos:', req.body);
    console.log('ID del servicio:', req.params.id);
    
    const { id } = req.params;
    const { amount, paymentMethod = 'CUENTA_CORRIENTE' } = req.body;
    
    console.log('Método de pago:', paymentMethod);

    if (!amount) {
      return res.status(400).json({ message: 'El importe es obligatorio' });
    }

    const service = await prisma.service.findUnique({
      where: { id },
      include: { 
        technician: true,
        building: {
          include: {
            administrator: true
          }
        }
      }
    });

    if (!service) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    // Verificar que el servicio tiene remito
    if (service.status !== 'CON_REMITO') {
      return res.status(400).json({ message: 'El servicio debe tener un remito antes de crear el cobro' });
    }

    // Verificar permisos (solo ADMIN u OPERADOR pueden crear cobros)
    const isAdminOrOperador = req.user.role === 'ADMIN' || req.user.role === 'OPERADOR';
    if (!isAdminOrOperador) {
      return res.status(403).json({ 
        message: 'Solo un administrador o un operador pueden crear cobros sin factura' 
      });
    }

    // Crear la factura y actualizar el servicio
    const invoice = await prisma.invoice.create({
      data: {
        amount: parseFloat(amount),
        status: 'PENDIENTE',
        paymentMethod: paymentMethod,
        services: {
          connect: { id: id }
        }
      }
    });

    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        status: 'FACTURADO'
      },
      include: {
        technician: true,
        building: {
          include: {
            administrator: true
          }
        },
        invoice: true
      }
    });

    // Si el método de pago es EFECTIVO, crear el pago inmediatamente
    if (paymentMethod === 'EFECTIVO') {
      console.log('--- [FACTURA INFORMAL] Creando pago en efectivo inmediato ---');
      
      // Obtener el primer remito del servicio
      const firstRemito = await prisma.remito.findFirst({
        where: { serviceId: id }
      });

      if (firstRemito) {
        // Crear el pago asociado tanto al remito como a la factura
        const payment = await prisma.payment.create({
          data: {
            amount: parseFloat(amount),
            date: new Date(),
            method: 'EFECTIVO',
            comprobante: `COBRO-EFECTIVO-${Date.now()}`,
            documents: {
              create: [
                {
                  remitoId: firstRemito.id,
                  amount: parseFloat(amount)
                },
                {
                  invoiceId: invoice.id,
                  amount: parseFloat(amount)
                }
              ]
            }
          }
        });

        console.log('--- [FACTURA INFORMAL] Pago en efectivo creado y asociado a remito y factura:', payment);
      }
    }

    console.log('--- [FACTURA INFORMAL] Cobro sin factura creado exitosamente ---');
    console.log('Factura creada:', invoice);
    console.log('Servicio actualizado:', updatedService);

    res.json({ 
      message: 'Cobro sin factura creado exitosamente', 
      service: updatedService,
      invoice: invoice
    });
  } catch (error) {
    console.error('Error al crear cobro sin factura:', error);
    res.status(500).json({ message: 'Error al crear cobro sin factura' });
  }
};

// Crear factura en negro (cobro sin factura) - MÚLTIPLES SERVICIOS
const createInformalInvoiceMultiple = async (req, res) => {
  try {
    console.log('--- [FACTURA INFORMAL MÚLTIPLE] Intentando crear cobro sin factura para múltiples servicios ---');
    console.log('Usuario autenticado:', req.user);
    console.log('Datos recibidos:', req.body);
    
    const { serviceIds, amount, paymentMethod = 'CUENTA_CORRIENTE' } = req.body;
    
    if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({ message: 'Debe proporcionar al menos un servicio' });
    }

    if (!amount) {
      return res.status(400).json({ message: 'El importe es obligatorio' });
    }

    // Verificar permisos
    const isAdminOrOperador = req.user.role === 'ADMIN' || req.user.role === 'OPERADOR';
    if (!isAdminOrOperador) {
      return res.status(403).json({ 
        message: 'Solo un administrador o un operador pueden crear cobros sin factura' 
      });
    }

    // Obtener todos los servicios
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      include: { 
        building: true,
        technician: true
      }
    });

    if (services.length !== serviceIds.length) {
      return res.status(404).json({ message: 'Algunos servicios no fueron encontrados' });
    }

    // Validar que todos los servicios tienen remito
    const invalidServices = services.filter(s => s.status !== 'CON_REMITO');
    if (invalidServices.length > 0) {
      return res.status(400).json({ 
        message: 'Todos los servicios deben tener remito antes de crear el cobro',
        invalidServices: invalidServices.map(s => s.id)
      });
    }

    // Validar que todos los servicios son del mismo edificio
    const buildingIds = [...new Set(services.map(s => s.buildingId))];
    if (buildingIds.length > 1) {
      return res.status(400).json({ 
        message: 'Todos los servicios deben pertenecer al mismo edificio',
        buildings: buildingIds
      });
    }

    // Crear la factura y actualizar todos los servicios en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear la factura
      const invoice = await tx.invoice.create({
        data: {
          amount: parseFloat(amount),
          status: 'PENDIENTE',
          paymentMethod: paymentMethod
        }
      });

      // Actualizar todos los servicios
      const updatedServices = await Promise.all(
        serviceIds.map(serviceId => 
          tx.service.update({
            where: { id: serviceId },
            data: {
              status: 'FACTURADO',
              invoiceId: invoice.id
            },
            include: {
              technician: true,
              building: {
                include: {
                  administrator: true
                }
              }
            }
          })
        )
      );

      return { invoice, services: updatedServices };
    });

    console.log('--- [FACTURA INFORMAL MÚLTIPLE] Cobro sin factura creado exitosamente ---');
    console.log('Factura creada:', result.invoice);
    console.log('Servicios actualizados:', result.services.length);

    res.json({ 
      message: `Cobro sin factura creado exitosamente para ${result.services.length} servicios`, 
      services: result.services,
      invoice: result.invoice
    });
  } catch (error) {
    console.error('Error al crear cobro sin factura múltiple:', error);
    res.status(500).json({ message: 'Error al crear cobro sin factura múltiple' });
  }
};

// Crear factura
const createInvoice = async (req, res) => {
  try {
    console.log('--- [FACTURA] Intentando crear factura ---');
    console.log('Usuario autenticado:', req.user);
    console.log('Datos recibidos:', req.body);
    
    const { id } = req.params;
    const { invoiceNumber, invoiceAmount, invoiceDate } = req.body;

    if (!invoiceNumber || !invoiceAmount || !invoiceDate) {
      return res.status(400).json({ message: 'Faltan datos obligatorios de la factura' });
    }

    const service = await prisma.service.findUnique({
      where: { id },
      include: { technician: true }
    });

    if (!service) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    // Verificar que el servicio tiene remito
    if (service.status !== 'CON_REMITO') {
      return res.status(400).json({ message: 'El servicio debe tener un remito antes de facturar' });
    }

    // Verificar permisos (solo ADMIN u OPERADOR pueden facturar)
    const isAdminOrOperador = req.user.role === 'ADMIN' || req.user.role === 'OPERADOR';
    if (!isAdminOrOperador) {
      return res.status(403).json({ 
        message: 'Solo un administrador o un operador pueden crear facturas' 
      });
    }

    // Crear la factura y actualizar el estado del servicio
    const [invoice, updatedService] = await prisma.$transaction([
      prisma.invoice.create({
        data: {
          serviceId: id,
          amount: parseFloat(invoiceAmount),
          status: 'EMITIDA'
        }
      }),
      prisma.service.update({
        where: { id },
        data: {
          status: 'FACTURADO'
        },
        include: {
          technician: true,
          invoice: true
        }
      })
    ]);

    res.json({ 
      message: 'Factura creada exitosamente', 
      service: updatedService,
      invoice: invoice
    });
  } catch (error) {
    console.error('Error al crear factura:', error);
    res.status(500).json({ message: 'Error al crear factura' });
  }
};

// Anular servicio
const cancelService = async (req, res) => {
  try {
    // Solo log en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('--- [CANCELAR] Intentando anular servicio ---');
      console.log('Usuario autenticado:', req.user);
    }
    
    const { id } = req.params;
    const { cancellationReason } = req.body;

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

    // Validar que se proporcione un motivo de anulación
    if (!cancellationReason || cancellationReason.trim() === '') {
      return res.status(400).json({ 
        message: 'Debe proporcionar un motivo de anulación' 
      });
    }

    // Actualizar el estado del servicio
    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        status: 'PENDIENTE',
        technicianId: null,
        visitDate: null,
        receiptImages: [],
        cancellationReason: cancellationReason.trim()
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

// Importar factura manualmente - INDIVIDUAL
const importInvoice = async (req, res) => {
  try {
    console.log('--- [IMPORTAR FACTURA] Intentando importar factura ---');
    console.log('Usuario autenticado:', req.user);
    console.log('Archivo recibido:', req.file);
    console.log('Datos del formulario:', req.body);
    
    const { id } = req.params;
    const { number, amount, date, paymentMethod } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No se ha subido el archivo de factura' });
    }

    if (!number || !amount) {
      return res.status(400).json({ message: 'Faltan datos obligatorios: número y monto de factura' });
    }

    const service = await prisma.service.findUnique({
      where: { id },
      include: { technician: true }
    });

    if (!service) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    // Verificar permisos
    const isAdminOrOperador = req.user.role === 'ADMIN' || req.user.role === 'OPERADOR';
    if (!isAdminOrOperador) {
      return res.status(403).json({ 
        message: 'Solo administradores y operadores pueden importar facturas' 
      });
    }

    // Validar tipo de archivo (solo PDF)
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ 
        message: 'Solo se permiten archivos PDF' 
      });
    }
    
    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return res.status(400).json({ 
        message: 'El archivo es demasiado grande. Máximo 10MB' 
      });
    }

    // Guardar la URL del archivo
    const fileUrl = file.location ? file.location : getFileUrl(file.filename);
    console.log('URL del archivo de factura:', fileUrl);
    
    // Crear la factura y actualizar el servicio
    const invoice = await prisma.invoice.create({
      data: {
        number: number.trim(),
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        fileUrl: fileUrl,
        status: 'EMITIDA',
        paymentMethod: paymentMethod || 'CUENTA_CORRIENTE',
        services: {
          connect: { id: id }
        }
      }
    });

    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        status: 'FACTURADO'
      },
      include: {
        technician: true,
        invoice: true
      }
    });
    
    console.log('Factura importada exitosamente:', invoice);
    console.log('Servicio actualizado:', updatedService);

    res.status(200).json({ 
      message: 'Factura importada exitosamente', 
      service: updatedService,
      invoice: invoice
    });
  } catch (error) {
    console.error('Error al importar factura:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: 'Error al importar factura', error: error.message });
  }
};

// Importar factura manualmente - MÚLTIPLES SERVICIOS
const importInvoiceMultiple = async (req, res) => {
  try {
    console.log('--- [IMPORTAR FACTURA MÚLTIPLE] Intentando importar factura para múltiples servicios ---');
    console.log('Usuario autenticado:', req.user);
    console.log('Archivo recibido:', req.file);
    console.log('Datos del formulario:', req.body);
    
    const { serviceIds, number, amount, date, paymentMethod } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No se ha subido el archivo de factura' });
    }

    if (!serviceIds) {
      return res.status(400).json({ message: 'Debe proporcionar los IDs de los servicios' });
    }

    // Parse serviceIds si viene como string JSON
    const parsedServiceIds = typeof serviceIds === 'string' ? JSON.parse(serviceIds) : serviceIds;

    if (!Array.isArray(parsedServiceIds) || parsedServiceIds.length === 0) {
      return res.status(400).json({ message: 'Debe proporcionar al menos un servicio' });
    }

    if (!number || !amount) {
      return res.status(400).json({ message: 'Faltan datos obligatorios: número y monto de factura' });
    }

    // Verificar permisos
    const isAdminOrOperador = req.user.role === 'ADMIN' || req.user.role === 'OPERADOR';
    if (!isAdminOrOperador) {
      return res.status(403).json({ 
        message: 'Solo administradores y operadores pueden importar facturas' 
      });
    }

    // Validar tipo de archivo (solo PDF)
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ 
        message: 'Solo se permiten archivos PDF' 
      });
    }
    
    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return res.status(400).json({ 
        message: 'El archivo es demasiado grande. Máximo 10MB' 
      });
    }

    // Obtener todos los servicios
    const services = await prisma.service.findMany({
      where: { id: { in: parsedServiceIds } },
      include: { building: true }
    });

    if (services.length !== parsedServiceIds.length) {
      return res.status(404).json({ message: 'Algunos servicios no fueron encontrados' });
    }

    // Validar que todos los servicios son del mismo edificio
    const buildingIds = [...new Set(services.map(s => s.buildingId))];
    if (buildingIds.length > 1) {
      return res.status(400).json({ 
        message: 'Todos los servicios deben pertenecer al mismo edificio',
        buildings: buildingIds
      });
    }

    // Guardar la URL del archivo
    const fileUrl = file.location ? file.location : getFileUrl(file.filename);
    console.log('URL del archivo de factura:', fileUrl);
    
    // Crear la factura y actualizar los servicios en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear la factura
      const invoice = await tx.invoice.create({
        data: {
          number: number.trim(),
          amount: parseFloat(amount),
          date: date ? new Date(date) : new Date(),
          fileUrl: fileUrl,
          status: 'EMITIDA',
          paymentMethod: paymentMethod || 'CUENTA_CORRIENTE'
        }
      });

      // Actualizar todos los servicios
      const updatedServices = await Promise.all(
        parsedServiceIds.map(serviceId => 
          tx.service.update({
            where: { id: serviceId },
            data: {
              status: 'FACTURADO',
              invoiceId: invoice.id
            },
            include: {
              technician: true,
              building: {
                include: {
                  administrator: true
                }
              }
            }
          })
        )
      );

      return { invoice, services: updatedServices };
    });
    
    console.log('Factura importada exitosamente:', result.invoice);
    console.log('Servicios actualizados:', result.services.length);

    res.status(200).json({ 
      message: `Factura importada exitosamente para ${result.services.length} servicios`, 
      services: result.services,
      invoice: result.invoice
    });
  } catch (error) {
    console.error('Error al importar factura múltiple:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: 'Error al importar factura múltiple', error: error.message });
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  createPastService,
  updateService,
  deleteService,
  saveDraft,
  assignTechnician,
  uploadReceipt,
  createInvoice,
  createInformalInvoice,
  createInformalInvoiceMultiple,
  importInvoice,
  importInvoiceMultiple,
  getTechnicians,
  getServiceCounts,
  getServiceStats,
  getAssignedServicesForTechnician,
  cancelService
}; 