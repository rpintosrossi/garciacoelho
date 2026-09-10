/**
 * Helpers fiscales AFIP para mapear datos del sistema.
 */

const TAX_TO_CONDICION_IVA = {
  RESPONSABLE_INSCRIPTO: 1,
  MONOTRIBUTO: 6,
  EXENTO: 4,
  CONSUMIDOR_FINAL: 5
};

const TAX_LABEL = {
  RESPONSABLE_INSCRIPTO: 'IVA Responsable Inscripto',
  MONOTRIBUTO: 'Monotributo',
  EXENTO: 'IVA Sujeto Exento',
  CONSUMIDOR_FINAL: 'Consumidor Final'
};

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function mapDocTipo(taxCondition, cuitOrDoc) {
  const digits = digitsOnly(cuitOrDoc);
  if (taxCondition === 'CONSUMIDOR_FINAL' && (!digits || digits === '0')) {
    return { docTipo: 99, docNro: '0' };
  }
  if (digits.length === 11) {
    return { docTipo: 80, docNro: digits }; // CUIT
  }
  if (digits.length >= 7 && digits.length <= 8) {
    return { docTipo: 96, docNro: digits }; // DNI
  }
  // Sin documento válido → consumidor final genérico
  return { docTipo: 99, docNro: '0' };
}

/**
 * Ajusta DocTipo/DocNro a reglas AFIP (evita error 10015):
 * DocTipo 99 ⇒ DocNro = 0. Si hay CUIT/DNI, usar 80/96.
 */
function normalizeDocForAfip(docTipo, docNro, taxCondition) {
  const digits = digitsOnly(docNro);
  let tipo = Number(docTipo);

  if (digits.length === 11) {
    return { docTipo: 80, docNro: digits };
  }
  if (digits.length >= 7 && digits.length <= 8) {
    return { docTipo: 96, docNro: digits };
  }

  if (tipo === 99 || taxCondition === 'CONSUMIDOR_FINAL' || !digits || digits === '0') {
    return { docTipo: 99, docNro: '0' };
  }

  // Tipo distinto de 99 pero número inválido → forzar CF genérico
  return { docTipo: 99, docNro: '0' };
}

/**
 * Tipo de comprobante según condición IVA emisor/receptor (reglas AFIP).
 * Emisor Monotributo / Exento → C (11)
 * Emisor RI + receptor RI → A (1)
 * Emisor RI + resto → B (6)
 */
function mapTipoComprobante(emisorCondicion, receptorTaxCondition) {
  const emisor = String(emisorCondicion || '').toUpperCase();
  if (
    emisor.includes('MONOTRIBUTO') ||
    emisor === 'MONOTRIBUTO' ||
    emisor.includes('EXENTO') ||
    emisor === 'EXENTO'
  ) {
    return 11;
  }
  if (receptorTaxCondition === 'RESPONSABLE_INSCRIPTO') {
    return 1; // Factura A
  }
  return 6; // Factura B
}

function tipoComprobanteLabel(tipo) {
  const map = {
    1: 'A',
    6: 'B',
    11: 'C',
    51: 'M'
  };
  return map[Number(tipo)] || String(tipo);
}

function condicionIvaReceptorId(taxCondition) {
  return TAX_TO_CONDICION_IVA[taxCondition] || 5;
}

function taxConditionLabel(taxCondition) {
  return TAX_LABEL[taxCondition] || taxCondition || 'Consumidor Final';
}

function formatInvoiceNumber(puntoVenta, numero) {
  return `${String(puntoVenta).padStart(5, '0')}-${String(numero).padStart(8, '0')}`;
}

function parseAfipDate(value) {
  if (!value) return null;
  const str = String(value);
  if (/^\d{8}$/.test(str)) {
    return new Date(`${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}T12:00:00`);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return new Date(str);
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toAfipDateString(date) {
  if (date == null || date === '') {
    date = new Date();
  }

  // Ya viene en formato AFIP yyyyMMdd
  const raw = String(date).trim();
  if (/^\d{8}$/.test(raw)) {
    return raw;
  }

  const d =
    date instanceof Date
      ? date
      : parseAfipDate(date) || new Date(date);

  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula neto/IVA 21% a partir de un total con IVA incluido (Factura B típica)
 * o desde neto si se indica.
 */
function splitAmounts({ amount, impNeto, impIVA, impTotal, tipocomprobante }) {
  const total = round2(impTotal != null ? impTotal : amount);
  if (impNeto != null && impIVA != null) {
    return {
      impNeto: round2(impNeto),
      impIVA: round2(impIVA),
      impTotal: total
    };
  }

  // Factura C: sin discriminación de IVA
  if (Number(tipocomprobante) === 11) {
    return { impNeto: total, impIVA: 0, impTotal: total };
  }

  const neto = round2(total / 1.21);
  const iva = round2(total - neto);
  return { impNeto: neto, impIVA: iva, impTotal: total };
}

module.exports = {
  mapDocTipo,
  normalizeDocForAfip,
  mapTipoComprobante,
  tipoComprobanteLabel,
  condicionIvaReceptorId,
  taxConditionLabel,
  formatInvoiceNumber,
  parseAfipDate,
  toAfipDateString,
  round2,
  splitAmounts,
  digitsOnly
};
