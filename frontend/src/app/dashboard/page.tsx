"use client";
import { Paper } from "@mui/material";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  useTheme,
  alpha,
  CircularProgress,
  Alert,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Tooltip,
  Button
} from "@mui/material";
import {
  Business as BuildingIcon,
  People as PeopleIcon,
  Assignment as ServiceIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Visibility as VisibilityIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { cachedApi } from '@/lib/axios';
import StockAlerts from '@/components/StockAlerts';

const QuickAccessCard = ({ title, value, icon: Icon, color, onClick }: any) => {
  const content = (
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Icon sx={{ color: color, fontSize: 32, mr: 1 }} />
        <Typography variant="h6" color="text.secondary">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: color }}>
        {value}
      </Typography>
    </CardContent>
  );

  return (
    <Card sx={{
      height: '100%',
      background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
      border: `1px solid ${alpha(color, 0.2)}`,
      cursor: onClick ? 'pointer' : 'default',
      '&:hover': onClick ? {
        transform: 'translateY(-4px)',
        transition: 'transform 0.2s ease-in-out',
        boxShadow: `0 4px 20px ${alpha(color, 0.15)}`
      } : undefined
    }} onClick={onClick}>
      {onClick ? (
        <CardActionArea sx={{ height: '100%' }}>
          {content}
        </CardActionArea>
      ) : (
        <Box sx={{ height: '100%' }}>
          {content}
        </Box>
      )}
    </Card>
  );
};

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [trabajosPorMes, setTrabajosPorMes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overdueDebts, setOverdueDebts] = useState<any>(null);
  const theme = useTheme();
  const router = useRouter();

  // Función para convertir "2025-11" a "Noviembre 2025"
  const formatMonthYear = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthIndex = parseInt(month) - 1;
    return `${monthNames[monthIndex]} ${year}`;
  };

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const [quickStatsRes, serviceStatsRes, overdueDebtsRes] = await Promise.all([
          cachedApi.get('/dashboard/quick-stats'),
          cachedApi.get('/services/stats'),
          cachedApi.get('/dashboard/overdue-debts')
        ]);
        setStats(quickStatsRes.data);
        // Formatear datos para el gráfico
        const trabajosMes = serviceStatsRes.data.trabajosPorMes || {};
        const chartData = Object.keys(trabajosMes).map(mes => ({
          mes: formatMonthYear(mes),
          cantidad: trabajosMes[mes]
        }));
        setTrabajosPorMes(chartData);
        setOverdueDebts(overdueDebtsRes.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al cargar estadísticas');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleRefreshData = () => {
    cachedApi.clearCache();
    window.location.reload();
  };

  if (loading) {
    return <Box p={3}><CircularProgress /></Box>;
  }
  if (error) {
    return <Box p={3}><Alert severity="error">{error}</Alert></Box>;
  }  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Dashboard
        </Typography>
        <Button 
          variant="outlined" 
          size="small"
          onClick={handleRefreshData}
          sx={{ textTransform: 'none' }}
        >
          🔄 Actualizar Datos
        </Button>
      </Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <QuickAccessCard
            title="Edificios"
            value={stats?.totalBuildings || 0}
            icon={BuildingIcon}
            color={theme.palette.primary.main}
            onClick={() => router.push('/dashboard/buildings')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <QuickAccessCard
            title="Administradores"
            value={stats?.totalAdmins || 0}
            icon={PeopleIcon}
            color={theme.palette.secondary.main}
            onClick={() => router.push('/dashboard/administrators')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <QuickAccessCard
            title="Servicios"
            value={stats?.totalServices || 0}
            icon={ServiceIcon}
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <QuickAccessCard
            title="Facturado este mes"
            value={stats?.totalFacturadoMes ? `$${stats.totalFacturadoMes.toLocaleString()}` : "$0"}
            icon={TrendingUpIcon}
            color={theme.palette.warning.main}
            onClick={() => router.push('/dashboard/services/invoiced')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <QuickAccessCard
            title="Pagos este mes"
            value={stats?.totalPagosMes ? `$${stats.totalPagosMes.toLocaleString()}` : "$0"}
            icon={PaymentIcon}
            color="#10b981"
            onClick={() => router.push('/dashboard/payments')}
          />
        </Grid>
      </Grid>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Servicios creados por mes
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={trabajosPorMes} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis allowDecimals={false} />
            <RechartsTooltip />
            <Bar dataKey="cantidad" fill={theme.palette.primary.main} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Sección de deudas vencidas */}
      {overdueDebts && overdueDebts.buildingsOverThreshold > 0 && (
        <Paper sx={{ p: 3, mb: 3 }} id="overdue-debts-section">
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <WarningIcon sx={{ color: 'error.main', mr: 1, fontSize: 28 }} />
            <Typography variant="h6" color="error.main" sx={{ fontWeight: 'bold' }}>
              Edificios con Deudas Vencidas ({overdueDebts.buildingsOverThreshold})
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Edificios que superan el umbral de tolerancia de días de deuda vencida.
          </Typography>
          
          <Box sx={{ overflowX: 'auto' }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Empresa</strong></TableCell>
                    <TableCell><strong>CUIT</strong></TableCell>
                    <TableCell><strong>Localidad</strong></TableCell>
                    <TableCell><strong>Administrador</strong></TableCell>
                    <TableCell><strong>Deuda Actual</strong></TableCell>
                    <TableCell><strong>Días Vencidos</strong></TableCell>
                    <TableCell><strong>Umbral</strong></TableCell>
                    <TableCell><strong>Acciones</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {overdueDebts.buildings
                    .filter(building => building.isOverThreshold)
                    .map((building) => (
                    <TableRow key={building.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {building.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {building.address}
                        </Typography>
                      </TableCell>
                      <TableCell>{building.cuit}</TableCell>
                      <TableCell>{building.locality || 'N/A'}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {building.administrator?.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {building.administrator?.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                          {new Intl.NumberFormat('es-AR', {
                            style: 'currency',
                            currency: 'ARS'
                          }).format(building.currentDebt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${building.daysOverdue} días`}
                          color={building.daysOverdue > building.debtThreshold ? 'error' : 'warning'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {building.debtThreshold} días
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Ver estado de cuenta del edificio">
                          <IconButton
                            size="small"
                            onClick={() => router.push(`/dashboard/buildings?accountId=${building.id}`)}
                            color="primary"
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {/* Alertas de Stock */}
      <StockAlerts maxItems={5} showViewAll={true} />
    </Box>
  );
} 