'use client';

import { useEffect, useMemo, useState } from 'react';
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
  MenuItem,
  LinearProgress
} from '@mui/material';
import { Engineering as EngineeringIcon } from '@mui/icons-material';
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
import api from '@/lib/axios';
import { formatCurrency } from '@/utils/formatCurrency';

interface TechBucket {
  jobs: number;
  enCurso: number;
  sinCobro: number;
  conRemito: number;
  facturados: number;
  remitoTotal: number;
  invoiced: number;
  collected: number;
  unbilled: number;
  pending: number;
}

interface TechnicianRow extends TechBucket {
  id: string;
  name: string;
  status: string;
}

interface MonthRow {
  monthKey: string;
  mes: string;
  jobs: number;
  enCurso: number;
  sinCobro: number;
  conRemito: number;
  facturados: number;
  remitoTotal: number;
  invoiced: number;
  collected: number;
  unbilled: number;
  pending: number;
  byTechnician: Record<string, TechBucket>;
}

interface TechnicianStats {
  range: { startDate: string; endDate: string };
  summary: TechBucket & { averagePerJob: number };
  technicians: TechnicianRow[];
  monthly: MonthRow[];
}

const TECH_COLORS = [
  '#7c3aed',
  '#2563eb',
  '#059669',
  '#d97706',
  '#db2777',
  '#0891b2',
  '#4f46e5',
  '#ca8a04',
  '#e11d48',
  '#0d9488',
  '#9333ea',
  '#ea580c'
];

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

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function emptyBucket(): TechBucket {
  return {
    jobs: 0,
    enCurso: 0,
    sinCobro: 0,
    conRemito: 0,
    facturados: 0,
    remitoTotal: 0,
    invoiced: 0,
    collected: 0,
    unbilled: 0,
    pending: 0
  };
}

function addBucket(target: TechBucket, source: TechBucket) {
  target.jobs += source.jobs || 0;
  target.enCurso += source.enCurso || 0;
  target.sinCobro += source.sinCobro || 0;
  target.conRemito += source.conRemito || 0;
  target.facturados += source.facturados || 0;
  target.remitoTotal = roundMoney(target.remitoTotal + (source.remitoTotal || 0));
  target.invoiced = roundMoney(target.invoiced + (source.invoiced || 0));
  target.collected = roundMoney(target.collected + (source.collected || 0));
  target.unbilled = roundMoney(target.unbilled + (source.unbilled || 0));
  target.pending = roundMoney(Math.max(target.invoiced - target.collected, 0));
}

const today = argentinaToday();

