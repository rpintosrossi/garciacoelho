/**
 * Código de barras AFIP (Interleaved 2 of 5) + dígito verificador.
 * CUIT(11) + tipoCbte(2) + ptoVta(4) + CAE(14) + vtoCAE(8) + DV(1)
 */

function computeCheckDigit(code) {
  let odd = 0;
  let even = 0;
  const digits = String(code).replace(/\D/g, '');
  for (let i = 0; i < digits.length; i++) {
    const n = Number(digits[i]);
    if ((i + 1) % 2 === 0) even += n;
    else odd += n;
  }
  const sum = odd * 3 + even;
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}

function buildAfipBarcode({ cuit, tipoComprobante, puntoVenta, cae, caeVto }) {
  const cuitStr = String(cuit).replace(/\D/g, '').padStart(11, '0').slice(-11);
  const tipo = String(tipoComprobante).padStart(2, '0').slice(-2);
  const pv = String(puntoVenta).padStart(4, '0').slice(-4);
  const caeStr = String(cae).replace(/\D/g, '').padStart(14, '0').slice(-14);

  let vto = String(caeVto || '');
  if (/^\d{4}-\d{2}-\d{2}/.test(vto)) {
    vto = vto.slice(0, 10).replace(/-/g, '');
  } else {
    vto = vto.replace(/\D/g, '');
  }
  vto = vto.padStart(8, '0').slice(-8);

  const base = `${cuitStr}${tipo}${pv}${caeStr}${vto}`;
  const dv = computeCheckDigit(base);
  return `${base}${dv}`;
}

module.exports = {
  buildAfipBarcode,
  computeCheckDigit
};
