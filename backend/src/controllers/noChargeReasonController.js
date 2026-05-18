const prisma = require('../lib/prisma');

const getAll = async (req, res) => {
  try {
    const reasons = await prisma.noChargeReason.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(reasons);
  } catch (error) {
    console.error('Error al obtener motivos sin cobro:', error);
    res.status(500).json({ message: 'Error al obtener motivos sin cobro', error: error.message });
  }
};

const create = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }
    const reason = await prisma.noChargeReason.create({
      data: { name: name.trim(), description: description?.trim() || null }
    });
    res.status(201).json(reason);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Ya existe un motivo con ese nombre' });
    }
    console.error('Error al crear motivo sin cobro:', error);
    res.status(500).json({ message: 'Error al crear motivo sin cobro', error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }
    const reason = await prisma.noChargeReason.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        ...(isActive !== undefined && { isActive })
      }
    });
    res.json(reason);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Ya existe un motivo con ese nombre' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Motivo no encontrado' });
    }
    console.error('Error al actualizar motivo sin cobro:', error);
    res.status(500).json({ message: 'Error al actualizar motivo sin cobro', error: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const inUse = await prisma.service.count({ where: { noChargeReasonId: id } });
    if (inUse > 0) {
      return res.status(409).json({ message: `No se puede eliminar: está siendo usado en ${inUse} servicio(s)` });
    }
    await prisma.noChargeReason.delete({ where: { id } });
    res.json({ message: 'Motivo eliminado correctamente' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Motivo no encontrado' });
    }
    console.error('Error al eliminar motivo sin cobro:', error);
    res.status(500).json({ message: 'Error al eliminar motivo sin cobro', error: error.message });
  }
};

module.exports = { getAll, create, update, remove };
