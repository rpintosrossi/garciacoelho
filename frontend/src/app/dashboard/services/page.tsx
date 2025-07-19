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

interface Service {
  id: string;
  name: string;
  description: string;
  status: string;
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

      const response = await api.get(`/services?${queryParams}`);
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