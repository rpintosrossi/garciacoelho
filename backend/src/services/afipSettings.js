const prisma = require('../lib/prisma');

const KEY_MODO_HOMOLOGACION = 'afip.modoHomologacion';

async function getModoHomologacion() {
  const row = await prisma.appSetting.findUnique({ where: { key: KEY_MODO_HOMOLOGACION } });
  if (row) {
    return row.value !== 'false';
  }
  // Fallback a env si aún no hay setting en DB
  return process.env.AFIP_MODO_HOMOLOGACION !== 'false';
}

async function setModoHomologacion(enabled) {
  const value = enabled ? 'true' : 'false';
  const row = await prisma.appSetting.upsert({
    where: { key: KEY_MODO_HOMOLOGACION },
    create: { key: KEY_MODO_HOMOLOGACION, value },
    update: { value }
  });
  return row.value !== 'false';
}

async function getAfipConfig() {
  const modoHomologacion = await getModoHomologacion();
  return {
    modoHomologacion,
    ambiente: modoHomologacion ? 'H' : 'P',
    serviceConfigured: Boolean(
      process.env.AFIP_SERVICE_URL && process.env.AFIP_SERVICE_API_KEY
    )
  };
}

module.exports = {
  KEY_MODO_HOMOLOGACION,
  getModoHomologacion,
  setModoHomologacion,
  getAfipConfig
};
