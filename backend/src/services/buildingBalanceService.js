const prisma = require('../lib/prisma');
const { serviceInvoicesInclude, getServiceInvoices } = require('../utils/serviceInvoiceHelpers');

/**
 * Fórmula canónica del saldo de un edificio (solo facturas):
 *   saldo = Σ(facturas únicas no-EFECTIVO)
 *         − Σ(cobertura de cada PaymentDocument)
 *
 * Cobertura de un PD = pd.amount + parte proporcional del descuento del pago:
 *   discountShare = (pd.amount / payment.amount) * payment.discount
 *
 * Importante: en pagos masivos (varios edificios), el descuento del Payment
 * NO debe restarse entero a cada edificio; solo la cuota de sus documentos.
 *
 * Las facturas EFECTIVO se consideran ya pagadas (no suman deuda).
 * Los remitos no entran en el saldo de lista (consistencia histórica).
 */

function dedupeInvoices(services) {
  const invoiceMap = new Map();
  for (const s of services) {
    const invoices = s.invoices?.length
      ? s.invoices
      : getServiceInvoices(s);
    // Compat: si aún viene `invoice` singular
    if ((!invoices || invoices.length === 0) && s.invoice) {
      if (!invoiceMap.has(s.invoice.id)) invoiceMap.set(s.invoice.id, s.invoice);
      continue;
    }
    for (const inv of invoices) {
      if (inv && !invoiceMap.has(inv.id)) {
        invoiceMap.set(inv.id, inv);
      }
    }
  }
  return Array.from(invoiceMap.values());
}

/** Monto que un PaymentDocument cubre de la factura (efectivo + descuento prorrateado). */
function getPaymentDocCoverage(pd) {
  const paid = pd.amount || 0;
  const payment = pd.payment;
  if (!payment || !(payment.discount > 0) || !(payment.amount > 0)) {
    return { paid, discountShare: 0, covered: paid };
  }
  const discountShare = (paid / payment.amount) * payment.discount;
  return { paid, discountShare, covered: paid + discountShare };
}

/**
 * Calcula el saldo a partir de facturas deduplicadas y sus PaymentDocuments.
 * @param {Array} invoices
 * @param {Array} paymentDocs - deben incluir `payment` (para discount)
 */
function calculateBalanceFromData(invoices, paymentDocs) {
  let totalInvoiced = 0;
  const invoiceIds = new Set();

  for (const inv of invoices) {
    invoiceIds.add(inv.id);
    if (inv.paymentMethod === 'EFECTIVO') continue;
    totalInvoiced += inv.amount || 0;
  }

  let totalPaid = 0;
  let totalDiscounts = 0;

  for (const pd of paymentDocs) {
    if (!pd.invoiceId || !invoiceIds.has(pd.invoiceId)) continue;
    const { paid, discountShare } = getPaymentDocCoverage(pd);
    totalPaid += paid;
    totalDiscounts += discountShare;
  }

  return {
    totalInvoiced,
    totalPaid,
    totalDiscounts,
    balance: Math.round((totalInvoiced - totalPaid - totalDiscounts) * 100) / 100
  };
}

/**
 * Monto pendiente de una factura (con descuento prorrateado por PD).
 */
function getInvoiceRemaining(invoice, paymentDocsForInvoice) {
  if (!invoice) return 0;
  if (invoice.paymentMethod === 'EFECTIVO') return 0;

  let covered = 0;
  for (const pd of paymentDocsForInvoice) {
    covered += getPaymentDocCoverage(pd).covered;
  }

  return Math.max(0, (invoice.amount || 0) - covered);
}

/**
 * Calcula el saldo de un edificio consultando la DB.
 */
async function calculateBuildingBalance(buildingId) {
  const services = await prisma.service.findMany({
    where: { buildingId },
    include: serviceInvoicesInclude
  });

  const invoices = dedupeInvoices(services);
  const invoiceIds = invoices.map((inv) => inv.id);

  const paymentDocs = invoiceIds.length > 0
    ? await prisma.paymentDocument.findMany({
        where: { invoiceId: { in: invoiceIds } },
        include: { payment: true }
      })
    : [];

  return calculateBalanceFromData(invoices, paymentDocs);
}

/**
 * Persiste el saldo calculado en Account (crea la cuenta si no existe).
 */
async function persistBuildingBalance(buildingId, balance) {
  const rounded = Math.round((balance || 0) * 100) / 100;
  const existing = await prisma.account.findUnique({
    where: { buildingId }
  });

  if (existing) {
    const existingRounded = Math.round((existing.balance || 0) * 100) / 100;
    if (existingRounded !== rounded) {
      return prisma.account.update({
        where: { buildingId },
        data: { balance: rounded }
      });
    }
    return existing;
  }

  return prisma.account.create({
    data: { buildingId, balance: rounded }
  });
}

/**
 * Recalcula y guarda el saldo de un edificio.
 */
async function recalculateBuildingBalance(buildingId) {
  const result = await calculateBuildingBalance(buildingId);
  await persistBuildingBalance(buildingId, result.balance);
  return result;
}

/**
 * Recalcula saldos de todos los edificios (batch eficiente).
 */
async function recalculateAllBalances() {
  const buildings = await prisma.building.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  if (buildings.length === 0) {
    return { updated: 0, results: [] };
  }

  const buildingIds = buildings.map((b) => b.id);

  const allServices = await prisma.service.findMany({
    where: { buildingId: { in: buildingIds } },
    include: serviceInvoicesInclude
  });

  const servicesByBuilding = allServices.reduce((acc, service) => {
    if (!acc[service.buildingId]) acc[service.buildingId] = [];
    acc[service.buildingId].push(service);
    return acc;
  }, {});

  const allInvoiceIds = [];
  const invoicesByBuilding = {};

  for (const buildingId of buildingIds) {
    const invoices = dedupeInvoices(servicesByBuilding[buildingId] || []);
    invoicesByBuilding[buildingId] = invoices;
    for (const inv of invoices) {
      allInvoiceIds.push(inv.id);
    }
  }

  const allPaymentDocs = allInvoiceIds.length > 0
    ? await prisma.paymentDocument.findMany({
        where: { invoiceId: { in: allInvoiceIds } },
        include: { payment: true }
      })
    : [];

  const paymentDocsByInvoice = allPaymentDocs.reduce((acc, pd) => {
    if (!pd.invoiceId) return acc;
    if (!acc[pd.invoiceId]) acc[pd.invoiceId] = [];
    acc[pd.invoiceId].push(pd);
    return acc;
  }, {});

  const results = [];
  let updated = 0;

  for (const building of buildings) {
    const invoices = invoicesByBuilding[building.id] || [];
    const paymentDocs = invoices.flatMap((inv) => paymentDocsByInvoice[inv.id] || []);
    const calc = calculateBalanceFromData(invoices, paymentDocs);

    await persistBuildingBalance(building.id, calc.balance);
    updated += 1;

    results.push({
      buildingId: building.id,
      name: building.name,
      balance: calc.balance,
      totalInvoiced: calc.totalInvoiced,
      totalPaid: calc.totalPaid,
      totalDiscounts: calc.totalDiscounts
    });
  }

  return { updated, results };
}

module.exports = {
  dedupeInvoices,
  getPaymentDocCoverage,
  calculateBalanceFromData,
  getInvoiceRemaining,
  calculateBuildingBalance,
  persistBuildingBalance,
  recalculateBuildingBalance,
  recalculateAllBalances
};
