'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  TextField,
  Button,
  LinearProgress
} from '@mui/material';
import { ReceiptLong as ReceiptLongIcon } from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { cachedApi } from '@/lib/axios';
import { formatCurrency } from '@/utils/formatCurrency';

interface SourceStat {
  total: number;
  count: number;
}

interface BillingSummary {
  total: number;
  count: number;
  averagePerInvoice: number;
  averagePerMonth: number;
  collected: number;
  pending: number;
  bySource: {
    AFIP: SourceStat;
    IMPORT: SourceStat;
    INFORMAL: SourceStat;
  };
  byStatus: {
    PENDIENTE: SourceStat;
    EMITIDA: SourceStat;
    PAGADA: SourceStat;
  };
}

interface MonthRow {
  monthKey: string;
  mes: string;
  total: number;
  count: number;
  afip: number;
  importadas: number;
  informales: number;
}

interface BillingData {
  range: { startDate: string; endDate: string };
  summary: BillingSummary;
  monthly: MonthRow[];
}

function argentinaToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}

function shiftMonths(ymd: string, delta: number) {
  const [year, month] = ymd.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function axisMoney(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value}`;
}

const today = argentinaToday();

export default function BillingStatsReport() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BillingData | null>(null);
  const [startDate, setStartDate] = useState(() => shiftMonths(today, -11));
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      if (!startDate || !endDate) {
        setLoading(false);
        setData(null);
        setError('Elegí la fecha desde y la fecha hasta');
        return;
      }
      if (startDate > endDate) {
        setLoading(false);
        setData(null);
        setError('La fecha desde no puede ser posterior a la fecha hasta');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const res = await cachedApi.get(`/reports/billing-stats?${params}`);
        if (!cancelled) setData(res.data);
      } catch (err: any) {
        if (!cancelled) {
          setData(null);
          setError(err?.response?.data?.message || 'Error al cargar la facturación');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  const presets = [
    {
      id: 'last12',
      label: 'Últimos 12 meses',
      start: shiftMonths(today, -11),
      end: today
    },
    {
      id: 'thisYear',
      label: 'Este año',
      start: `${today.slice(0, 4)}-01-01`,
      end: today
    },
    {
      id: 'lastYear',
      label: 'Año anterior',
      start: `${Number(today.slice(0, 4)) - 1}-01-01`,
      end: `${Number(today.slice(0, 4)) - 1}-12-31`
    }
  ];

  const summary = data?.summary;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <ReceiptLongIcon sx={{ color: '#2563eb', fontSize: 28 }} />
        <Typography variant="h5" fontWeight={600}>
          Facturación por mes
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Incluye facturas electrónicas, importadas e informales, según la fecha de cada comprobante.
      </Typography>

      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          label="Desde"
          type="date"
          size="small"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
        <TextField
          label="Hasta"
          type="date"
          size="small"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
        {presets.map((preset) => {
          const active = startDate === preset.start && endDate === preset.end;
          return (
            <Button
              key={preset.id}
              size="small"
              variant={active ? 'contained' : 'outlined'}
              onClick={() => {
                setStartDate(preset.start);
                setEndDate(preset.end);
              }}
              sx={{ textTransform: 'none' }}
            >
              {preset.label}
            </Button>
          );
        })}
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && data && summary && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
            <Card sx={{ border: '1px solid', borderColor: 'primary.light' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Total facturado</Typography>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  {formatCurrency(summary.total)}
                </Typography>
                <Typography variant="caption" color="text.secondary">{summary.count} facturas</Typography>
              </CardContent>
            </Card>
            <Card sx={{ border: '1px solid', borderColor: 'info.light' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Promedio mensual</Typography>
                <Typography variant="h5" fontWeight={700}>
                  {formatCurrency(summary.averagePerMonth)}
                </Typography>
                <Typography variant="caption" color="text.secondary">{data.monthly.length} meses</Typography>
              </CardContent>
            </Card>
            <Card sx={{ border: '1px solid', borderColor: 'secondary.light' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Promedio por factura</Typography>
                <Typography variant="h5" fontWeight={700}>
                  {formatCurrency(summary.averagePerInvoice)}
                </Typography>
                <Typography variant="caption" color="text.secondary">en el período</Typography>
              </CardContent>
            </Card>
            <Card sx={{ border: '1px solid', borderColor: 'success.light' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Cobrado</Typography>
                <Typography variant="h5" fontWeight={700} color="success.main">
                  {formatCurrency(summary.collected)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Pendiente {formatCurrency(summary.pending)}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#2563eb' }} />
                  <Typography variant="caption" color="text.secondary">Electrónicas</Typography>
                </Box>
                <Typography variant="h6" fontWeight={700}>{formatCurrency(summary.bySource.AFIP.total)}</Typography>
                <Typography variant="caption" color="text.secondary">{summary.bySource.AFIP.count} facturas</Typography>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                  <Typography variant="caption" color="text.secondary">Importadas</Typography>
                </Box>
                <Typography variant="h6" fontWeight={700}>{formatCurrency(summary.bySource.IMPORT.total)}</Typography>
                <Typography variant="caption" color="text.secondary">{summary.bySource.IMPORT.count} facturas</Typography>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#8b5cf6' }} />
                  <Typography variant="caption" color="text.secondary">Informales</Typography>
                </Box>
                <Typography variant="h6" fontWeight={700}>{formatCurrency(summary.bySource.INFORMAL.total)}</Typography>
                <Typography variant="caption" color="text.secondary">{summary.bySource.INFORMAL.count} facturas</Typography>
              </CardContent>
            </Card>
          </Box>

          {summary.count === 0 ? (
            <Alert severity="info">No hay facturas en el período seleccionado.</Alert>
          ) : (
            <>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Evolución mensual</Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data.monthly} margin={{ top: 8, right: 16, left: 8, bottom: data.monthly.length > 12 ? 24 : 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11 }}
                      interval={data.monthly.length > 18 ? 'preserveStartEnd' : 0}
                      angle={data.monthly.length > 12 ? -35 : 0}
                      textAnchor={data.monthly.length > 12 ? 'end' : 'middle'}
                      height={data.monthly.length > 12 ? 70 : 30}
                    />
                    <YAxis tickFormatter={axisMoney} width={72} />
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="afip" name="Electrónicas" stackId="facturacion" fill="#2563eb" />
                    <Bar dataKey="importadas" name="Importadas" stackId="facturacion" fill="#f59e0b" />
                    <Bar dataKey="informales" name="Informales" stackId="facturacion" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>

              <Paper>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6">Detalle por mes</Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Mes</TableCell>
                        <TableCell align="right">Facturas</TableCell>
                        <TableCell align="right">Electrónicas</TableCell>
                        <TableCell align="right">Importadas</TableCell>
                        <TableCell align="right">Informales</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell sx={{ minWidth: 160 }}>Participación</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.monthly.map((row) => {
                        const share = summary.total > 0 ? (row.total / summary.total) * 100 : 0;
                        return (
                          <TableRow key={row.monthKey} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                                {row.mes}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{row.count}</TableCell>
                            <TableCell align="right">{formatCurrency(row.afip)}</TableCell>
                            <TableCell align="right">{formatCurrency(row.importadas)}</TableCell>
                            <TableCell align="right">{formatCurrency(row.informales)}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={700}>{formatCurrency(row.total)}</Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={share}
                                  sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                                />
                                <Typography variant="caption" sx={{ minWidth: 36 }}>
                                  {summary.total > 0 ? `${((row.total / summary.total) * 100).toFixed(0)}%` : '0%'}
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          )}
        </>
      )}
    </Box>
  );
}
