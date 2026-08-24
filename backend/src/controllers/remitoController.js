const { PrismaClient } = require('@prisma/client');
const { getFileUrl } = require('../utils/fileUtils');
const prisma = new PrismaClient();

// Generar número de remito automático (simple: fecha + random)
function generarNumeroRemito() {
  const now = new Date();
  return (
    'R' +
    now.getFullYear().toString().slice(-2) +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    '-' +
    Math.floor(1000 + Math.random() * 9000)
  );
}

// Crear remito
const createRemito = async (req, res) => {
  try {
    const { serviceId, amount, date, number } = req.body;
    if (!serviceId || !amount) {
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }
    // Verificar que el servicio existe
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return res.status(404).json({ message: 'Servicio no encontrado' });
    // Generar número si no se envía
    let remitoNumber = number;
    if (!remitoNumber) {
      let unique = false;
      while (!unique) {
        remitoNumber = generarNumeroRemito();
        const exists = await prisma.remito.findUnique({ where: { number: remitoNumber } });
        if (!exists) unique = true;
      }
    }

    // Parsear fecha como mediodía UTC para evitar desfasaje de zona horaria
    const parseDateNoon = (d) => {
      if (!d) return new Date();
      const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12, 0, 0));
      return new Date(d);
    };

    // Crear el remito y actualizar el estado del servicio en una transacción
    const [remito, updatedService] = await prisma.$transaction([
      prisma.remito.create({
        data: {
          serviceId,
          amount: parseFloat(amount),
          date: parseDateNoon(date),
          number: remitoNumber
        }
      }),
      prisma.service.update({
        where: { id: serviceId },
        data: { status: 'FACTURADO' }
      })
    ]);

    res.status(201).json({ remito, service: updatedService });
  } catch (error) {
    console.error('Error al crear remito:', error);
    res.status(500).json({ message: 'Error al crear remito' });
  }
};

// Actualizar fecha, número y/o archivo de remito
const updateRemitoDate = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, number } = req.body;
    const files = req.files;
    const hasNumber = number !== undefined && number !== null && String(number).trim() !== '';
    const hasFiles = files && files.length > 0;

    if (!date && !hasNumber && !hasFiles) {
      return res.status(400).json({ message: 'Fecha, número o archivo de remito requeridos' });
    }

    const remito = await prisma.remito.findUnique({ where: { id } });
    if (!remito) return res.status(404).json({ message: 'Remito no encontrado' });

    const data = {};

    if (date) {
      const m = String(date).match(/^(\d{4})-(\d{2})-(\d{2})/);
      data.date = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12, 0, 0)) : new Date(date);
    }

    if (hasNumber) {
      const trimmed = String(number).trim();
      if (trimmed !== remito.number) {
        const existing = await prisma.remito.findFirst({
          where: {
            serviceId: remito.serviceId,
            number: trimmed,
            NOT: { id: remito.id }
          }
        });
        if (existing) {
          return res.status(400).json({
            message: `Ya existe un remito con el número "${trimmed}" para este servicio`
          });
        }
        data.number = trimmed;
      }
    }

    if (hasFiles) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'application/pdf'];
      for (const file of files) {
        if (!allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({ message: 'Solo se permiten archivos JPG y PDF' });
        }
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          return res.status(400).json({ message: 'El archivo es demasiado grande. Máximo 10MB' });
        }
      }

      const fileUrls = files.map(file => file.location || getFileUrl(file.filename));
      data.receiptImages = fileUrls;

      const service = await prisma.service.findUnique({ where: { id: remito.serviceId } });
      if (service) {
        const oldImages = remito.receiptImages || [];
        const remaining = (service.receiptImages || []).filter(url => !oldImages.includes(url));
        await prisma.service.update({
          where: { id: remito.serviceId },
          data: { receiptImages: [...remaining, ...fileUrls] }
        });
      }
    }

    if (Object.keys(data).length === 0) {
      return res.json(remito);
    }

    const updated = await prisma.remito.update({
      where: { id },
      data
    });
    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar remito:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Ya existe un remito con ese número para este servicio' });
    }
    res.status(500).json({ message: 'Error al actualizar remito' });
  }
};

module.exports = { createRemito, updateRemitoDate };