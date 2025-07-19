const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los clientes con filtros opcionales
const getClients = async (req, res) => {
  try {
    const { search, taxCondition } = req.query;
    
    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { cuit: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (taxCondition) {
      where.taxCondition = taxCondition;
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        account: true,
      },
      orderBy: {
        name: 'asc'
      }
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener clientes' });
  }
};

// Obtener un cliente por ID
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        account: true,
        services: {
          include: {
            technician: true,
            operator: true,
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el cliente' });
  }
};

// Crear un nuevo cliente
const createClient = async (req, res) => {
  try {
    const { name, address, cuit, contact, taxCondition } = req.body;

    const existingClient = await prisma.client.findUnique({
      where: { cuit },
    });

    if (existingClient) {
      return res.status(400).json({ message: 'El CUIT ya está registrado' });
    }

    const client = await prisma.client.create({
      data: {
        name,
        address,
        cuit,
        contact,
        taxCondition,
        account: {
          create: {
            balance: 0,
          },
        },
      },
      include: {
        account: true,
      },
    });

    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el cliente' });
  }
};

// Actualizar un cliente
const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, cuit, contact, taxCondition } = req.body;

    const client = await prisma.client.update({
      where: { id },
      data: {
        name,
        address,
        cuit,
        contact,
        taxCondition,
      },
      include: {
        account: true,
      },
    });

    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el cliente' });
  }
};

// Eliminar un cliente
const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el cliente tiene servicios asociados
    const services = await prisma.service.findMany({
      where: { clientId: id },
    });

    if (services.length > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar el cliente porque tiene servicios asociados',
      });
    }

    await prisma.client.delete({
      where: { id },
    });

    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el cliente' });
  }
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient
}; 