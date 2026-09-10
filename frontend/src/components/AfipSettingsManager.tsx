'use client';

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import axios from '@/lib/axios';

type Issuer = {
  id: string;
  cuit: string;
  nombre?: string;
  razonSocial?: string;
  puntoVenta?: number;
  ambiente?: string;
};

export default function AfipSettingsManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modoHomologacion, setModoHomologacion] = useState(true);
  const [serviceConfigured, setServiceConfigured] = useState(false);
  const [issuers, setIssuers] = useState<Issuer[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [configRes, issuersRes] = await Promise.all([
        axios.get('/afip/config'),
        axios.get('/afip/issuers')
      ]);
      setModoHomologacion(Boolean(configRes.data.modoHomologacion));
      setServiceConfigured(Boolean(configRes.data.serviceConfigured));
      setIssuers(issuersRes.data.issuers || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar configuración AFIP');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggle = async (checked: boolean) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await axios.put('/afip/config', { modoHomologacion: checked });
      setModoHomologacion(Boolean(data.modoHomologacion));
      setSuccess(data.message || 'Configuración actualizada');
      const issuersRes = await axios.get('/afip/issuers');
      setIssuers(issuersRes.data.issuers || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo actualizar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Facturación electrónica AFIP
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Elegí si GarciaCoelho emite en homologación (pruebas) o producción. Los facturadores disponibles
        son los issuers cargados en el servicio AFIP para ese ambiente.
      </Typography>

      {!serviceConfigured && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Faltan variables del backend: AFIP_SERVICE_URL / AFIP_SERVICE_API_KEY / AFIP_SERVICE_ADMIN_KEY.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={modoHomologacion}
              disabled={saving}
              onChange={(e) => handleToggle(e.target.checked)}
              color="warning"
            />
          }
          label={
            modoHomologacion
              ? 'Modo homologación (pruebas AFIP)'
              : 'Modo producción (comprobantes reales)'
          }
        />
        <Button size="small" onClick={load} disabled={loading || saving}>
          Actualizar listado
        </Button>
      </Stack>

      {!modoHomologacion && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Producción activa: las facturas emitidas tendrán validez fiscal real.
        </Alert>
      )}

      <Typography variant="subtitle1" gutterBottom>
        Facturadores disponibles ({modoHomologacion ? 'H' : 'P'})
      </Typography>
      {issuers.length === 0 ? (
        <Alert severity="info">
          No hay facturadores en este ambiente. Registrelos en el servicio AFIP (`/issuers`).
        </Alert>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>CUIT</TableCell>
              <TableCell>Punto de venta</TableCell>
              <TableCell>Razón social</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {issuers.map((issuer) => (
              <TableRow key={issuer.id}>
                <TableCell>{issuer.nombre || issuer.razonSocial || '-'}</TableCell>
                <TableCell>{issuer.cuit}</TableCell>
                <TableCell>{issuer.puntoVenta ?? '-'}</TableCell>
                <TableCell>{issuer.razonSocial || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
