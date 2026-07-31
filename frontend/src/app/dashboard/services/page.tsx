'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  TextField,
  MenuItem,
  Pagination,
  Grid,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Chip,
  Stack,
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  History as HistoryIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { cachedApi } from '@/lib/axios';
import QuickPastServiceModal from '@/components/QuickPastServiceModal';

interface Service {
  id: string;
  name: string;
  description: string;
  status: string;
  isPaid?: boolean | null;
  cancellationReason?: string;
  building: {
    name: string;
  };
  technician?: {
    name: string;
  };
  visitDate?: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  ASIGNADO: 'Asignado',
  CON_REMITO: 'Con remito',
  FACTURADO_PARCIAL: 'Facturado',
  FACTURADO: 'Facturado',
  SIN_COBRO: 'Sin cobro',
};

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning'> = {
  PENDIENTE: 'warning',
  ASIGNADO: 'info',
  CON_REMITO: 'primary',
  FACTURADO_PARCIAL: 'warning',
  FACTURADO: 'success',
  SIN_COBRO: 'default',
};

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState('');
  const [quickPastModalOpen, setQuickPastModalOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    administratorId: '',
    buildingId: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const router = useRouter();

  const fetchServices = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      });

      const response = await cachedApi.get(`/services?${queryParams}`);
      setServices(response.data.services);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error al cargar servicios:', error);
      setError('Error al cargar los servicios');
    }
  };

  useEffect(() => {
    fetchServices();
  }, [pagination.page, filters]);

  // Escuchar cambios en servicios para actualizar automáticamente
  useEffect(() => {
    const handleServicesChanged = () => {
      console.log('🔄 [SERVICES] Cambio detectado, actualizando lista...');
      // Limpiar caché y recargar
      cachedApi.clearCacheFor('/services');
      fetchServices();
    };

    // Función para verificar cambios en localStorage
    const checkLocalStorageChanges = () => {
      const lastUpdate = localStorage.getItem('servicesLastUpdate');
      const updateType = localStorage.getItem('servicesUpdateType');
      
      if (lastUpdate && (updateType === 'receipt_uploaded' || updateType === 'service_invoiced')) {
        console.log('🔄 [SERVICES] Cambio detectado en localStorage, actualizando...');
        // Limpiar el flag para evitar actualizaciones múltiples
        localStorage.removeItem('servicesLastUpdate');
        localStorage.removeItem('servicesUpdateType');
        // Actualizar la lista
        cachedApi.clearCacheFor('/services');
        fetchServices();
      }
    };

    // Verificar cambios cada 30 segundos (optimizado para reducir consumo de CPU)
    const interval = setInterval(checkLocalStorageChanges, 30000);

    // Suscribirse a cambios en servicios
    cachedApi.onServicesChanged(handleServicesChanged);

    // Escuchar eventos personalizados también
    window.addEventListener('servicesChanged', handleServicesChanged);

    // Limpiar suscripción al desmontar
    return () => {
      clearInterval(interval);
      cachedApi.offServicesChanged(handleServicesChanged);
      window.removeEventListener('servicesChanged', handleServicesChanged);
    };
  }, []);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPagination(prev => ({ ...prev, page: value }));
  };

  const handleFilterChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
  ) => {
    const { name, value } = event.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Resetear a la primera página al filtrar
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este servicio?')) {
      try {
        await api.delete(`/services/${id}`);
        fetchServices();
      } catch (error) {
        console.error('Error al eliminar servicio:', error);
        setError('Error al eliminar el servicio');
      }
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Servicios</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<HistoryIcon />}
            onClick={() => setQuickPastModalOpen(true)}
          >
            Crear Servicio Anterior
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.push('/dashboard/services/new')}
          >
            Nuevo Servicio
          </Button>
        </Box>
      </Box>

      <QuickPastServiceModal
        open={quickPastModalOpen}
        onClose={() => setQuickPastModalOpen(false)}
        onSuccess={() => {
          cachedApi.clearCacheFor('/services');
          fetchServices();
        }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid component="div" item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Estado</InputLabel>
            <Select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              label="Estado"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="PENDIENTE">Pendiente</MenuItem>
              <MenuItem value="ASIGNADO">Asignado</MenuItem>
              <MenuItem value="CON_REMITO">Con Remito</MenuItem>
              <MenuItem value="FACTURADO">Facturado</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid component="div" item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            name="administratorId"
            label="ID Administrador"
            value={filters.administratorId}
            onChange={handleFilterChange}
          />
        </Grid>
        <Grid component="div" item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            name="buildingId"
            label="ID Edificio"
            value={filters.buildingId}
            onChange={handleFilterChange}
          />
        </Grid>
        <Grid component="div" item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Ordenar por</InputLabel>
            <Select
              name="sortBy"
              value={filters.sortBy}
              onChange={handleFilterChange}
              label="Ordenar por"
            >
              <MenuItem value="createdAt">Fecha de creación</MenuItem>
              <MenuItem value="status">Estado</MenuItem>
              <MenuItem value="name">Nombre</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Edificio</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Técnico</TableCell>
              <TableCell>Fecha de Visita</TableCell>
              <TableCell>Motivo Anulación</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell>{service.building.name}</TableCell>
                <TableCell>{service.description}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip
                      label={STATUS_LABELS[service.status] || service.status}
                      color={STATUS_COLORS[service.status] || 'default'}
                      size="small"
                    />
                    {typeof service.isPaid === 'boolean' && (
                      <Chip
                        label={service.isPaid ? 'Pagado' : 'No pagado'}
                        color={service.isPaid ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Stack>
                </TableCell>
                <TableCell>{service.technician?.name || '-'}</TableCell>
                <TableCell>
                  {service.visitDate
                    ? new Date(service.visitDate).toLocaleDateString()
                    : '-'}
                </TableCell>
                <TableCell>
                  {service.cancellationReason ? (
                    <Typography variant="body2" color="error" sx={{ fontSize: '0.875rem' }}>
                      {service.cancellationReason}
                    </Typography>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => router.push(`/dashboard/services/${service.id}`)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(service.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination
          count={pagination.totalPages}
          page={pagination.page}
          onChange={handlePageChange}
          color="primary"
        />
      </Box>
    </Box>
  );
} 