const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugBuildingDebts() {
  console.log('🔍 Analizando deudas de edificios...\n');

  try {
    const buildings = await prisma.building.findMany({
      include: {
        account: true,
        administrator: true,
        services: {
          include: {
            invoice: {
              include: {
                paymentDocuments: {
                  include: {
                    payment: true
                  }
                }
              }
            },
            remitos: {
              include: {
                paymentDocuments: {
                  include: {
                    payment: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`📊 Total de edificios: ${buildings.length}\n`);

    for (const building of buildings) {
      let totalFacturado = 0;
      let totalPagado = 0;

      // Calcular total facturado y pagado
      for (const service of building.services) {
        // Facturas
        if (service.invoice) {
          totalFacturado += service.invoice.amount;
          
          for (const pd of service.invoice.paymentDocuments) {
            totalPagado += (pd.payment.originalAmount || pd.payment.amount);
          }
        }

        // Remitos
        for (const remito of service.remitos) {
          totalFacturado += remito.amount;
          
          for (const pd of remito.paymentDocuments) {
            totalPagado += (pd.payment.originalAmount || pd.payment.amount);
          }
        }
      }

      const deuda = totalFacturado - totalPagado;
      const saldoCuenta = building.account?.balance || 0;

      if (Math.abs(deuda - saldoCuenta) > 0.01 || deuda !== 0) {
        console.log(`\n🏢 ${building.name}`);
        console.log(`   ID: ${building.id}`);
        console.log(`   Administrador: ${building.administrator?.name || 'N/A'}`);
        console.log(`   Umbral de deuda: ${building.debtThreshold} días`);
        console.log(`   Total facturado: $${totalFacturado.toFixed(2)}`);
        console.log(`   Total pagado: $${totalPagado.toFixed(2)}`);
        console.log(`   Deuda calculada: $${deuda.toFixed(2)}`);
        console.log(`   Saldo en cuenta: $${saldoCuenta.toFixed(2)}`);
        console.log(`   ⚠️ Diferencia: $${(deuda - saldoCuenta).toFixed(2)}`);

        // Mostrar detalles de servicios
        console.log(`\n   Servicios (${building.services.length}):`);
        for (const service of building.services) {
          if (service.invoice) {
            const pagosFactura = service.invoice.paymentDocuments.reduce(
              (sum, pd) => sum + (pd.payment.originalAmount || pd.payment.amount), 0
            );
            console.log(`      • Servicio ${service.id.substring(0, 8)}: Factura $${service.invoice.amount.toFixed(2)} (Pagado: $${pagosFactura.toFixed(2)})`);
          }
          if (service.remitos.length > 0) {
            for (const remito of service.remitos) {
              const pagosRemito = remito.paymentDocuments.reduce(
                (sum, pd) => sum + (pd.payment.originalAmount || pd.payment.amount), 0
              );
              console.log(`      • Servicio ${service.id.substring(0, 8)}: Remito $${remito.amount.toFixed(2)} (Pagado: $${pagosRemito.toFixed(2)})`);
            }
          }
        }
        console.log('');
      }
    }

    // Buscar edificios que aparecerían en "deudas vencidas"
    console.log('\n\n🚨 EDIFICIOS CON DEUDA VENCIDA (según lógica del dashboard):');
    const buildingsWithDebts = [];

    for (const building of buildings) {
      let saldo = 0;
      
      for (const service of building.services) {
        if (service.invoice) {
          saldo += service.invoice.amount;
        }
        for (const remito of service.remitos) {
          saldo += remito.amount;
        }
      }

      const buildingInvoiceIds = building.services
        .map(s => s.invoice?.id)
        .filter(Boolean);
      const buildingRemitoIds = building.services
        .flatMap(s => s.remitos.map(r => r.id));
      
      const paymentDocuments = (buildingInvoiceIds.length > 0 || buildingRemitoIds.length > 0)
        ? await prisma.paymentDocument.findMany({
            where: {
              OR: [
                ...(buildingInvoiceIds.length > 0 ? [{ invoiceId: { in: buildingInvoiceIds } }] : []),
                ...(buildingRemitoIds.length > 0 ? [{ remitoId: { in: buildingRemitoIds } }] : [])
              ]
            },
            include: {
              payment: true
            }
          })
        : [];

      for (const pd of paymentDocuments) {
        saldo -= (pd.payment.originalAmount || pd.payment.amount);
      }

      if (saldo > 0) {
        let oldestDate = null;
        for (const service of building.services) {
          if (service.invoice && service.invoice.date) {
            if (!oldestDate || service.invoice.date < oldestDate) {
              oldestDate = service.invoice.date;
            }
          }
          for (const remito of service.remitos) {
            if (!oldestDate || remito.date < oldestDate) {
              oldestDate = remito.date;
            }
          }
        }

        let daysOverdue = 0;
        if (oldestDate) {
          const now = new Date();
          const diffTime = Math.abs(now - oldestDate);
          daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        const debtThreshold = building.debtThreshold || 30;
        const isOverThreshold = daysOverdue > debtThreshold;

        if (isOverThreshold) {
          console.log(`\n   🚨 ${building.name}`);
          console.log(`      Deuda: $${saldo.toFixed(2)}`);
          console.log(`      Días vencida: ${daysOverdue} (Umbral: ${debtThreshold})`);
          console.log(`      Fecha más antigua: ${oldestDate ? oldestDate.toISOString().split('T')[0] : 'N/A'}`);
          console.log(`      Servicios con docs: ${building.services.filter(s => s.invoice || s.remitos.length > 0).length}`);
        }

        buildingsWithDebts.push({
          name: building.name,
          debt: saldo,
          daysOverdue,
          isOverThreshold
        });
      }
    }

    if (buildingsWithDebts.filter(b => b.isOverThreshold).length === 0) {
      console.log('\n   ✅ No hay edificios con deuda vencida que supere el umbral');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugBuildingDebts();
