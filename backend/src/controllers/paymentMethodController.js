const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Listar todos los medios de pago
const getPaymentMethods = async (req, res) => {
  try {
    const methods = await prisma.paymentMethod.findMany({ orderBy: { name: 'asc' } });
    res.json(methods);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener medios de pago' });
  }
};

// Crear un medio de pago
const createPaymentMethod = async (req, res) => {
  try {
    const { name } = req.body;
    const exists = await prisma.paymentMethod.findUnique({ where: { name } });
    if (exists) return res.status(400).json({ message: 'Ya existe un medio de pago con ese nombre' });
    const method = await prisma.paymentMethod.create({ data: { name } });
    res.status(201).json(method);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear medio de pago' });
  }
};

// Editar un medio de pago
const updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const exists = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ message: 'No encontrado' });
    const nameExists = await prisma.paymentMethod.findFirst({ where: { name, NOT: { id } } });
    if (nameExists) return res.status(400).json({ message: 'Ya existe un medio de pago con ese nombre' });
    const method = await prisma.paymentMethod.update({ where: { id }, data: { name } });
    res.json(method);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar medio de pago' });
  }
};

// Eliminar un medio de pago
const deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.paymentMethod.delete({ where: { id } });
    res.json({ message: 'Eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar medio de pago' });
  }
};

module.exports = {
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod
}; 