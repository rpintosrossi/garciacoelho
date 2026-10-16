'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import axios from '@/lib/axios';
import { keyframes } from '@mui/system';

const checkPop = keyframes`
  0% { transform: scale(0.4); opacity: 0; }
  55% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

type ServiceLike = {
  id: string;
  name?: string;
  description?: string;
  building?: {
    name?: string;
    address?: string;
  };
};

type Facturador = {
  id: string;
  cuit: string;
  nombre?: string;
  razonSocial?: string;
  puntoVenta?: number;
  domicilio?: string;
  condicionIva?: string;
  ingresosBrutos?: string;
  inicioActividades?: string;
  ambiente?: string;
  facturadoMes?: number;
  facturadoAnio?: number;
  cantidadMes?: number;
  cantidadAnio?: number;
};

type LineItem = {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type Props = {
  open: boolean;
  service: ServiceLike | null;
  /** Si hay varios remitos/servicios del mismo edificio, se emite una sola FE. */
  services?: ServiceLike[] | null;
  onClose: () => void;
  onSuccess: () => void;
};

const TIPO_LABELS: Record<number, string> = {
  1: 'Factura A (01)',
  6: 'Factura B (06)',
  11: 'Factura C (11)'
};

function tipoLetter(tipo: number) {
  if (tipo === 1) return 'A';
  if (tipo === 11) return 'C';
  return 'B';
}

/** Misma regla que backend/afipFiscal.mapTipoComprobante */
function mapTipoComprobante(emisorCondicion?: string, receptorTaxCondition?: string) {
  const emisor = String(emisorCondicion || '').toUpperCase();
  if (
    emisor.includes('MONOTRIBUTO') ||
    emisor === 'MONOTRIBUTO' ||
    emisor.includes('EXENTO') ||
    emisor === 'EXENTO'
  ) {
    return 11;
  }
  if (receptorTaxCondition === 'RESPONSABLE_INSCRIPTO') return 1;
  return 6;
}

function money(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function newLine(description = '', unitPrice = ''): LineItem {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description,
    quantity: '1',
    unitPrice
  };
}

function getApiErrorMessage(err: any, fallback: string) {
  const data = err?.response?.data;
  const generics = new Set([
    'Error AFIP al generar factura',
    'Error al emitir factura electrónica',
    'Error desconocido de AFIP',
    'Network Error'
  ]);
  const candidates: string[] = [];

  const push = (c: unknown) => {
    if (typeof c === 'string' && c.trim()) candidates.push(c.trim());
    else if (c && typeof c === 'object') {
      const nested =
        (c as any).message || (c as any).error || (c as any).Msg || (c as any).msg;
      if (typeof nested === 'string' && nested.trim()) candidates.push(nested.trim());
    }
  };

  push(data?.error);
  push(data?.message);
  push(data?.details?.error);
  push(data?.details?.message);
  push(err?.message);

  const specific = candidates.find((c) => !generics.has(c) && c.length > 8);
  return specific || candidates[0] || fallback;
}

function Section({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" fontWeight={700}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {subtitle}
        </Typography>
      )}
      {!subtitle && <Box mb={1.5} />}
      {children}
    </Paper>
  );
}

export default function ElectronicInvoiceModal({
  open,
  service,
  services,
  onClose,
  onSuccess
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [successAnim, setSuccessAnim] = useState(false);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const serviceList = useMemo(() => {
    if (Array.isArray(services) && services.length > 0) return services.filter((s) => s?.id);
    return service?.id ? [service] : [];
  }, [services, service]);

  const primaryService = serviceList[0] || null;
  const serviceIds = useMemo(() => serviceList.map((s) => s.id), [serviceList]);
  const isBulk = serviceIds.length > 1;

  const [facturadores, setFacturadores] = useState<Facturador[]>([]);
  const [cuitEmisor, setCuitEmisor] = useState('');
  const [modoHomologacion, setModoHomologacion] = useState(true);
  const [ambiente, setAmbiente] = useState('H');
  const [configured, setConfigured] = useState(true);

  const [receptorNombre, setReceptorNombre] = useState('');
  const [receptorDomicilio, setReceptorDomicilio] = useState('');
  const [docTipo, setDocTipo] = useState(99);
  const [docNro, setDocNro] = useState('0');
  const [taxCondition, setTaxCondition] = useState('CONSUMIDOR_FINAL');
  const [concepto, setConcepto] = useState(2);
  const [fchServicio, setFchServicio] = useState('');
  const [condicionVenta, setCondicionVenta] = useState('Contado');
  const [items, setItems] = useState<LineItem[]>([newLine()]);

  const selectedFacturador = useMemo(
    () => facturadores.find((f) => f.cuit === cuitEmisor) || null,
    [facturadores, cuitEmisor]
  );

  const puntoVenta = Number(selectedFacturador?.puntoVenta || 0);

  const tipoComprobante = useMemo(
    () => mapTipoComprobante(selectedFacturador?.condicionIva, taxCondition),
    [selectedFacturador?.condicionIva, taxCondition]
  );

  const parsedItems = useMemo(() => {
    return items.map((item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const subtotal = Math.round(quantity * unitPrice * 100) / 100;
      return { ...item, quantity, unitPrice, subtotal };
    });
  }, [items]);

  const impTotal = useMemo(
    () => Math.round(parsedItems.reduce((acc, i) => acc + i.subtotal, 0) * 100) / 100,
    [parsedItems]
  );

  const { impNeto, impIVA } = useMemo(() => {
    if (!impTotal) return { impNeto: 0, impIVA: 0 };
    if (Number(tipoComprobante) === 11) return { impNeto: impTotal, impIVA: 0 };
    const neto = Math.round((impTotal / 1.21) * 100) / 100;
    const iva = Math.round((impTotal - neto) * 100) / 100;
    return { impNeto: neto, impIVA: iva };
  }, [impTotal, tipoComprobante]);

  const previewLetter = useMemo(() => tipoLetter(Number(tipoComprobante)), [tipoComprobante]);

  const applyDefaults = (data: any, keepItems = false) => {
    setConfigured(Boolean(data.configured));
    setModoHomologacion(Boolean(data.modoHomologacion));
    setAmbiente(data.ambiente || (data.modoHomologacion ? 'H' : 'P'));
    const list: Facturador[] = data.facturadores || [];
    setFacturadores(list);
    const initialCuit = data.emisor?.cuit || list[0]?.cuit || '';
    setCuitEmisor(initialCuit);
    setReceptorNombre(
      data.receptor?.nombre || primaryService?.building?.name || service?.building?.name || ''
    );
    setReceptorDomicilio(
      data.receptor?.domicilio ||
        primaryService?.building?.address ||
        service?.building?.address ||
        ''
    );
    setDocTipo(Number(data.receptor?.docTipo ?? 99));
    setDocNro(String(data.receptor?.docNro ?? '0'));
    setTaxCondition(data.receptor?.taxCondition || 'CONSUMIDOR_FINAL');
    setConcepto(Number(data.comprobante?.concepto || 2));
    setFchServicio(data.comprobante?.fchServicio || '');
    setCondicionVenta(data.comprobante?.condicionVenta || 'Contado');

    if (!keepItems) {
      const defaultItems = data.comprobante?.items;
      if (Array.isArray(defaultItems) && defaultItems.length > 0) {
        setItems(
          defaultItems.map((it: any) =>
            newLine(
              it.description || service?.description || '',
              String(it.unitPrice ?? it.subtotal ?? 0)
            )
          )
        );
      } else {
        const raw = service?.description || data.service?.description || 'Servicio';
        const lines = String(raw)
          .split(/\r?\n|\s*\|\s*/)
          .map((s) => s.trim())
          .filter(Boolean);
        const total = Number(data.comprobante?.impTotal ?? 0);
        setItems(
          (lines.length ? lines : ['Servicio']).map((desc, index) =>
            newLine(desc, String(index === 0 ? total : 0))
          )
        );
      }
    }
  };

  useEffect(() => {
    if (!open || !primaryService?.id) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setResult(null);
      setSuccessAnim(false);
      try {
        const { data } = await axios.get(
          `/services/${primaryService.id}/electronic-invoice/defaults`,
          {
            params:
              serviceIds.length > 1 ? { serviceIds: serviceIds.join(',') } : undefined
          }
        );
        if (cancelled) return;
        applyDefaults(data);
      } catch (err: any) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'No se pudieron cargar los datos fiscales'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, primaryService?.id, serviceIds.join(',')]);

  const handleFacturadorChange = (cuit: string) => {
    setCuitEmisor(cuit);
  };

  const updateItem = (key: string, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, newLine()]);

  const removeItem = (key: string) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((item) => item.key !== key)));
  };

  const scrollToAlerts = () => {
    requestAnimationFrame(() => {
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const handleEmit = async () => {
    if (!primaryService?.id) return;
    if (!cuitEmisor) {
      setError('Seleccioná un facturador');
      scrollToAlerts();
      return;
    }
    // Incluir ítems con valor 0 (se muestran en la factura para detallar el trabajo).
    const validItems = parsedItems.filter((i) => i.description.trim());
    if (!validItems.length) {
      setError('Agregá al menos un detalle con descripción');
      scrollToAlerts();
      return;
    }
    if (impTotal <= 0) {
      setError('El total de la factura debe ser mayor a 0');
      scrollToAlerts();
      return;
    }

    setSaving(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await axios.post(`/services/${primaryService.id}/electronic-invoice`, {
        cuitEmisor,
        serviceIds,
        tipoComprobante: Number(tipoComprobante),
        puntoVenta: Number(puntoVenta),
        concepto: Number(concepto),
        docTipo: Number(docTipo),
        docNro,
        taxCondition,
        receptorNombre,
        receptorDomicilio,
        description: validItems.map((i) => i.description).join(' | '),
        impTotal,
        impNeto,
        impIVA,
        fchServicio,
        fchVtoPago: fchServicio,
        condicionVenta,
        razonSocial: selectedFacturador?.razonSocial,
        domicilioEmisor: selectedFacturador?.domicilio,
        emisorCondicionIva: selectedFacturador?.condicionIva,
        ingresosBrutos: selectedFacturador?.ingresosBrutos,
        inicioActividades: selectedFacturador?.inicioActividades,
        items: validItems.map((i) => ({
          description: i.description.trim(),
          quantity: i.quantity || 1,
          unit: 'unidades',
          unitPrice: i.unitPrice,
          subtotal: i.subtotal
        }))
      });
      setResult(data);
      setSuccessAnim(true);
      onSuccess();
      window.setTimeout(() => {
        setSuccessAnim(false);
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Error al emitir factura electrónica'));
      scrollToAlerts();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (saving) return;
        // Evitar perder el formulario al clickear afuera o Escape
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
        onClose();
      }}
      fullWidth
      maxWidth="xl"
      PaperProps={{ sx: { maxWidth: 1200, position: 'relative', overflow: 'hidden' } }}
    >
      {successAnim && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 30,
            bgcolor: 'rgba(255,255,255,0.96)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            animation: `${fadeIn} 0.25s ease-out`
          }}
        >
          <CheckCircleRoundedIcon
            sx={{
              fontSize: 96,
              color: 'success.main',
              animation: `${checkPop} 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.2)`
            }}
          />
          <Typography variant="h6" fontWeight={700} color="success.main">
            Factura emitida
          </Typography>
          {result?.afip?.cae && (
            <Typography variant="body2" color="text.secondary">
              CAE {result.afip.cae}
              {result?.invoice?.number ? ` — N° ${result.invoice.number}` : ''}
            </Typography>
          )}
        </Box>
      )}
      <DialogTitle>
        {isBulk
          ? `Facturación Electrónica AFIP — ${serviceIds.length} remitos`
          : 'Facturación Electrónica AFIP'}
      </DialogTitle>
      <DialogContent dividers ref={contentRef}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2} mt={0.5}>
            <Alert severity={modoHomologacion ? 'warning' : 'error'}>
              Ambiente: <b>{modoHomologacion ? 'Homologación (pruebas)' : 'Producción (real)'}</b>
              {' — '}
              Ajustes → Facturación AFIP
            </Alert>

            {isBulk && (
              <Alert severity="info">
                Se emitirá <b>una sola factura</b> para {serviceIds.length} remitos del edificio{' '}
                <b>
                  {primaryService?.building?.name ||
                    service?.building?.name ||
                    'seleccionado'}
                </b>
                . Todos quedarán facturados y el saldo de la cuenta se actualizará.
              </Alert>
            )}

            {!configured && (
              <Alert severity="warning">
                No hay facturadores para ambiente {ambiente}. Cargá issuers en el servicio AFIP.
              </Alert>
            )}

            <Section
              title="1. Facturador"
              subtitle="Elegí quién emite. Totales = facturas electrónicas AFIP en este sistema (mes y año calendario)"
            >
              {facturadores.length === 0 ? (
                <Alert severity="info">No hay facturadores para este ambiente.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Facturador</TableCell>
                        <TableCell>CUIT</TableCell>
                        <TableCell align="right">PV</TableCell>
                        <TableCell>Condición IVA</TableCell>
                        <TableCell align="right">Facturado mes</TableCell>
                        <TableCell align="right">Facturado año</TableCell>
                        <TableCell align="right"># año</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[...facturadores]
                        .sort(
                          (a, b) =>
                            Number(a.facturadoAnio || 0) - Number(b.facturadoAnio || 0) ||
                            String(a.nombre || '').localeCompare(String(b.nombre || ''))
                        )
                        .map((f) => {
                          const selected = f.cuit === cuitEmisor;
                          return (
                            <TableRow
                              key={f.id || f.cuit}
                              hover
                              selected={selected}
                              onClick={() => handleFacturadorChange(f.cuit)}
                              sx={{
                                cursor: 'pointer',
                                '&.Mui-selected': { bgcolor: 'action.selected' }
                              }}
                            >
                              <TableCell>
                                <Typography variant="body2" fontWeight={selected ? 700 : 500}>
                                  {f.nombre || f.razonSocial || 'Emisor'}
                                </Typography>
                                {f.razonSocial && f.razonSocial !== f.nombre && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {f.razonSocial}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>{f.cuit}</TableCell>
                              <TableCell align="right">
                                {String(f.puntoVenta ?? '-').padStart(5, '0')}
                              </TableCell>
                              <TableCell>{f.condicionIva || '-'}</TableCell>
                              <TableCell align="right">{money(f.facturadoMes || 0)}</TableCell>
                              <TableCell align="right">{money(f.facturadoAnio || 0)}</TableCell>
                              <TableCell align="right">{f.cantidadAnio || 0}</TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {selectedFacturador && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Seleccionado:{' '}
                  <b>{selectedFacturador.razonSocial || selectedFacturador.nombre}</b>
                  {selectedFacturador.domicilio ? ` — ${selectedFacturador.domicilio}` : ''}
                  {` — ${selectedFacturador.condicionIva || 'IVA Responsable Inscripto'}`}
                </Typography>
              )}
            </Section>

            <Section title="2. Cliente / Receptor" subtitle="Datos de quien recibe la factura">
              <Grid container spacing={2}>
                <Grid component="div" item xs={12} md={6}>
                  <TextField
                    label="Apellido y Nombre / Razón Social"
                    value={receptorNombre}
                    onChange={(e) => setReceptorNombre(e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid component="div" item xs={12} md={6}>
                  <TextField
                    label="Domicilio"
                    value={receptorDomicilio}
                    onChange={(e) => setReceptorDomicilio(e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid component="div" item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Condición IVA</InputLabel>
                    <Select
                      label="Condición IVA"
                      value={taxCondition}
                      onChange={(e) => setTaxCondition(e.target.value)}
                    >
                      <MenuItem value="RESPONSABLE_INSCRIPTO">Responsable Inscripto</MenuItem>
                      <MenuItem value="MONOTRIBUTO">Monotributo</MenuItem>
                      <MenuItem value="EXENTO">Exento</MenuItem>
                      <MenuItem value="CONSUMIDOR_FINAL">Consumidor Final</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid component="div" item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo documento</InputLabel>
                    <Select
                      label="Tipo documento"
                      value={docTipo}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setDocTipo(next);
                        // AFIP 10015: DocTipo 99 ⇒ DocNro = 0
                        if (next === 99) setDocNro('0');
                      }}
                    >
                      <MenuItem value={80}>CUIT (80)</MenuItem>
                      <MenuItem value={96}>DNI (96)</MenuItem>
                      <MenuItem value={99}>Consumidor Final (99)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid component="div" item xs={12} md={4}>
                  <TextField
                    label="N° documento"
                    value={docNro}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDocNro(value);
                      const digits = value.replace(/\D/g, '');
                      if (digits.length === 11) setDocTipo(80);
                      else if (digits.length >= 7 && digits.length <= 8) setDocTipo(96);
                      else if (!digits || digits === '0') setDocTipo(99);
                    }}
                    fullWidth
                    helperText={
                      docTipo === 99
                        ? 'Con tipo 99 AFIP exige N° = 0 (CF sin identificar)'
                        : undefined
                    }
                    disabled={docTipo === 99}
                  />
                </Grid>
              </Grid>
            </Section>

            <Section
              title="3. Comprobante"
              subtitle="El tipo A/B/C lo define AFIP según condición IVA del emisor y del receptor"
            >
              <Grid container spacing={2}>
                <Grid component="div" item xs={12} md={4}>
                  <TextField
                    label="Tipo comprobante"
                    value={`${TIPO_LABELS[tipoComprobante] || tipoComprobante} — letra ${previewLetter}`}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    helperText={
                      selectedFacturador
                        ? `Emisor: ${selectedFacturador.condicionIva || '-'} → Receptor: ${taxCondition}`
                        : 'Seleccioná un facturador'
                    }
                  />
                </Grid>
                <Grid component="div" item xs={12} md={4}>
                  <TextField
                    label="Punto de venta"
                    value={puntoVenta ? String(puntoVenta).padStart(5, '0') : '—'}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    helperText="Lo define AFIP para este facturador (webservice)"
                  />
                </Grid>
                <Grid component="div" item xs={12} md={4}>
                  <TextField
                    label="Fecha (yyyymmdd)"
                    value={fchServicio}
                    onChange={(e) => setFchServicio(e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid component="div" item xs={12} md={6}>
                  <TextField
                    label="Condición de venta"
                    value={condicionVenta}
                    onChange={(e) => setCondicionVenta(e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid component="div" item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Concepto</InputLabel>
                    <Select
                      label="Concepto"
                      value={concepto}
                      onChange={(e) => setConcepto(Number(e.target.value))}
                    >
                      <MenuItem value={1}>Productos</MenuItem>
                      <MenuItem value={2}>Servicios</MenuItem>
                      <MenuItem value={3}>Productos y Servicios</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Section>

            <Section
              title="4. Detalle a cobrar"
              subtitle="Cada ítem del remito va en una fila. Los de valor 0 también se incluyen en la factura"
            >
              <Stack spacing={1.5}>
                {items.map((item, index) => {
                  const parsed = parsedItems[index];
                  return (
                    <Paper key={item.key} variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <TextField
                          label={`Descripción ${index + 1}`}
                          value={item.description}
                          onChange={(e) => updateItem(item.key, { description: e.target.value })}
                          fullWidth
                          size="small"
                          sx={{ flex: 1, minWidth: 280 }}
                        />
                        <TextField
                          label="Cant."
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                          size="small"
                          sx={{ width: 96, flexShrink: 0 }}
                          inputProps={{ min: 0, step: '0.01' }}
                        />
                        <TextField
                          label="P. unit."
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.key, { unitPrice: e.target.value })}
                          size="small"
                          sx={{ width: 130, flexShrink: 0 }}
                          inputProps={{ min: 0, step: '0.01' }}
                        />
                        <TextField
                          label="Subtotal"
                          value={money(parsed?.subtotal || 0)}
                          size="small"
                          sx={{ width: 140, flexShrink: 0 }}
                          InputProps={{ readOnly: true }}
                        />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeItem(item.key)}
                          disabled={items.length <= 1}
                          aria-label="Eliminar ítem"
                          sx={{ flexShrink: 0 }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Paper>
                  );
                })}

                <Box>
                  <Button startIcon={<AddIcon />} onClick={addItem} variant="outlined" size="small">
                    Agregar detalle
                  </Button>
                </Box>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid component="div" item xs={12} md={4}>
                  <TextField label="Neto" value={money(impNeto)} fullWidth InputProps={{ readOnly: true }} />
                </Grid>
                <Grid component="div" item xs={12} md={4}>
                  <TextField label="IVA" value={money(impIVA)} fullWidth InputProps={{ readOnly: true }} />
                </Grid>
                <Grid component="div" item xs={12} md={4}>
                  <TextField
                    label="Total"
                    value={money(impTotal)}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    sx={{ '& .MuiInputBase-input': { fontWeight: 700 } }}
                  />
                </Grid>
              </Grid>
            </Section>

            <Section title="5. Resumen">
              <Typography variant="body2">
                Factura <b>{previewLetter}</b> —{' '}
                {selectedFacturador?.razonSocial || selectedFacturador?.nombre || 'Emisor'} →{' '}
                {receptorNombre || 'Receptor'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                PV {puntoVenta ? String(puntoVenta).padStart(5, '0') : '—'} — Doc {docTipo} {docNro} — {parsedItems.length} ítem(s)
              </Typography>
              <Box mt={1}>
                {parsedItems
                  .filter((i) => i.description.trim())
                  .map((i) => (
                    <Typography key={i.key} variant="body2">
                      • {i.description} — ${money(i.subtotal)}
                      {i.subtotal === 0 ? ' (sin cargo)' : ''}
                    </Typography>
                  ))}
              </Box>
              <Typography variant="body1" fontWeight={700} sx={{ mt: 1 }}>
                Total ${money(impTotal)}
              </Typography>
            </Section>
          </Stack>
        )}
      </DialogContent>
      {error && !successAnim && (
        <Box px={3} pt={1.5} pb={0}>
          <Alert severity="error" onClose={() => setError(null)} sx={{ whiteSpace: 'pre-wrap' }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Error de AFIP
            </Typography>
            {error}
          </Alert>
        </Box>
      )}
      <DialogActions>
        <Button onClick={onClose} disabled={saving || successAnim}>
          Cancelar
        </Button>
        {!successAnim && (
          <Button
            variant="contained"
            onClick={handleEmit}
            disabled={saving || loading || impTotal <= 0 || !cuitEmisor}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving ? 'Emitiendo…' : 'Emitir factura AFIP'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