export default function TechnicianStatsReport() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TechnicianStats | null>(null);
  const [startDate, setStartDate] = useState(() => shiftMonths(today, -11));
  const [endDate, setEndDate] = useState(today);
  const [technicianId, setTechnicianId] = useState('all');

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
        params.append('startDate', startDate);
        params.append('endDate', endDate);
        const res = await api.get(`/reports/technician-stats?${params}`);
        if (!cancelled) {
          setData(res.data);
          setTechnicianId((current) => {
            if (current === 'all') return current;
            const stillThere = res.data.technicians?.some((tech: TechnicianRow) => tech.id === current);
            return stillThere ? current : 'all';
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          setData(null);
          setError(err?.response?.data?.message || 'Error al cargar las estadísticas de técnicos');
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
      id: 'thisMonth',
      label: 'Este mes',
      start: `${today.slice(0, 7)}-01`,
      end: today
    },
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

  const view = useMemo(() => {
    if (!data) return null;

    const selected = technicianId === 'all'
      ? data.technicians
      : data.technicians.filter((tech) => tech.id === technicianId);

    const summary = emptyBucket();
    selected.forEach((tech) => addBucket(summary, tech));

    const ranked = technicianId === 'all'
      ? [...data.technicians].sort((a, b) => b.jobs - a.jobs || b.invoiced - a.invoiced)
      : selected;
    const topIds = new Set(ranked.slice(0, 8).map((tech) => tech.id));
    const hasOtros = technicianId === 'all' && data.technicians.length > 8;

    const monthly = data.monthly.map((month) => {
      const row: Record<string, string | number> = {
        mes: month.mes,
        monthKey: month.monthKey,
        jobs: 0,
        invoiced: 0,
        collected: 0,
        remitoTotal: 0,
        pending: 0,
        unbilled: 0,
        sinCobro: 0,
        otros: 0
      };

      const sourceIds = technicianId === 'all'
        ? data.technicians.map((tech) => tech.id)
        : [technicianId];

      sourceIds.forEach((id) => {
        const slice = month.byTechnician[id];
        if (!slice) return;
        row.jobs = Number(row.jobs) + slice.jobs;
        row.invoiced = roundMoney(Number(row.invoiced) + slice.invoiced);
        row.collected = roundMoney(Number(row.collected) + slice.collected);
        row.remitoTotal = roundMoney(Number(row.remitoTotal) + slice.remitoTotal);
        row.unbilled = roundMoney(Number(row.unbilled) + slice.unbilled);
        row.sinCobro = Number(row.sinCobro) + slice.sinCobro;
        if (technicianId === 'all' && !topIds.has(id)) {
          row.otros = Number(row.otros) + slice.jobs;
        } else {
          row[id] = slice.jobs;
        }
      });

      row.pending = roundMoney(Math.max(Number(row.invoiced) - Number(row.collected), 0));
      return row;
    });

    const series = technicianId === 'all'
      ? [
          ...ranked.slice(0, 8).map((tech, index) => ({
            id: tech.id,
            name: tech.name,
            color: TECH_COLORS[index % TECH_COLORS.length]
          })),
          ...(hasOtros ? [{ id: 'otros', name: 'Otros', color: '#94a3b8' }] : [])
        ]
      : selected.map((tech) => ({
          id: tech.id,
          name: tech.name,
          color: '#7c3aed'
        }));

    return { summary, monthly, series, selected };
  }, [data, technicianId]);

  const summary = view?.summary;
  const jobTotal = summary?.jobs || 0;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <EngineeringIcon sx={{ color: '#7c3aed', fontSize: 28 }} />
        <Typography variant="h5" fontWeight={600}>
          Técnicos
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 820 }}>
        Trabajos asignados a cada técnico, según la fecha de visita. Si el trabajo no tiene visita, se usa la fecha de alta.
        Lo facturado y lo cobrado se reparten entre los servicios de cada factura según el monto de sus remitos.
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
        <TextField
          select
          label="Técnico"
          size="small"
          value={technicianId}
          onChange={(e) => setTechnicianId(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="all">Todos</MenuItem>
          {(data?.technicians || []).map((tech) => (
            <MenuItem key={tech.id} value={tech.id}>
              {tech.name}
            </MenuItem>
          ))}
        </TextField>
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

      {!loading && data && summary && view && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
            <Card sx={{ border: '1px solid', borderColor: '#ddd6fe' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Trabajos</Typography>
                <Typography variant="h5" fontWeight={700} color="#7c3aed">
                  {summary.jobs}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {summary.enCurso} en curso · {summary.sinCobro} sin cobro
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ border: '1px solid', borderColor: 'primary.light' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Facturado</Typography>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  {formatCurrency(summary.invoiced)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {summary.facturados} trabajos con factura
                </Typography>
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
            <Card sx={{ border: '1px solid', borderColor: 'warning.light' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Remitos</Typography>
                <Typography variant="h5" fontWeight={700}>
                  {formatCurrency(summary.remitoTotal)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Sin facturar {formatCurrency(summary.unbilled)}
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">Promedio por trabajo</Typography>
                <Typography variant="h5" fontWeight={700}>
                  {formatCurrency(summary.jobs > 0 ? summary.remitoTotal / summary.jobs : 0)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  sobre el monto de remitos
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {summary.jobs === 0 ? (
            <Alert severity="info">No hay trabajos de técnicos en el período seleccionado.</Alert>
          ) : (
            <>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Trabajos por mes</Typography>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={view.monthly} margin={{ top: 8, right: 16, left: 8, bottom: view.monthly.length > 12 ? 24 : 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11 }}
                      interval={view.monthly.length > 18 ? 'preserveStartEnd' : 0}
                      angle={view.monthly.length > 12 ? -35 : 0}
                      textAnchor={view.monthly.length > 12 ? 'end' : 'middle'}
                      height={view.monthly.length > 12 ? 70 : 30}
                    />
                    <YAxis allowDecimals={false} width={40} />
                    <RechartsTooltip />
                    <Legend />
                    {view.series.map((series, index) => (
                      <Bar
                        key={series.id}
                        dataKey={series.id}
                        name={series.name}
                        stackId="trabajos"
                        fill={series.color}
                        radius={index === view.series.length - 1 ? [4, 4, 0, 0] : undefined}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Paper>

              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Facturado y cobrado por mes</Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={view.monthly} margin={{ top: 8, right: 16, left: 8, bottom: view.monthly.length > 12 ? 24 : 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11 }}
                      interval={view.monthly.length > 18 ? 'preserveStartEnd' : 0}
                      angle={view.monthly.length > 12 ? -35 : 0}
                      textAnchor={view.monthly.length > 12 ? 'end' : 'middle'}
                      height={view.monthly.length > 12 ? 70 : 30}
                    />
                    <YAxis tickFormatter={axisMoney} width={72} />
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="invoiced" name="Facturado" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collected" name="Cobrado" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>

              {technicianId === 'all' && (
                <Paper sx={{ mb: 3 }}>
                  <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6">Comparación entre técnicos</Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Técnico</TableCell>
                          <TableCell align="right">Trabajos</TableCell>
                          <TableCell align="right">Facturado</TableCell>
                          <TableCell align="right">Cobrado</TableCell>
                          <TableCell align="right">Pendiente</TableCell>
                          <TableCell align="right">Remitos</TableCell>
                          <TableCell align="right">Sin facturar</TableCell>
                          <TableCell align="right">Sin cobro</TableCell>
                          <TableCell sx={{ minWidth: 150 }}>Participación</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.technicians.map((tech) => {
                          const share = jobTotal > 0 ? (tech.jobs / jobTotal) * 100 : 0;
                          return (
                            <TableRow
                              key={tech.id}
                              hover
                              onClick={() => setTechnicianId(tech.id)}
                              sx={{ cursor: 'pointer' }}
                            >
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {tech.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {tech.enCurso} en curso · {tech.conRemito} con remito · {tech.facturados} facturados
                                </Typography>
                              </TableCell>
                              <TableCell align="right">{tech.jobs}</TableCell>
                              <TableCell align="right">{formatCurrency(tech.invoiced)}</TableCell>
                              <TableCell align="right">{formatCurrency(tech.collected)}</TableCell>
                              <TableCell align="right">{formatCurrency(tech.pending)}</TableCell>
                              <TableCell align="right">{formatCurrency(tech.remitoTotal)}</TableCell>
                              <TableCell align="right">{formatCurrency(tech.unbilled)}</TableCell>
                              <TableCell align="right">{tech.sinCobro}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={share}
                                    sx={{ flexGrow: 1, height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': { bgcolor: '#7c3aed' } }}
                                  />
                                  <Typography variant="caption" sx={{ minWidth: 36 }}>
                                    {share.toFixed(0)}%
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
              )}

              <Paper>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6">Detalle por mes</Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Mes</TableCell>
                        <TableCell align="right">Trabajos</TableCell>
                        <TableCell align="right">Remitos</TableCell>
                        <TableCell align="right">Facturado</TableCell>
                        <TableCell align="right">Cobrado</TableCell>
                        <TableCell align="right">Pendiente</TableCell>
                        <TableCell align="right">Sin facturar</TableCell>
                        <TableCell align="right">Sin cobro</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {view.monthly.map((row) => (
                        <TableRow key={String(row.monthKey)} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                              {row.mes}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{row.jobs}</TableCell>
                          <TableCell align="right">{formatCurrency(Number(row.remitoTotal))}</TableCell>
                          <TableCell align="right">{formatCurrency(Number(row.invoiced))}</TableCell>
                          <TableCell align="right">{formatCurrency(Number(row.collected))}</TableCell>
                          <TableCell align="right">{formatCurrency(Number(row.pending))}</TableCell>
                          <TableCell align="right">{formatCurrency(Number(row.unbilled))}</TableCell>
                          <TableCell align="right">{row.sinCobro}</TableCell>
                        </TableRow>
                      ))}
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
