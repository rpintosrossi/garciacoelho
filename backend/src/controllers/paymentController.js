const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Registrar un pago y asociar a facturas o remitos
const createPayment = async (req, res) => {
  try {
    console.log('💰 [PAYMENT] Iniciando creación de pago...');
    console.log('💰 [PAYMENT] Body recibido:', req.body);
    
    const { 
      amount, 
      date, 
      paymentMethodId, 
      docsToAssociate, 
      originalAmount, 
      discount, 
      discountReason 
    } = req.body;
    
    if (!amount || !date || !paymentMethodId) {
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    // Validar descuento
    const montoOriginal = originalAmount ? parseFloat(originalAmount) : parseFloat(amount);
    const montoDescuento = discount ? parseFloat(discount) : 0;
    const montoFinal = parseFloat(amount);

    if (montoDescuento > 0) {
      if (montoOriginal - montoDescuento !== montoFinal) {
        return res.status(400).json({ 
          message: 'El monto final debe ser igual al monto original menos el descuento.' 
        });
      }
    }

    // Validar suma de montos si hay documentos asociados
    if (docsToAssociate && docsToAssociate.length > 0) {
      const sumaMontos = docsToAssociate.reduce((sum, doc) => sum + (parseFloat(doc.amount) || 0), 0);
      if (sumaMontos > montoFinal) {
        return res.status(400).json({ 
          message: 'La suma de los montos aplicados a los documentos no puede superar el monto total del pago.' 
        });
      }
      
      // Permitir pagos parciales: el monto del pago puede ser menor al total de los documentos
      // Esto permite que quede un saldo pendiente en las facturas
      console.log('💰 [PAYMENT] Validación de pago parcial:', {
        montoFinal,
        sumaMontos,
        esPagoParcial: montoFinal < sumaMontos
      });
    }

    // Generar número de comprobante simple (timestamp + random)
    const comprobante = `PAGO-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;

    // Crear el pago principal
    console.log('💰 [PAYMENT] Creando pago con datos:', {
      amount: montoFinal,
      originalAmount: montoOriginal,
      discount: montoDescuento,
      discountReason: discountReason || null,
      date: new Date(date),
      paymentMethodId,
      comprobante,
      method: '',
    });
    
    const pago = await prisma.payment.create({
      data: {
        amount: montoFinal,
        originalAmount: montoOriginal,
        discount: montoDescuento,
        discountReason: discountReason || null,
        date: new Date(date),
        paymentMethodId,
        comprobante,
        method: '',
      }
    });
    
    console.log('💰 [PAYMENT] Pago creado exitosamente:', pago.id);

    // Asociar documentos con sus montos específicos
    if (docsToAssociate && docsToAssociate.length > 0) {
      console.log('💰 [PAYMENT] Asociando documentos al pago:', {
        pagoId: pago.id,
        montoPago: montoFinal,
        cantidadDocumentos: docsToAssociate.length,
        documentos: docsToAssociate.map(d => ({
          type: d.type,
          id: d.id,
          montoAplicado: d.amount
        }))
      });
      
      for (const doc of docsToAssociate) {
        const montoAplicado = parseFloat(doc.amount) || 0;
        console.log(`💰 [PAYMENT] Creando PaymentDocument:`, {
          paymentId: pago.id,
          type: doc.type,
          documentId: doc.id,
          amount: montoAplicado
        });
        
        const paymentDoc = await prisma.paymentDocument.create({
          data: {
            paymentId: pago.id,
            invoiceId: doc.type === 'FACTURA' ? doc.id : null,
            remitoId: doc.type === 'REMITO' ? doc.id : null,
            amount: montoAplicado
          }
        });
        console.log('✅ [PAYMENT] PaymentDocument creado:', {
          id: paymentDoc.id,
          amount: paymentDoc.amount,
          invoiceId: paymentDoc.invoiceId,
          remitoId: paymentDoc.remitoId
        });
      }
    } else {
      console.log('💰 [PAYMENT] No hay documentos para asociar');
    }

    res.status(201).json({
      ...pago,
      message: 'Pago registrado exitosamente',
      documentsAssociated: docsToAssociate ? docsToAssociate.length : 0
    });
  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ message: 'Error al registrar pago' });
  }
};

// Obtener todos los pagos con información de descuentos
const getPayments = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        paymentMethod: true,
        documents: {
          include: {
            invoice: {
              include: {
                service: {
                  include: {
                    building: true
                  }
                }
              }
            },
            remito: {
              include: {
                service: {
                  include: {
                    building: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Formatear respuesta con información de descuentos
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      originalAmount: payment.originalAmount,
      discount: payment.discount,
      discountReason: payment.discountReason,
      date: payment.date,
      method: payment.method,
      comprobante: payment.comprobante,
      paymentMethod: payment.paymentMethod,
      documents: payment.documents,
      hasDiscount: payment.discount > 0,
      discountPercentage: payment.originalAmount ? 
        ((payment.discount / payment.originalAmount) * 100).toFixed(2) : 0
    }));

    res.json(formattedPayments);
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({ message: 'Error al obtener pagos' });
  }
};

// Obtener pagos por edificio con búsqueda por CUIT o nombre
const getBuildingPayments = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    
    console.log('💰 [BUILDING PAYMENTS] Obteniendo pagos por edificio...');
    console.log('💰 [BUILDING PAYMENTS] Parámetros:', { search, page, limit });

    // Primero buscar edificios que coincidan con el filtro
    let buildingIds = [];
    if (search) {
      const buildings = await prisma.building.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { cuit: { contains: search, mode: 'insensitive' } }
          ]
        },
        select: { id: true }
      });
      buildingIds = buildings.map(b => b.id);
    }

    // Construir el where para los pagos
    let whereClause = {};
    
    if (search && buildingIds.length > 0) {
      // Si hay búsqueda, filtrar por edificios encontrados
      whereClause = {
        documents: {
          some: {
            OR: [
              {
                invoice: {
                  service: {
                    buildingId: { in: buildingIds }
                  }
                }
              },
              {
                remito: {
                  service: {
                    buildingId: { in: buildingIds }
                  }
                }
              }
            ]
          }
        }
      };
    } else if (search && buildingIds.length === 0) {
      // Si hay búsqueda pero no se encontraron edificios, retornar vacío
      return res.json({
        payments: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      });
    }

    // Contar total
    const total = await prisma.payment.count({ where: whereClause });
    const totalPages = Math.ceil(total / parseInt(limit));
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Obtener pagos con paginación
    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        paymentMethod: true,
        documents: {
          include: {
            invoice: {
              include: {
                service: {
                  include: {
                    building: {
                      include: {
                        administrator: true
                      }
                    }
                  }
                }
              }
            },
            remito: {
              include: {
                service: {
                  include: {
                    building: {
                      include: {
                        administrator: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      skip,
      take: parseInt(limit)
    });

    // Formatear respuesta agrupando por edificio
    const formattedPayments = payments.map(payment => {
      // Obtener el edificio del primer documento
      const firstDoc = payment.documents[0];
      const building = firstDoc?.invoice?.service?.building || firstDoc?.remito?.service?.building;
      
      return {
        id: payment.id,
        amount: payment.amount,
        originalAmount: payment.originalAmount,
        discount: payment.discount,
        discountReason: payment.discountReason,
        date: payment.date,
        comprobante: payment.comprobante,
        paymentMethod: payment.paymentMethod,
        building: building ? {
          id: building.id,
          name: building.name,
          cuit: building.cuit,
          address: building.address,
          administrator: building.administrator
        } : null,
        documents: payment.documents.map(doc => ({
          id: doc.id,
          amount: doc.amount,
          type: doc.invoiceId ? 'FACTURA' : 'REMITO',
          invoiceId: doc.invoiceId,
          remitoId: doc.remitoId,
          invoiceNumber: doc.invoice?.number,
          remitoNumber: doc.remito?.number
        })),
        hasDiscount: payment.discount > 0
      };
    });

    console.log('✅ [BUILDING PAYMENTS] Pagos encontrados:', formattedPayments.length);

    res.json({
      payments: formattedPayments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error al obtener pagos por edificio:', error);
    res.status(500).json({ message: 'Error al obtener pagos por edificio' });
  }
};

// Obtener pagos masivos por administrador
const getAdministratorPayments = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    
    console.log('💰 [ADMIN PAYMENTS] Obteniendo pagos por administrador...');
    console.log('💰 [ADMIN PAYMENTS] Parámetros:', { search, page, limit });

    // Primero buscar administradores que coincidan con el filtro
    let adminIds = [];
    if (search) {
      const administrators = await prisma.administrator.findMany({
        where: {
          name: { contains: search, mode: 'insensitive' }
        },
        select: { id: true }
      });
      adminIds = administrators.map(a => a.id);
    }

    // Construir el where para los pagos
    let whereClause = {};
    
    if (search && adminIds.length > 0) {
      // Si hay búsqueda, filtrar por administradores encontrados
      whereClause = {
        documents: {
          some: {
            OR: [
              {
                invoice: {
                  service: {
                    building: {
                      administratorId: { in: adminIds }
                    }
                  }
                }
              },
              {
                remito: {
                  service: {
                    building: {
                      administratorId: { in: adminIds }
                    }
                  }
                }
              }
            ]
          }
        }
      };
    } else if (search && adminIds.length === 0) {
      // Si hay búsqueda pero no se encontraron administradores, retornar vacío
      return res.json({
        payments: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      });
    }

    // Filtrar solo pagos masivos (que tienen documentos de múltiples edificios)
    const allPayments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        paymentMethod: true,
        documents: {
          include: {
            invoice: {
              include: {
                service: {
                  include: {
                    building: {
                      include: {
                        administrator: true
                      }
                    }
                  }
                }
              }
            },
            remito: {
              include: {
                service: {
                  include: {
                    building: {
                      include: {
                        administrator: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Filtrar solo pagos masivos (múltiples edificios)
    const massivePayments = allPayments.filter(payment => {
      const buildingIds = new Set();
      payment.documents.forEach(doc => {
        const buildingId = doc.invoice?.service?.buildingId || doc.remito?.service?.buildingId;
        if (buildingId) buildingIds.add(buildingId);
      });
      return buildingIds.size > 1; // Solo pagos que impactan más de un edificio
    });

    // Paginación manual
    const total = massivePayments.length;
    const totalPages = Math.ceil(total / parseInt(limit));
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedPayments = massivePayments.slice(skip, skip + parseInt(limit));

    // Formatear respuesta
    const formattedPayments = paginatedPayments.map(payment => {
      // Agrupar documentos por edificio
      const buildingMap = new Map();
      payment.documents.forEach(doc => {
        const building = doc.invoice?.service?.building || doc.remito?.service?.building;
        if (building) {
          if (!buildingMap.has(building.id)) {
            buildingMap.set(building.id, {
              building: {
                id: building.id,
                name: building.name,
                cuit: building.cuit,
                address: building.address
              },
              documents: []
            });
          }
          buildingMap.get(building.id).documents.push({
            id: doc.id,
            amount: doc.amount,
            type: doc.invoiceId ? 'FACTURA' : 'REMITO',
            invoiceId: doc.invoiceId,
            remitoId: doc.remitoId,
            invoiceNumber: doc.invoice?.number,
            remitoNumber: doc.remito?.number
          });
        }
      });

      // Obtener administrador del primer edificio
      const firstBuilding = payment.documents[0]?.invoice?.service?.building || 
                           payment.documents[0]?.remito?.service?.building;
      
      return {
        id: payment.id,
        amount: payment.amount,
        originalAmount: payment.originalAmount,
        discount: payment.discount,
        discountReason: payment.discountReason,
        date: payment.date,
        comprobante: payment.comprobante,
        paymentMethod: payment.paymentMethod,
        administrator: firstBuilding?.administrator ? {
          id: firstBuilding.administrator.id,
          name: firstBuilding.administrator.name,
          email: firstBuilding.administrator.email
        } : null,
        buildings: Array.from(buildingMap.values()),
        buildingCount: buildingMap.size,
        hasDiscount: payment.discount > 0
      };
    });

    console.log('✅ [ADMIN PAYMENTS] Pagos masivos encontrados:', formattedPayments.length);

    res.json({
      payments: formattedPayments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error al obtener pagos por administrador:', error);
    res.status(500).json({ message: 'Error al obtener pagos por administrador' });
  }
};

module.exports = { 
  createPayment, 
  getPayments,
  getBuildingPayments,
  getAdministratorPayments
}; 