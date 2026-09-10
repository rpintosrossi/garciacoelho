const { listIssuers, isAfipConfigured, consultarPadron } = require('../services/afipClient');
const { getAfipConfig, setModoHomologacion, getModoHomologacion } = require('../services/afipSettings');
const { digitsOnly } = require('../utils/afipFiscal');

const getConfig = async (_req, res) => {
  try {
    const config = await getAfipConfig();
    res.json(config);
  } catch (error) {
    console.error('[AFIP] getConfig', error);
    res.status(500).json({ message: 'Error al obtener configuración AFIP', error: error.message });
  }
};

const updateConfig = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Solo administradores pueden cambiar la configuración AFIP' });
    }

    if (typeof req.body?.modoHomologacion !== 'boolean') {
      return res.status(400).json({ message: 'modoHomologacion (boolean) es obligatorio' });
    }

    const modoHomologacion = await setModoHomologacion(req.body.modoHomologacion);
    res.json({
      modoHomologacion,
      ambiente: modoHomologacion ? 'H' : 'P',
      message: modoHomologacion
        ? 'Modo homologación activado (facturas de prueba AFIP)'
        : 'Modo producción activado (comprobantes reales)'
    });
  } catch (error) {
    console.error('[AFIP] updateConfig', error);
    res.status(500).json({ message: 'Error al actualizar configuración AFIP', error: error.message });
  }
};

const getIssuers = async (req, res) => {
  try {
    if (!isAfipConfigured()) {
      return res.status(503).json({
        message: 'Servicio AFIP no configurado',
        issuers: []
      });
    }

    const modoHomologacion = await getModoHomologacion();
    const ambiente = req.query.ambiente || (modoHomologacion ? 'H' : 'P');
    const all = await listIssuers();
    const issuers = all.filter(
      (i) => i.activo !== false && String(i.ambiente).toUpperCase() === String(ambiente).toUpperCase()
    );

    res.json({
      modoHomologacion,
      ambiente,
      issuers
    });
  } catch (error) {
    console.error('[AFIP] getIssuers', error);
    const status = error.status && error.status >= 400 ? error.status : 500;
    res.status(status).json({
      message: error.message || 'Error al listar facturadores',
      issuers: []
    });
  }
};

const consultarPersona = async (req, res) => {
  try {
    if (!isAfipConfigured()) {
      return res.status(503).json({ message: 'Servicio AFIP no configurado' });
    }

    const modoHomologacion = await getModoHomologacion();
    const idPersona = digitsOnly(req.body?.idPersona || req.query?.idPersona);
    const cuitEmisor = digitsOnly(req.body?.cuitEmisor || req.query?.cuitEmisor);

    if (!idPersona) {
      return res.status(400).json({ message: 'idPersona (CUIT) es obligatorio' });
    }

    // Si no mandan emisor, usar el primer facturador del ambiente actual
    let emisorCuit = cuitEmisor;
    if (!emisorCuit) {
      const all = await listIssuers();
      const ambiente = modoHomologacion ? 'H' : 'P';
      const first = all.find((i) => i.activo !== false && String(i.ambiente).toUpperCase() === ambiente);
      emisorCuit = first?.cuit;
    }

    if (!emisorCuit) {
      return res.status(400).json({ message: 'No hay facturador para consultar el padrón' });
    }

    const persona = await consultarPadron({
      cuitEmisor: emisorCuit,
      idPersona,
      modoHomologacion
    });

    res.json(persona);
  } catch (error) {
    console.error('[AFIP] consultarPersona', error);
    const status = error.status && error.status >= 400 ? error.status : 502;
    res.status(status).json({
      message: error.message || 'Error consultando padrón AFIP',
      error: error.details || error.message
    });
  }
};

module.exports = {
  getConfig,
  updateConfig,
  getIssuers,
  consultarPersona
};
