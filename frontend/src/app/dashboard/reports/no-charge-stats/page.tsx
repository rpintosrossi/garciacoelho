'use client';

import { useState, useEffect } from 'react';
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
  Chip,
  IconButton,
  Collapse,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  KeyboardArrowDown,
  KeyboardArrowUp,
  HelpOutline as HelpIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from 'recharts';
import { cachedApi } from '@/lib/axios';
import { formatDate } from '@/utils/formatDate';

interface ServiceEntry {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  visitDate: string | null;
  noChargeComment: string | null;
  buildingId: string;
  buildingName: string;
  buildingAddress: string;
  technicianName: string | null;
}

interface ReasonStat {
  reasonId: string | null;
  reasonName: string;
  count: number;
  hasMore: boolean;
  percentage: number;
  services: ServiceEntry[];
}

interface StatsData {
  total: number;
  withReason: number;
  withoutReason: number;
  byReason: ReasonStat[];
  monthlySeries: { mes: string; cantidad: number }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function NoChargeStatsReport() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StatsData | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await cachedApi.get(`/reports/no-charge-stats?${params}`);
      setData(res.data);
    } catch {
      setError('Error al cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <CheckCircleIcon sx={{ color: 'success.main', fontSize: 28 }} />
        <Typography variant="h5" fontWeight={600}>
          Estadísticas por Motivo — Sin Cobro Económico
        </Typography>
      </Box>

      {/* Filtros de fecha */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          label="Desde"
          type="date"
          size="small"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
        <TextField
          label="Hasta"
          type="date"
          size="small"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
        {(startDate || endDate) && (
          <Chip
            label="Limpiar filtros"
            size="small"
            onDelete={() => { setStartDate(''); setEndDate(''); }}
          />
        )}
      </Paper>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && data && (
        <>
          {/* Tarjetas resumen */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
            <Card sx={{ border: '1px solid', borderColor: 'success.light', bgcolor: 'success.50' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Total Sin Cobro</Typography>
                <Typography variant="h3" fontWeight={700} color="success.main">{data.total}</Typography>
                <Typography variant="caption" color="text.secondary">servicios</Typography>
              </CardContent>
            </Card>
            <Card sx={{ border: '1px solid', borderColor: 'primary.light' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Con Motivo</Typography>
                <Typography variant="h3" fontWeight={700} color="primary.main">{data.withReason}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {data.total > 0 ? `${((data.withReason / data.total) * 100).toFixed(0)}%` : '—'}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ border: '1px solid', borderColor: 'warning.light' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Sin Especificar</Typography>
                <Typography variant="h3" fontWeight={700} color="warning.main">{data.withoutReason}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {data.total > 0 ? `${((data.withoutReason / data.total) * 100).toFixed(0)}%` : '—'}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ border: '1px solid', borderColor: 'secondary.light' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Motivos distintos</Typography>
                <Typography variant="h3" fontWeight={700} color="secondary.main">
                  {data.byReason.filter(r => r.reasonId !== null).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">utilizados</Typography>
              </CardContent>
            </Card>
          </Box>

          {data.total === 0 ? (
            <Alert severity="info">No hay servicios sin cobro económico en el período seleccionado.</Alert>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
              {/* Gráfico de barras por motivo */}
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Servicios por motivo</Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={data.byReason}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="reasonName" width={140} tick={{ fontSize: 12 }} />
                    <RechartsTooltip formatter={(v: number) => [`${v} servicios`]} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {data.byReason.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>

              {/* Evolución mensual */}
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Evolución mensual (últimos 12 meses)</Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.monthlySeries} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <RechartsTooltip formatter={(v: number) => [`${v} servicios`]} />
                    <Line type="monotone" dataKey="cantidad" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Box>
          )}

          {/* Tabla detalle por motivo */}
          {data.total > 0 && (
            <Paper>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6">Detalle por motivo</Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell width={48} />
                      <TableCell>Motivo</TableCell>
                      <TableCell align="center">Cantidad</TableCell>
                      <TableCell>Proporción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.byReason.map((reason, i) => {
                      const key = reason.reasonId ?? '__none__';
                      const isOpen = expanded.has(key);
                      const color = COLORS[i % COLORS.length];
                      return (
                        <>
                          <TableRow
                            key={key}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => toggleExpand(key)}
                          >
                            <TableCell>
                              <IconButton size="small">
                                {isOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                              </IconButton>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                                <Typography variant="body2" fontWeight={500}>
                                  {reason.reasonName}
                                </Typography>
                                {reason.reasonId === null && (
                                  <Tooltip title="Servicios marcados sin cobro sin asignar un motivo">
                                    <HelpIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={reason.count} size="small" sx={{ bgcolor: color, color: '#fff', fontWeight: 700 }} />
                            </TableCell>
                            <TableCell sx={{ minWidth: 220 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={reason.percentage}
                                  sx={{ flexGrow: 1, height: 8, borderRadius: 4, bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { bgcolor: color } }}
                                />
                                <Typography variant="caption" sx={{ minWidth: 36 }}>{reason.percentage}%</Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                          <TableRow key={`${key}-expand`}>
                            <TableCell colSpan={4} sx={{ p: 0, borderBottom: isOpen ? undefined : 0 }}>
                              <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                <Box sx={{ bgcolor: 'grey.50', px: 4, py: 2 }}>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell>Servicio</TableCell>
                                        <TableCell>Edificio</TableCell>
                                        <TableCell>Técnico</TableCell>
                                        <TableCell>Fecha</TableCell>
                                        <TableCell>Comentario</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {reason.services.map(svc => (
                                        <TableRow key={svc.id} hover>
                                          <TableCell>
                                            <Typography variant="body2" fontWeight={500}>{svc.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{svc.description}</Typography>
                                          </TableCell>
                                          <TableCell>
                                            <Typography variant="body2">{svc.buildingName}</Typography>
                                            <Typography variant="caption" color="text.secondary">{svc.buildingAddress}</Typography>
                                          </TableCell>
                                          <TableCell>
                                            <Typography variant="body2">{svc.technicianName || '—'}</Typography>
                                          </TableCell>
                                          <TableCell>
                                            <Typography variant="body2">{formatDate(svc.createdAt)}</Typography>
                                          </TableCell>
                                          <TableCell sx={{ maxWidth: 250 }}>
                                            {svc.noChargeComment ? (
                                              <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap' }}>
                                                {svc.noChargeComment}
                                              </Typography>
                                            ) : (
                                              <Typography variant="caption" color="text.disabled">—</Typography>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                  {reason.hasMore && (
                                    <Box sx={{ px: 2, py: 1 }}>
                                      <Typography variant="caption" color="text.secondary">
                                        Mostrando los 50 más recientes de {reason.count} total. Usar filtros de fecha para acotar los resultados.
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
