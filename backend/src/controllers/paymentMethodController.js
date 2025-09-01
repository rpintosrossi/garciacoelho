const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Listar todos los medios de pago
const getPaymentMethods = async (req, res) => {
  try {
    console.log('💳 [PAYMENT_METHOD] Obteniendo medios de pago...');
    const methods = await prisma.paymentMethod.findMany({ orderBy: { name: 'asc' } });
    console.log('💳 [PAYMENT_METHOD] Medios de pago encontrados:', methods.length);
    res.json(methods);
  } catch (error) {
    console.error('💳 [PAYMENT_METHOD] Error al obtener medios de pago:', error);
    res.status(500).json({ message: 'Error al obtener medios de pago' });
  }
};

// Crear un medio de pago
const createPaymentMethod = async (req, res) => {
  try {
    console.log('💳 [PAYMENT_METHOD] Creando nuevo medio de pago...');
    console.log('💳 [PAYMENT_METHOD] Body recibido:', req.body);
    
    const { name, titular, banco, cuenta, cuit, cbu, alias } = req.body;
    
    if (!name) {
      console.log('💳 [PAYMENT_METHOD] Error: Nombre es requerido');
      return res.status(400).json({ message: 'El nombre es requerido' });
    }
    
    const exists = await prisma.paymentMethod.findUnique({ where: { name } });
    if (exists) {
      console.log('💳 [PAYMENT_METHOD] Error: Ya existe un medio de pago con ese nombre');
      return res.status(400).json({ message: 'Ya existe un medio de pago con ese nombre' });
    }
    
    const method = await prisma.paymentMethod.create({ 
      data: { 
        name, 
        titular, 
        banco, 
        cuenta, 
        cuit, 
        cbu, 
        alias 
      } 
    });
    
    console.log('💳 [PAYMENT_METHOD] Medio de pago creado exitosamente:', method);
    res.status(201).json(method);
  } catch (error) {
    console.error('💳 [PAYMENT_METHOD] Error al crear medio de pago:', error);
    res.status(500).json({ message: 'Error al crear medio de pago', error: error.message });
  }
};

// Editar un medio de pago
const updatePaymentMethod = async (req, res) => {
  try {
    console.log('💳 [PAYMENT_METHOD] Actualizando medio de pago...');
    console.log('💳 [PAYMENT_METHOD] ID:', req.params.id);
    console.log('💳 [PAYMENT_METHOD] Body recibido:', req.body);
    
    const { id } = req.params;
    const { name, titular, banco, cuenta, cuit, cbu, alias } = req.body;
    
    if (!name) {
      console.log('💳 [PAYMENT_METHOD] Error: Nombre es requerido');
      return res.status(400).json({ message: 'El nombre es requerido' });
    }
    
    const exists = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!exists) {
      console.log('💳 [PAYMENT_METHOD] Error: Medio de pago no encontrado');
      return res.status(404).json({ message: 'No encontrado' });
    }
    
    const nameExists = await prisma.paymentMethod.findFirst({ where: { name, NOT: { id } } });
    if (nameExists) {
      console.log('💳 [PAYMENT_METHOD] Error: Ya existe un medio de pago con ese nombre');
      return res.status(400).json({ message: 'Ya existe un medio de pago con ese nombre' });
    }
    
    const method = await prisma.paymentMethod.update({ 
      where: { id }, 
      data: { 
        name, 
        titular, 
        banco, 
        cuenta, 
        cuit, 
        cbu, 
        alias 
      } 
    });
    
    console.log('💳 [PAYMENT_METHOD] Medio de pago actualizado exitosamente:', method);
    res.json(method);
  } catch (error) {
    console.error('💳 [PAYMENT_METHOD] Error al actualizar medio de pago:', error);
    res.status(500).json({ message: 'Error al actualizar medio de pago', error: error.message });
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

// Endpoint de prueba
const testPaymentMethod = async (req, res) => {
  try {
    console.log('💳 [PAYMENT_METHOD] Endpoint de prueba llamado');
    res.json({ 
      message: 'Endpoint de payment-methods funcionando correctamente',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    });
  } catch (error) {
    console.error('💳 [PAYMENT_METHOD] Error en endpoint de prueba:', error);
    res.status(500).json({ message: 'Error en endpoint de prueba' });
  }
};

module.exports = {
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  testPaymentMethod
}; 