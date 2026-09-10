/**
 * Cliente HTTP hacia el servicio AFIP (Railway).
 *
 * TODO (afip-service): API key por cliente/sistema en lugar de una sola API_KEY global.
 */

const DEFAULT_TIMEOUT_MS = Number(process.env.AFIP_HTTP_TIMEOUT_MS || 60000);
const DEFAULT_RETRIES = Number(process.env.AFIP_HTTP_RETRIES || 2);

function getConfig() {
  const baseUrl = (process.env.AFIP_SERVICE_URL || '').replace(/\/$/, '');
  const apiKey = process.env.AFIP_SERVICE_API_KEY || '';
  const adminKey = process.env.AFIP_SERVICE_ADMIN_KEY || process.env.AFIP_ADMIN_API_KEY || '';
  return { baseUrl, apiKey, adminKey };
}

function isAfipConfigured() {
  const { baseUrl, apiKey } = getConfig();
  return Boolean(baseUrl && apiKey);
}

function isRetryableFetchError(err) {
  const code = err?.cause?.code || err?.code;
  const msg = String(err?.message || '');
  return (
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    msg.includes('fetch failed') ||
    msg.includes('Connect Timeout')
  );
}

async function afipFetch(path, options = {}, { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES } = {}) {
  const { baseUrl } = getConfig();
  if (!baseUrl) {
    throw new Error('AFIP no configurado: falta AFIP_SERVICE_URL');
  }

  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      if (attempt > 0) {
        console.warn(`[AFIP] Reintento ${attempt}/${retries} → ${url}`);
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timer);
      return response;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (err?.name === 'AbortError') {
        lastError = new Error(`Timeout conectando a AFIP service (${timeoutMs}ms): ${url}`);
        lastError.code = 'AFIP_TIMEOUT';
      }
      if (!isRetryableFetchError(err) && err?.name !== 'AbortError') {
        throw err;
      }
    }
  }

  throw lastError;
}

async function parseJsonResponse(response) {
  return response.json().catch(() => ({}));
}

async function generarFactura(payload) {
  const { apiKey } = getConfig();
  if (!apiKey) {
    throw new Error('AFIP no configurado: falta AFIP_SERVICE_API_KEY');
  }

  const response = await afipFetch('/factura/generar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey
    },
    body: JSON.stringify(payload)
  });

  const data = await parseJsonResponse(response);
  if (!response.ok) {
    const msg =
      (typeof data.error === 'string' && data.error) ||
      (typeof data.message === 'string' && data.message) ||
      `Error AFIP HTTP ${response.status}`;
    const err = new Error(msg);
    err.status = response.status;
    err.details = data;
    throw err;
  }
  return data;
}

async function listIssuers() {
  const { adminKey, apiKey } = getConfig();
  const key = adminKey || apiKey;
  if (!key) {
    throw new Error('AFIP no configurado: falta AFIP_SERVICE_ADMIN_KEY (o API_KEY)');
  }

  // Listado es liviano: timeout más corto y 1 reintento (evita esperar 60s x 3 al abrir el modal)
  const response = await afipFetch(
    '/issuers',
    {
      method: 'GET',
      headers: {
        'X-Admin-Key': key,
        'X-Api-Key': key
      }
    },
    { timeoutMs: Number(process.env.AFIP_ISSUERS_TIMEOUT_MS || 15000), retries: 1 }
  );

  const data = await parseJsonResponse(response);
  if (!response.ok) {
    const err = new Error(data.message || `Error listando issuers HTTP ${response.status}`);
    err.status = response.status;
    err.details = data;
    throw err;
  }
  return Array.isArray(data) ? data : [];
}

async function consultarPadron({ cuitEmisor, idPersona, modoHomologacion }) {
  const { apiKey } = getConfig();
  if (!apiKey) {
    throw new Error('AFIP no configurado: falta AFIP_SERVICE_API_KEY');
  }

  const response = await afipFetch('/padron/consultar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey
    },
    body: JSON.stringify({
      cuitEmisor,
      idPersona,
      modoHomologacion
    })
  });

  const data = await parseJsonResponse(response);
  if (!response.ok) {
    const err = new Error(data.error || data.message || `Error padrón HTTP ${response.status}`);
    err.status = response.status;
    err.details = data;
    throw err;
  }
  return data;
}

module.exports = {
  getConfig,
  isAfipConfigured,
  generarFactura,
  listIssuers,
  consultarPadron
};
