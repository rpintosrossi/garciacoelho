const QRCode = require('qrcode');
const { buildFacturaAfipHtml } = require('../templates/facturaAfipHtml');

function toIsoDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const s = String(value);
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

async function buildAfipQrDataUrl(data) {
  const payload = {
    ver: 1,
    fecha: toIsoDate(data.fecha),
    cuit: Number(String(data.emisor.cuit).replace(/\D/g, '')),
    ptoVta: Number(data.puntoVenta),
    tipoCmp: Number(data.tipoComprobante),
    nroCmp: Number(data.numeroComprobante),
    importe: Number(data.impTotal),
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: Number(data.receptor.docTipo || 99),
    nroDocRec: Number(String(data.receptor.docNro || '0').replace(/\D/g, '') || 0),
    tipoCodAut: 'E',
    codAut: Number(data.cae)
  };
  const url = `https://www.arca.gob.ar/fe/qr/?p=${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 180
  });
}

/**
 * Genera PDF A4 de factura electrónica con layout ARCA/AFIP (HTML → Chromium).
 */
async function generateAfipInvoicePdf(data) {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (err) {
    throw new Error(
      'puppeteer no está instalado. Ejecutá: npm install puppeteer --prefix backend'
    );
  }

  const qrDataUrl = await buildAfipQrDataUrl(data);
  const html = buildFacturaAfipHtml(data, qrDataUrl);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

module.exports = {
  generateAfipInvoicePdf
};
