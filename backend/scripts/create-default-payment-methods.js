const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createDefaultPaymentMethods() {
  try {
    console.log('🔧 Creando métodos de pago por defecto...');
    
    // Verificar si ya existe "Cuenta Corriente"
    const cuentaCorriente = await prisma.paymentMethod.findFirst({
      where: { name: 'Cuenta Corriente' }
    });
    
    if (!cuentaCorriente) {
      console.log('📝 Creando método de pago "Cuenta Corriente"...');
      await prisma.paymentMethod.create({
        data: {
          name: 'Cuenta Corriente',
          titular: 'Sistema',
          banco: 'Sistema',
          cuenta: 'Cuenta Corriente'
        }
      });
      console.log('✅ Método de pago "Cuenta Corriente" creado exitosamente');
    } else {
      console.log('✅ Método de pago "Cuenta Corriente" ya existe');
    }
    
    // Verificar si ya existe "Efectivo"
    const efectivo = await prisma.paymentMethod.findFirst({
      where: { name: 'Efectivo' }
    });
    
    if (!efectivo) {
      console.log('📝 Creando método de pago "Efectivo"...');
      await prisma.paymentMethod.create({
        data: {
          name: 'Efectivo',
          titular: 'Sistema',
          banco: 'Efectivo',
          cuenta: 'Efectivo'
        }
      });
      console.log('✅ Método de pago "Efectivo" creado exitosamente');
    } else {
      console.log('✅ Método de pago "Efectivo" ya existe');
    }
    
    console.log('🎉 Proceso completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error creando métodos de pago:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultPaymentMethods();
