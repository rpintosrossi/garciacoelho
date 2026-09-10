/**
 * Extrae un mensaje legible desde errores anidados de AFIP / afip-service.
 */
function extractAfipErrorMessage(err) {
  if (!err) return 'Error desconocido de AFIP';

  const candidates = [];

  const push = (v) => {
    if (v == null) return;
    if (typeof v === 'string' && v.trim()) candidates.push(v.trim());
    else if (typeof v === 'number') candidates.push(String(v));
  };

  push(err.message);
  push(err.error);

  if (err.details) {
    if (typeof err.details === 'string') push(err.details);
    else {
      push(err.details.error);
      push(err.details.message);
      if (err.details.errors) {
        const list = Array.isArray(err.details.errors) ? err.details.errors : [err.details.errors];
        for (const item of list) {
          if (typeof item === 'string') push(item);
          else {
            push(item?.msg);
            push(item?.message);
            push(item?.Obs);
            push(item?.Msg);
          }
        }
      }
      // Respuestas FECAE típicas
      const obs =
        err.details?.Errors ||
        err.details?.FeDetResp?.FECAEDetResponse?.Observaciones?.Obs ||
        err.details?.Observaciones?.Obs;
      if (Array.isArray(obs)) {
        for (const o of obs) push(o?.Msg || o?.msg || o);
      } else if (obs) {
        push(obs.Msg || obs.msg || obs);
      }
    }
  }

  // Preferir el más específico (evitar genéricos cortos)
  const generics = new Set([
    'Error AFIP al generar factura',
    'Error al emitir factura electrónica',
    'Error desconocido de AFIP',
    'fetch failed'
  ]);

  const specific = candidates.find((c) => !generics.has(c) && c.length > 10);
  return specific || candidates[0] || 'Error desconocido de AFIP';
}

module.exports = {
  extractAfipErrorMessage
};
