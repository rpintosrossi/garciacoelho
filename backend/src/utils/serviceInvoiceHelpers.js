/** Primera factura desde la cola de Facturación */
const FIRST_INVOICE_STATUSES = ['CON_REMITO', 'FACTURADO_PARCIAL'];
/** Factura adicional sobre remito/servicio ya facturado */
const ADDITIONAL_INVOICE_STATUSES = ['FACTURADO', 'FACTURADO_PARCIAL'];
const INVOICEABLE_STATUSES = [...new Set([...FIRST_INVOICE_STATUSES, ...ADDITIONAL_INVOICE_STATUSES])];

function canInvoice(status) {
  return INVOICEABLE_STATUSES.includes(status);
}

function canAdditionalInvoice(status) {
  return ADDITIONAL_INVOICE_STATUSES.includes(status);
}

function canFirstInvoice(status) {
  return FIRST_INVOICE_STATUSES.includes(status);
}

/** Include para cargar facturas de un servicio vía InvoiceService (con pagos). */
const serviceInvoicesInclude = {
  invoiceServices: {
    include: {
      invoice: {
        include: {
          paymentDocuments: {
            include: {
              payment: {
                select: {
                  id: true,
                  amount: true,
                  discount: true
                }
              }
            }
          }
        }
      }
    }
  }
};

/** Include para cargar servicios de una factura vía InvoiceService */
function invoiceServicesInclude(serviceInclude = {}) {
  return {
    invoiceServices: {
      include: {
        service: Object.keys(serviceInclude).length > 0
          ? { include: serviceInclude }
          : true
      }
    }
  };
}

function getServiceInvoices(service) {
  return (service?.invoiceServices || []).map((link) => link.invoice).filter(Boolean);
}

function getInvoiceServices(invoice) {
  return (invoice?.invoiceServices || []).map((link) => link.service).filter(Boolean);
}

function getPaymentDocCoverage(pd) {
  const paid = pd.amount || 0;
  const payment = pd.payment;
  if (!payment || !(payment.discount > 0) || !(payment.amount > 0)) {
    return paid;
  }
  return paid + (paid / payment.amount) * payment.discount;
}

/** true si la factura está cubierta (EFECTIVO, PAGADA o pagos + descuentos). */
function isInvoiceFullyPaid(invoice) {
  if (!invoice) return false;
  if (invoice.paymentMethod === 'EFECTIVO' || invoice.status === 'PAGADA') return true;

  const docs = invoice.paymentDocuments || invoice.payments || [];
  let covered = 0;
  for (const pd of docs) {
    // paymentDocuments: { amount, payment } | payments aplanados: { amount }
    if (pd.payment) {
      covered += getPaymentDocCoverage(pd);
    } else {
      covered += pd.amount || 0;
    }
  }

  return Math.max(0, (invoice.amount || 0) - covered) <= 0.01;
}

/**
 * Estado de cobro del servicio:
 * - true: todas sus facturas están pagadas
 * - false: tiene facturas y alguna no está pagada
 * - null: sin facturas (no aplica)
 */
function getServiceIsPaid(serviceOrInvoices) {
  const invoices = Array.isArray(serviceOrInvoices)
    ? serviceOrInvoices
    : getServiceInvoices(serviceOrInvoices);

  if (!invoices.length) return null;
  return invoices.every(isInvoiceFullyPaid);
}

/** Adjunta `invoices`, `invoice` (última) e `isPaid` para compatibilidad con respuestas/API. */
function withServiceInvoices(service) {
  if (!service) return service;
  const invoices = getServiceInvoices(service);
  return {
    ...service,
    invoices,
    invoice: invoices.length > 0 ? invoices[invoices.length - 1] : null,
    isPaid: getServiceIsPaid(invoices)
  };
}

/** Adjunta `services` aplanado desde invoiceServices. */
function withInvoiceServices(invoice) {
  if (!invoice) return invoice;
  return {
    ...invoice,
    services: getInvoiceServices(invoice)
  };
}

function linkInvoiceToServicesData(serviceIds) {
  return {
    invoiceServices: {
      create: serviceIds.map((serviceId) => ({ serviceId }))
    }
  };
}

module.exports = {
  INVOICEABLE_STATUSES,
  FIRST_INVOICE_STATUSES,
  ADDITIONAL_INVOICE_STATUSES,
  canInvoice,
  canAdditionalInvoice,
  canFirstInvoice,
  serviceInvoicesInclude,
  invoiceServicesInclude,
  getServiceInvoices,
  getInvoiceServices,
  isInvoiceFullyPaid,
  getServiceIsPaid,
  withServiceInvoices,
  withInvoiceServices,
  linkInvoiceToServicesData
};
