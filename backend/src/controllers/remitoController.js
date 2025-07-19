const { PrismaClient } = require('@prisma/client');
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

    // Crear el remito y actualizar el estado del servicio en una transacción
    const [remito, updatedService] = await prisma.$transaction([
      prisma.remito.create({
        data: {
          serviceId,
          amount: parseFloat(amount),
          date: date ? new Date(date) : new Date(),
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

module.exports = { createRemito }; 