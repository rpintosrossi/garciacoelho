const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todas las categorías
const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { Stock: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transformar el resultado para que coincida con el frontend
    const categoriesWithCount = categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      productCount: category._count.Stock,
      createdAt: category.createdAt.toISOString().split('T')[0],
      updatedAt: category.updatedAt
    }));

    res.json(categoriesWithCount);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ message: 'Error al obtener categorías', error: error.message });
  }
};

// Obtener una categoría por ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        Stock: true,
        _count: {
          select: { Stock: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    const categoryWithCount = {
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      productCount: category._count.Stock,
      createdAt: category.createdAt.toISOString().split('T')[0],
      updatedAt: category.updatedAt,
      products: category.Stock
    };

    res.json(categoryWithCount);
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    res.status(500).json({ message: 'Error al obtener categoría', error: error.message });
  }
};

// Crear una nueva categoría
const createCategory = async (req, res) => {
  try {
    const { name, description, color } = req.body;

    // Validar campos requeridos
    if (!name || !description || !color) {
      return res.status(400).json({ 
        message: 'Nombre, descripción y color son obligatorios' 
      });
    }

    // Verificar si ya existe una categoría con ese nombre
    const existingCategory = await prisma.category.findUnique({
      where: { name }
    });

    if (existingCategory) {
      return res.status(400).json({ 
        message: 'Ya existe una categoría con ese nombre' 
      });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
        color
      },
      include: {
        _count: {
          select: { Stock: true }
        }
      }
    });

    const categoryWithCount = {
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      productCount: category._count.Stock,
      createdAt: category.createdAt.toISOString().split('T')[0],
      updatedAt: category.updatedAt
    };

    res.status(201).json(categoryWithCount);
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({ message: 'Error al crear categoría', error: error.message });
  }
};

// Actualizar una categoría
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;

    // Verificar si la categoría existe
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Si se está cambiando el nombre, verificar que no exista otra con ese nombre
    if (name && name !== existingCategory.name) {
      const duplicateCategory = await prisma.category.findUnique({
        where: { name }
      });

      if (duplicateCategory) {
        return res.status(400).json({ 
          message: 'Ya existe una categoría con ese nombre' 
        });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(color && { color })
      },
      include: {
        _count: {
          select: { Stock: true }
        }
      }
    });

    const categoryWithCount = {
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      productCount: category._count.Stock,
      createdAt: category.createdAt.toISOString().split('T')[0],
      updatedAt: category.updatedAt
    };

    res.json(categoryWithCount);
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({ message: 'Error al actualizar categoría', error: error.message });
  }
};

// Eliminar una categoría
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si la categoría existe
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { Stock: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Verificar si tiene productos asociados
    if (category._count.Stock > 0) {
      return res.status(400).json({ 
        message: `No se puede eliminar la categoría porque tiene ${category._count.Stock} productos asociados` 
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ message: 'Error al eliminar categoría', error: error.message });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};

