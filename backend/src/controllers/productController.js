const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los productos
const getProducts = async (req, res) => {
  try {
    const { categoryId, lowStock } = req.query;

    // Construir el filtro
    const where = {};
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const products = await prisma.stock.findMany({
      where,
      include: {
        Category: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Filtrar productos con stock bajo si se solicita
    let filteredProducts = products;
    if (lowStock === 'true') {
      filteredProducts = products.filter(p => p.quantity <= p.minQuantity);
    }

    // Transformar el resultado para que coincida con el frontend
    const productsFormatted = filteredProducts.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.Category.name,
      categoryId: product.categoryId,
      quantity: product.quantity,
      minQuantity: product.minQuantity,
      unit: product.unit,
      price: product.price,
      supplier: product.supplier,
      lastUpdated: product.updatedAt.toISOString().split('T')[0],
      createdAt: product.createdAt
    }));

    res.json(productsFormatted);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ message: 'Error al obtener productos', error: error.message });
  }
};

// Obtener productos con stock bajo
const getLowStockProducts = async (req, res) => {
  try {
    // Usar SQL raw directamente ya que la comparación de columnas no funciona bien con Prisma
    const products = await prisma.$queryRaw`
      SELECT s.*, c.name as category_name, c.color as category_color
      FROM "Stock" s
      INNER JOIN "Category" c ON s."categoryId" = c.id
      WHERE s.quantity <= s."minQuantity"
      ORDER BY s.quantity ASC
    `;

    const productsFormatted = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category_name,
      categoryId: product.categoryId,
      quantity: parseInt(product.quantity),
      minQuantity: parseInt(product.minQuantity),
      unit: product.unit,
      price: parseFloat(product.price),
      supplier: product.supplier,
      lastUpdated: new Date(product.updatedAt).toISOString().split('T')[0],
      createdAt: product.createdAt
    }));

    res.json(productsFormatted);
  } catch (error) {
    console.error('Error al obtener productos con stock bajo:', error);
    res.status(500).json({ message: 'Error al obtener productos con stock bajo', error: error.message });
  }
};

// Obtener un producto por ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.stock.findUnique({
      where: { id },
      include: {
        Category: true
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const productFormatted = {
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.Category.name,
      categoryId: product.categoryId,
      quantity: product.quantity,
      minQuantity: product.minQuantity,
      unit: product.unit,
      price: product.price,
      supplier: product.supplier,
      lastUpdated: product.updatedAt.toISOString().split('T')[0],
      createdAt: product.createdAt
    };

    res.json(productFormatted);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({ message: 'Error al obtener producto', error: error.message });
  }
};

// Crear un nuevo producto
const createProduct = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      category, 
      categoryId,
      quantity, 
      minQuantity, 
      unit, 
      price, 
      supplier 
    } = req.body;

    // Validar campos requeridos
    if (!name || !description || !unit) {
      return res.status(400).json({ 
        message: 'Nombre, descripción y unidad son obligatorios' 
      });
    }

    // Obtener categoryId si se proporciona el nombre de la categoría
    let finalCategoryId = categoryId;
    if (!finalCategoryId && category) {
      const categoryRecord = await prisma.category.findFirst({
        where: { name: category }
      });
      
      if (!categoryRecord) {
        return res.status(400).json({ 
          message: `La categoría "${category}" no existe` 
        });
      }
      
      finalCategoryId = categoryRecord.id;
    }

    if (!finalCategoryId) {
      return res.status(400).json({ 
        message: 'Debe proporcionar una categoría' 
      });
    }

    // Verificar que la categoría existe
    const categoryExists = await prisma.category.findUnique({
      where: { id: finalCategoryId }
    });

    if (!categoryExists) {
      return res.status(400).json({ 
        message: 'La categoría especificada no existe' 
      });
    }

    const product = await prisma.stock.create({
      data: {
        name,
        description,
        categoryId: finalCategoryId,
        quantity: quantity || 0,
        minQuantity: minQuantity || 0,
        unit,
        price: price || 0,
        supplier: supplier || ''
      },
      include: {
        Category: true
      }
    });

    const productFormatted = {
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.Category.name,
      categoryId: product.categoryId,
      quantity: product.quantity,
      minQuantity: product.minQuantity,
      unit: product.unit,
      price: product.price,
      supplier: product.supplier,
      lastUpdated: product.updatedAt.toISOString().split('T')[0],
      createdAt: product.createdAt
    };

    res.status(201).json(productFormatted);
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ message: 'Error al crear producto', error: error.message });
  }
};

