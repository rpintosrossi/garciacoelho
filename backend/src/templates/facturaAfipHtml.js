function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(n) {
  return Number(n || 0).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(value) {
  if (!value) return '';
  const s = String(value);
  if (/^\d{8}$/.test(s)) return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return s;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function tipoLetter(tipo) {
  const t = Number(tipo);
  if (t === 1) return 'A';
  if (t === 11) return 'C';
  if (t === 51) return 'M';
  return 'B';
}

function docLabel(docTipo) {
  const t = Number(docTipo);
  if (t === 96) return 'DNI';
  if (t === 99) return 'Doc.';
  return 'CUIT';
}

let arcaLogoDataUrl = '';
try {
  arcaLogoDataUrl = require('./arcaLogoDataUrl');
} catch (_) {
  arcaLogoDataUrl = '';
}

/**
 * Plantilla HTML A4 alineada al comprobante electrónico ARCA/AFIP.
 */
function buildFacturaAfipHtml(data, qrDataUrl) {
  const letter = tipoLetter(data.tipoComprobante);
  const codigo = String(data.tipoComprobante).padStart(3, '0');
  const emisorName = data.emisor.razonSocial || data.emisor.nombre || '';
  const emisorCuit = String(data.emisor.cuit || '').replace(/\D/g, '');
  const iibb = data.emisor.ingresosBrutos || emisorCuit || '-';
  const fechaEmision = formatDate(data.fecha);
  const desde = formatDate(data.fchServDesde || data.fecha);
  const hasta = formatDate(data.fchServHasta || data.fecha);
  const vtoPago = formatDate(data.fchVtoPago || data.fecha);
  const receptorDocLabel = docLabel(data.receptor?.docTipo);
  const receptorDocNro =
    Number(data.receptor?.docTipo) === 99
      ? '-'
      : data.receptor?.docNro || '-';

  const items =
    Array.isArray(data.items) && data.items.length
      ? data.items
      : [
          {
            code: '',
            description: 'Servicio',
            quantity: 1,
            unit: 'unidades',
            unitPrice: data.impTotal,
            bonifPct: 0,
            bonifImp: 0,
            subtotal: data.impTotal
          }
        ];

  const showIvaContenido = Number(data.tipoComprobante) !== 11 && Number(data.impIVA) > 0;

  const itemRows = items
    .map((item) => {
      const qty = Number(item.quantity ?? 1);
      const unitPrice = Number(item.unitPrice ?? item.subtotal ?? data.impTotal);
      const subtotal = Number(item.subtotal ?? unitPrice * qty);
      return `<tr>
      <td class="c-code">${esc(item.code || '')}</td>
      <td class="c-desc">${esc(item.description || '')}</td>
      <td class="num">${esc(money(qty))}</td>
      <td class="ctr">${esc(item.unit || 'unidades')}</td>
      <td class="num">${esc(money(unitPrice))}</td>
      <td class="num">${esc(money(item.bonifPct ?? 0))}</td>
      <td class="num">${esc(money(item.bonifImp ?? 0))}</td>
      <td class="num">${esc(money(subtotal))}</td>
    </tr>`;
    })
    .join('');

  // Filas vacías para que las líneas verticales bajen como en ARCA
  const emptyRows = Array.from({ length: Math.max(0, 12 - items.length) })
    .map(
      () => `<tr class="empty">
      <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 210mm;
    height: 297mm;
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    background: #fff;
    font-size: 10px;
  }
  .page {
    width: 210mm;
    height: 297mm;
    padding: 8mm 9mm 6mm 9mm;
  }
  .sheet {
    height: 100%;
    border: 1.1px solid #000;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  /* ORIGINAL sobre el borde superior (como ARCA) */
  .original {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #fff;
    border: 1.1px solid #000;
    padding: 1.2mm 5mm;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.6px;
    line-height: 1;
    z-index: 2;
  }

  .header {
    display: grid;
    grid-template-columns: 1fr 16mm 1fr;
    border-bottom: 1.1px solid #000;
    margin-top: 3.5mm;
    min-height: 38mm;
  }
  .header-left, .header-right {
    padding: 3mm 3.2mm 2.5mm 3.2mm;
  }
  .header-left { border-right: 1.1px solid #000; }
  .header-right { border-left: 1.1px solid #000; }

  .letter-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: 1.5mm;
    border-left: 1.1px solid #000;
    border-right: 1.1px solid #000;
  }
  .letter-box .letter {
    font-size: 30px;
    font-weight: 700;
    line-height: 1;
    margin-top: 1mm;
  }
  .letter-box .cod {
    margin-top: 1.5mm;
    width: 100%;
    text-align: center;
    border-top: 1.1px solid #000;
    padding-top: 1.2mm;
    font-size: 9px;
    font-weight: 700;
  }

  .trade-name {
    font-size: 12.5px;
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 2mm;
    line-height: 1.15;
  }
  .factura-title {
    font-size: 18px;
    font-weight: 700;
    text-align: center;
    letter-spacing: 0.5px;
    margin: 0 0 2.5mm 0;
  }
  .line {
    margin: 0.7mm 0;
    line-height: 1.28;
    font-size: 9.5px;
  }
  .lbl { font-weight: 700; }

  .period {
    border-bottom: 1.1px solid #000;
    padding: 1.8mm 3.2mm;
    font-size: 9px;
  }
  .period .lbl { margin-right: 1mm; }
  .period .gap { display: inline-block; width: 6mm; }

  .receptor {
    border-bottom: 1.1px solid #000;
    padding: 2.2mm 3.2mm 2.5mm 3.2mm;
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    column-gap: 4mm;
    row-gap: 1.1mm;
    font-size: 9.5px;
  }
  .receptor .full { grid-column: 1 / -1; }

  .items-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-bottom: 1.1px solid #000;
  }
  table.items {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    height: 100%;
    font-size: 9px;
  }
  table.items thead th {
    background: #cfcfcf;
    border-bottom: 1.1px solid #000;
    border-right: 1.1px solid #000;
    padding: 1.5mm 1mm;
    font-size: 7.6px;
    font-weight: 700;
    text-align: center;
    vertical-align: middle;
  }
  table.items thead th:last-child { border-right: none; }
  table.items tbody td {
    border-right: 1.1px solid #000;
    padding: 1.4mm 1.2mm;
    vertical-align: top;
    height: 1px;
  }
  table.items tbody td:last-child { border-right: none; }
  table.items tbody tr.empty td {
    border-bottom: none;
    height: auto;
  }
  table.items .c-code { width: 11%; }
  table.items .c-desc { width: 36%; word-break: break-word; }
  table.items .num { text-align: right; white-space: nowrap; }
  table.items .ctr { text-align: center; }

  .totals-area {
    display: grid;
    grid-template-columns: 1fr 68mm;
    min-height: 22mm;
  }
  .totals-area .spacer {
    border-right: none;
  }
  .totals {
    border-left: 1.1px solid #000;
    padding: 2.5mm 3mm 2.2mm 3mm;
    font-size: 10px;
  }
  .totals .row {
    display: flex;
    justify-content: space-between;
    gap: 3mm;
    margin: 1.1mm 0;
  }
  .totals .row span:first-child { font-weight: 700; }
  .totals .row.total span { font-weight: 700; font-size: 11px; }
  .totals .sep {
    border-top: 1px solid #000;
    margin: 2mm 0 1.5mm 0;
  }
  .totals .ley {
    font-size: 7px;
    line-height: 1.25;
    margin-bottom: 1mm;
  }

  .footer {
    display: grid;
    grid-template-columns: 30mm 1fr 58mm;
    gap: 3mm;
    padding: 3.5mm 3.5mm 3mm 3.5mm;
    align-items: end;
    min-height: 32mm;
  }
  .qr img {
    width: 26mm;
    height: 26mm;
    image-rendering: pixelated;
  }
  .arca {
    text-align: center;
    padding-bottom: 1mm;
  }
  .arca .page-num {
    font-size: 9px;
    margin-bottom: 1.2mm;
  }
  .arca-logo-img {
    width: 48mm;
    height: auto;
    display: block;
    margin: 0 auto 1.2mm auto;
  }
  .arca .auth {
    font-weight: 700;
    font-style: italic;
    font-size: 11px;
    margin-top: 1mm;
  }
  .arca .disc {
    font-size: 6.8px;
    font-style: italic;
    color: #222;
    line-height: 1.25;
    margin-top: 1.2mm;
  }
  .cae {
    font-size: 10px;
    padding-bottom: 2mm;
  }
  .cae .n {
    font-weight: 700;
    margin-bottom: 2mm;
  }
</style>
</head>
<body>
  <div class="page">
    <div class="sheet">
      <div class="original">ORIGINAL</div>

      <div class="header">
        <div class="header-left">
          <div class="trade-name">${esc(emisorName)}</div>
          <div class="line"><span class="lbl">Razón Social:</span> ${esc(emisorName)}</div>
          <div class="line"><span class="lbl">Domicilio Comercial:</span> ${esc(data.emisor.domicilio || '-')}</div>
          <div class="line"><span class="lbl">Condición frente al IVA:</span> ${esc(
            data.emisor.condicionIva || 'IVA Responsable Inscripto'
          )}</div>
        </div>
        <div class="letter-box">
          <div class="letter">${esc(letter)}</div>
          <div class="cod">COD. ${esc(codigo)}</div>
        </div>
        <div class="header-right">
          <div class="factura-title">FACTURA</div>
          <div class="line">
            <span class="lbl">Punto de Venta:</span> ${esc(String(data.puntoVenta).padStart(5, '0'))}
            &nbsp;&nbsp;<span class="lbl">Comp. Nro:</span> ${esc(
              String(data.numeroComprobante).padStart(8, '0')
            )}
          </div>
          <div class="line"><span class="lbl">Fecha de Emisión:</span> ${esc(fechaEmision)}</div>
          <div class="line"><span class="lbl">CUIT:</span> ${esc(emisorCuit || '-')}</div>
          <div class="line"><span class="lbl">Ingresos Brutos:</span> ${esc(iibb)}</div>
          <div class="line"><span class="lbl">Fecha de Inicio de Actividades:</span> ${esc(
            data.emisor.inicioActividades || '-'
          )}</div>
        </div>
      </div>

      <div class="period">
        <span class="lbl">Período Facturado Desde:</span> ${esc(desde)}
        <span class="gap"></span>
        <span class="lbl">Hasta:</span> ${esc(hasta)}
        <span class="gap"></span>
        <span class="lbl">Fecha de Vto. para el pago:</span> ${esc(vtoPago)}
      </div>

      <div class="receptor">
        <div><span class="lbl">${esc(receptorDocLabel)}:</span> ${esc(receptorDocNro)}</div>
        <div><span class="lbl">Condición frente al IVA:</span> ${esc(
          data.receptor.condicionIva || 'Consumidor Final'
        )}</div>
        <div><span class="lbl">Apellido y Nombre / Razón Social:</span> ${esc(
          data.receptor.nombre || '-'
        )}</div>
        <div><span class="lbl">Condición de venta:</span> ${esc(data.condicionVenta || 'Contado')}</div>
        <div class="full"><span class="lbl">Domicilio:</span> ${esc(data.receptor.domicilio || '-')}</div>
      </div>

      <div class="items-wrap">
        <table class="items">
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto / Servicio</th>
              <th>Cantidad</th>
              <th>U. Medida</th>
              <th>Precio Unit.</th>
              <th>% Bonif</th>
              <th>Imp. Bonif.</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
            ${emptyRows}
          </tbody>
        </table>
      </div>

      <div class="totals-area">
        <div class="spacer"></div>
        <div class="totals">
          <div class="row"><span>Subtotal: $</span><span>${esc(money(data.impTotal))}</span></div>
          <div class="row"><span>Importe Otros Tributos: $</span><span>0,00</span></div>
          <div class="row total"><span>Importe Total: $</span><span>${esc(money(data.impTotal))}</span></div>
          ${
            showIvaContenido
              ? `<div class="sep"></div>
                 <div class="ley">Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)</div>
                 <div class="row"><span>IVA Contenido: $</span><span>${esc(money(data.impIVA))}</span></div>`
              : ''
          }
        </div>
      </div>

      <div class="footer">
        <div class="qr">${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR AFIP" />` : ''}</div>
        <div class="arca">
          <div class="page-num">Pág. 1/1</div>
          ${
            arcaLogoDataUrl
              ? `<img class="arca-logo-img" src="${arcaLogoDataUrl}" alt="ARCA" />`
              : `<div style="font-weight:700;font-size:18px;color:#333">ARCA</div>
                 <div style="font-size:6.5px;letter-spacing:.3px;color:#333;line-height:1.2">AGENCIA DE RECAUDACIÓN<br/>Y CONTROL ADUANERO</div>`
          }
          <div class="auth">Comprobante Autorizado</div>
          <div class="disc">Esta Agencia no se responsabiliza por los datos<br/>ingresados en el detalle de la operación</div>
        </div>
        <div class="cae">
          <div class="n">CAE N°: ${esc(data.cae)}</div>
          <div>Fecha de Vto. de CAE: ${esc(formatDate(data.caeVto))}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  buildFacturaAfipHtml
};
