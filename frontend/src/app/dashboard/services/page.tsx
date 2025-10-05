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
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { cachedApi } from '@/lib/axios';

interface Service {
  id: string;
  name: string;
  description: string;
  status: string;
  cancellationReason?: string;
  building: {
    name: string;
  };
  technician?: {
    name: string;
  };
  visitDate?: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState('');
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

    // Verificar cambios cada 10 segundos (reducido de 2s para mejorar rendimiento)
    const interval = setInterval(checkLocalStorageChanges, 10000);

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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Servicios</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => router.push('/dashboard/services/new')}
        >
          Nuevo Servicio
        </Button>
      </Box>

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
                <TableCell>{service.status}</TableCell>
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