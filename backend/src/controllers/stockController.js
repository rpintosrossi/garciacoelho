const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los items de stock
const getStockItems = async (req, res) => {
  try {
    const items = await prisma.stock.findMany({
      include: {
        category: true
      },
      orderBy: { name: 'asc' }
    });
    res.json(items);
  } catch (error) {
    console.error('Error al obtener items de stock:', error);
    res.status(500).json({ message: 'Error al obtener items de stock' });
  }
};

// Obtener un item de stock por ID
const getStockItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.stock.findUnique({
      where: { id },
      include: {
        category: true
      }
    });

    if (!item) {
      return res.status(404).json({ message: 'Item de stock no encontrado' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error al obtener item de stock:', error);
    res.status(500).json({ message: 'Error al obtener item de stock' });
  }
};

// Crear nuevo item de stock
const createStockItem = async (req, res) => {
  try {
    const { name, description, categoryId, quantity, minQuantity, unit, price, supplier } = req.body;

    // Validar datos requeridos
    if (!name || !description || !categoryId || !unit || !supplier) {
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    // Verificar que la categoría existe
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return res.status(400).json({ message: 'Categoría no encontrada' });
    }

    const item = await prisma.stock.create({
      data: {
        name,
        description,
        categoryId,
        quantity: quantity || 0,
        minQuantity: minQuantity || 0,
        unit,
        price: price || 0,
        supplier
      },
      include: {
        category: true
      }
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Error al crear item de stock:', error);
    res.status(500).json({ message: 'Error al crear item de stock' });
  }
};

// Actualizar item de stock
const updateStockItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, categoryId, quantity, minQuantity, unit, price, supplier } = req.body;

    // Verificar que el item existe
    const existingItem = await prisma.stock.findUnique({
      where: { id }
    });

    if (!existingItem) {
      return res.status(404).json({ message: 'Item de stock no encontrado' });
    }

    // Si se está cambiando la categoría, verificar que existe
    if (categoryId && categoryId !== existingItem.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      });

      if (!category) {
        return res.status(400).json({ message: 'Categoría no encontrada' });
      }
    }

    const item = await prisma.stock.update({
      where: { id },
      data: {
        name,
        description,
        categoryId,
        quantity,
        minQuantity,
        unit,
        price,
        supplier
      },
      include: {
        category: true
      }
    });

    res.json(item);
  } catch (error) {
    console.error('Error al actualizar item de stock:', error);
    res.status(500).json({ message: 'Error al actualizar item de stock' });
  }
};

// Actualizar solo la cantidad de stock
const updateStockQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity < 0) {
      return res.status(400).json({ message: 'La cantidad no puede ser negativa' });
    }

    const item = await prisma.stock.update({
      where: { id },
      data: { quantity }
    });

    res.json(item);
  } catch (error) {
    console.error('Error al actualizar cantidad de stock:', error);
    res.status(500).json({ message: 'Error al actualizar cantidad de stock' });
  }
};

// Eliminar item de stock
const deleteStockItem = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el item existe
    const existingItem = await prisma.stock.findUnique({
      where: { id }
    });

    if (!existingItem) {
      return res.status(404).json({ message: 'Item de stock no encontrado' });
    }

    await prisma.stock.delete({
      where: { id }
    });

    res.json({ message: 'Item de stock eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar item de stock:', error);
    res.status(500).json({ message: 'Error al eliminar item de stock' });
  }
};

// Obtener estadísticas de stock
const getStockStats = async (req, res) => {
  try {
    const totalItems = await prisma.stock.count();
    const lowStockItems = await prisma.stock.count({
      where: {
        quantity: {
          lte: prisma.stock.fields.minQuantity
        }
      }
    });
    const outOfStockItems = await prisma.stock.count({
      where: {
        quantity: 0
      }
    });

    const totalValue = await prisma.stock.aggregate({
      _sum: {
        price: true
      }
    });

    res.json({
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalValue: totalValue._sum.price || 0
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de stock:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas de stock' });
  }
};

// Obtener productos con stock bajo
const getLowStockItems = async (req, res) => {
  try {
    const lowStockItems = await prisma.stock.findMany({
      where: {
        quantity: {
          lte: prisma.stock.fields.minQuantity
        }
      },
      include: {
        category: true
      },
      orderBy: {
        quantity: 'asc'
      }
    });

    res.json(lowStockItems);
  } catch (error) {
    console.error('Error al obtener productos con stock bajo:', error);
    res.status(500).json({ message: 'Error al obtener productos con stock bajo' });
  }
};

module.exports = {
  getStockItems,
  getStockItemById,
  createStockItem,
  updateStockItem,
  updateStockQuantity,
  deleteStockItem,
  getStockStats,
  getLowStockItems
};
