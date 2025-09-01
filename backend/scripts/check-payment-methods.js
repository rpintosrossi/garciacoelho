const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPaymentMethods() {
  try {
    console.log('🔍 Verificando métodos de pago existentes...');
    
    const paymentMethods = await prisma.paymentMethod.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log(`📊 Total de métodos de pago: ${paymentMethods.length}`);
    
    if (paymentMethods.length === 0) {
      console.log('❌ No hay métodos de pago en la base de datos');
    } else {
      console.log('📋 Métodos de pago encontrados:');
      paymentMethods.forEach(method => {
        console.log(`  - ${method.name} (ID: ${method.id})`);
      });
    }
    
    // Verificar específicamente "Cuenta Corriente"
    const cuentaCorriente = await prisma.paymentMethod.findFirst({
      where: { name: 'Cuenta Corriente' }
    });
    
    if (cuentaCorriente) {
      console.log(`✅ Método "Cuenta Corriente" encontrado con ID: ${cuentaCorriente.id}`);
    } else {
      console.log('❌ Método "Cuenta Corriente" NO encontrado');
    }
    
  } catch (error) {
    console.error('❌ Error verificando métodos de pago:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPaymentMethods();