// Actualizar un producto
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      category,
      categoryId,
      quantity, 
      minQuantity, 
      unit, 
      price, 
      supplier 
    } = req.body;

    // Verificar si el producto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Obtener categoryId si se proporciona el nombre de la categoría
    let finalCategoryId = categoryId;
    if (!finalCategoryId && category) {
      const categoryRecord = await prisma.category.findFirst({
        where: { name: category }
      });
      
      if (categoryRecord) {
        finalCategoryId = categoryRecord.id;
      }
    }

    // Si se proporciona un nuevo categoryId, verificar que existe
    if (finalCategoryId && finalCategoryId !== existingProduct.categoryId) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: finalCategoryId }
      });

      if (!categoryExists) {
        return res.status(400).json({ 
          message: 'La categoría especificada no existe' 
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (finalCategoryId !== undefined) updateData.categoryId = finalCategoryId;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (minQuantity !== undefined) updateData.minQuantity = minQuantity;
    if (unit !== undefined) updateData.unit = unit;
    if (price !== undefined) updateData.price = price;
    if (supplier !== undefined) updateData.supplier = supplier || '';

    const product = await prisma.stock.update({
      where: { id },
      data: updateData,
      include: {
        Category: true
      }
    });

    const productFormatted = {
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.Category.name,
      categoryId: product.categoryId,
      quantity: product.quantity,
      minQuantity: product.minQuantity,
      unit: product.unit,
      price: product.price,
      supplier: product.supplier,
      lastUpdated: product.updatedAt.toISOString().split('T')[0],
      createdAt: product.createdAt
    };

    res.json(productFormatted);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ message: 'Error al actualizar producto', error: error.message });
  }
};

// Eliminar un producto
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el producto existe
    const product = await prisma.stock.findUnique({
      where: { id }
    });

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    await prisma.stock.delete({
      where: { id }
    });

    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ message: 'Error al eliminar producto', error: error.message });
  }
};

// Actualizar la cantidad de un producto (útil para movimientos de stock)
const updateProductQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ 
        message: 'La cantidad es obligatoria' 
      });
    }

    // Verificar si el producto existe
    const product = await prisma.stock.findUnique({
      where: { id },
      include: {
        Category: true
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    let newQuantity;
    if (operation === 'add') {
      newQuantity = product.quantity + quantity;
    } else if (operation === 'subtract') {
      newQuantity = Math.max(0, product.quantity - quantity);
    } else {
      newQuantity = quantity;
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { quantity: newQuantity },
      include: {
        Category: true
      }
    });

    const productFormatted = {
      id: updatedProduct.id,
      name: updatedProduct.name,
      description: updatedProduct.description,
      category: updatedProduct.category.name,
      categoryId: updatedProduct.categoryId,
      quantity: updatedProduct.quantity,
      minQuantity: updatedProduct.minQuantity,
      unit: updatedProduct.unit,
      price: updatedProduct.price,
      supplier: updatedProduct.supplier || '',
      lastUpdated: updatedProduct.updatedAt.toISOString().split('T')[0],
      createdAt: updatedProduct.createdAt
    };

    res.json(productFormatted);
  } catch (error) {
    console.error('Error al actualizar cantidad del producto:', error);
    res.status(500).json({ message: 'Error al actualizar cantidad del producto', error: error.message });
  }
};

module.exports = {
  getProducts,
  getLowStockProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductQuantity
};

