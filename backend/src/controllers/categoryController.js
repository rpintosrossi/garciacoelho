const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todas las categorías
const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { stockItems: true }
        }
      }
    });
    
    // Transformar para incluir productCount
    const categoriesWithCount = categories.map(category => ({
      ...category,
      productCount: category._count.stockItems
    }));
    
    res.json(categoriesWithCount);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ message: 'Error al obtener categorías' });
  }
};

// Obtener una categoría por ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { stockItems: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    res.json({
      ...category,
      productCount: category._count.stockItems
    });
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    res.status(500).json({ message: 'Error al obtener categoría' });
  }
};

// Crear nueva categoría
const createCategory = async (req, res) => {
  try {
    const { name, description, color } = req.body;

    // Validar datos requeridos
    if (!name || !description) {
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    // Verificar que no existe una categoría con el mismo nombre
    const existingCategory = await prisma.category.findUnique({
      where: { name }
    });

    if (existingCategory) {
      return res.status(400).json({ message: 'Ya existe una categoría con este nombre' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
        color: color || '#2196f3'
      }
    });

    res.status(201).json({
      ...category,
      productCount: 0
    });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({ message: 'Error al crear categoría' });
  }
};

// Actualizar categoría
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;

    // Verificar que la categoría existe
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Si se está cambiando el nombre, verificar que no existe otra con el mismo nombre
    if (name && name !== existingCategory.name) {
      const duplicateCategory = await prisma.category.findUnique({
        where: { name }
      });

      if (duplicateCategory) {
        return res.status(400).json({ message: 'Ya existe una categoría con este nombre' });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        description,
        color
      },
      include: {
        _count: {
          select: { stockItems: true }
        }
      }
    });

    res.json({
      ...category,
      productCount: category._count.stockItems
    });
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({ message: 'Error al actualizar categoría' });
  }
};

// Eliminar categoría
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la categoría existe
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { stockItems: true }
        }
      }
    });

    if (!existingCategory) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Verificar que no tiene productos asociados
    if (existingCategory._count.stockItems > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar una categoría que tiene productos asociados' 
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    res.json({ message: 'Categoría eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ message: 'Error al eliminar categoría' });
  }
};

// Obtener categoría por nombre
const getCategoryByName = async (req, res) => {
  try {
    const { name } = req.params;
    const category = await prisma.category.findUnique({
      where: { name },
      include: {
        _count: {
          select: { stockItems: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    res.json({
      ...category,
      productCount: category._count.stockItems
    });
  } catch (error) {
    console.error('Error al obtener categoría por nombre:', error);
    res.status(500).json({ message: 'Error al obtener categoría' });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryByName
};
