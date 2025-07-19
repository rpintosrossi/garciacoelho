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
  Alert
} from "@mui/material";
import {
  Business as BuildingIcon,
  People as PeopleIcon,
  Assignment as ServiceIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';

const QuickAccessCard = ({ title, value, icon: Icon, color, onClick }: any) => (
  <Card sx={{
    height: '100%',
    background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
    border: `1px solid ${alpha(color, 0.2)}`,
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-4px)',
      transition: 'transform 0.2s ease-in-out',
      boxShadow: `0 4px 20px ${alpha(color, 0.15)}`
    }
  }} onClick={onClick}>
    <CardActionArea sx={{ height: '100%' }}>
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
    </CardActionArea>
  </Card>
);

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [trabajosPorMes, setTrabajosPorMes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const router = useRouter();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const [quickStatsRes, serviceStatsRes] = await Promise.all([
          api.get('/dashboard/quick-stats'),
          api.get('/services/stats')
        ]);
        setStats(quickStatsRes.data);
        // Formatear datos para el gráfico
        const trabajosMes = serviceStatsRes.data.trabajosPorMes || {};
        const chartData = Object.keys(trabajosMes).map(mes => ({
          mes,
          cantidad: trabajosMes[mes]
        }));
        setTrabajosPorMes(chartData);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al cargar estadísticas');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <Box p={3}><CircularProgress /></Box>;
  }
  if (error) {
    return <Box p={3}><Alert severity="error">{error}</Alert></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <QuickAccessCard
            title="Empresas"
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
            onClick={() => router.push('/dashboard/services')}
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
            <Tooltip />
            <Bar dataKey="cantidad" fill={theme.palette.primary.main} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
} 