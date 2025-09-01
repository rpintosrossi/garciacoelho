const { PrismaClient } = require('@prisma/client');
const { convertToAbsoluteUrls } = require('../src/utils/fileUtils');

const prisma = new PrismaClient();

async function updateFileUrls() {
  try {
    console.log('Iniciando actualización de URLs de archivos...');
    
    // Obtener todos los servicios con imágenes
    const services = await prisma.service.findMany({
      include: {
        remitos: true
      }
    });
    
    console.log(`Encontrados ${services.length} servicios para actualizar`);
    
    for (const service of services) {
      let needsUpdate = false;
      const updates = {};
      
      // Actualizar receiptImages del servicio
      if (service.receiptImages && service.receiptImages.length > 0) {
        const absoluteUrls = convertToAbsoluteUrls(service.receiptImages);
        if (JSON.stringify(service.receiptImages) !== JSON.stringify(absoluteUrls)) {
          updates.receiptImages = absoluteUrls;
          needsUpdate = true;
          console.log(`Actualizando receiptImages del servicio ${service.id}`);
        }
      }
      
      // Actualizar remitos
      if (service.remitos && service.remitos.length > 0) {
        for (const remito of service.remitos) {
          if (remito.receiptImages && remito.receiptImages.length > 0) {
            const absoluteUrls = convertToAbsoluteUrls(remito.receiptImages);
            if (JSON.stringify(remito.receiptImages) !== JSON.stringify(absoluteUrls)) {
              await prisma.remito.update({
                where: { id: remito.id },
                data: { receiptImages: absoluteUrls }
              });
              console.log(`Actualizando receiptImages del remito ${remito.id}`);
            }
          }
        }
      }
      
      // Actualizar el servicio si es necesario
      if (needsUpdate) {
        await prisma.service.update({
          where: { id: service.id },
          data: updates
        });
      }
    }
    
    console.log('Actualización de URLs completada exitosamente');
  } catch (error) {
    console.error('Error durante la actualización:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
updateFileUrls();
