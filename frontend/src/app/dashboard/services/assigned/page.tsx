'use client';

import React, { useState, useEffect } from 'react';
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
  Button,
  CircularProgress,
  Alert,
  Autocomplete,
  TextField,
  Pagination,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import { cachedApi } from '@/lib/axios';
import { useCommonData } from '@/contexts/CommonDataContext';
import { useServiceCounts } from '@/hooks/useServiceCounts';

interface Service {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  buildingId: string;
  building: {
    name: string;
    address?: string;
  };
  technician: {
    name: string;
  };
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AssignedServices() {
  const { administrators, buildings } = useCommonData();
  const { refreshCounts } = useServiceCounts();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<any | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const router = useRouter();

  const fetchServices = async () => {
    try {
      const queryParams = new URLSearchParams({
        status: 'PENDIENTE',
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (selectedAdmin) {
        queryParams.append('administratorId', selectedAdmin.id);
      }
      if (selectedBuilding) {
        queryParams.append('buildingId', selectedBuilding.id);
      }

      const servicesRes = await cachedApi.get(`/services?${queryParams}`);

      setServices(servicesRes.data.services);
      setPagination(servicesRes.data.pagination);
      setError(null);
    } catch (err) {
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [pagination.page, selectedAdmin, selectedBuilding]);

  const handleAdminChange = (_: any, newValue: any) => {
    setSelectedAdmin(newValue);
    setSelectedBuilding(null);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleBuildingChange = (_: any, newValue: any) => {
    setSelectedBuilding(newValue);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setSelectedAdmin(null);
    setSelectedBuilding(null);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (_: any, value: number) => {
    setPagination(prev => ({ ...prev, page: value }));
  };

  const handleDeleteClick = (service: Service) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!serviceToDelete) return;

    setDeleting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await axios.delete(`/services/${serviceToDelete.id}`);
      setSuccessMessage('Servicio eliminado correctamente');
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
      await refreshCounts();
      fetchServices();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar el servicio');
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setServiceToDelete(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Asignación de Servicios
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3} alignItems="center">
        <Autocomplete
          options={administrators}
          getOptionLabel={(option) => option.name}
          value={selectedAdmin}
          onChange={handleAdminChange}
          renderInput={(params) => <TextField {...params} label="Administrador" />}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          noOptionsText="No se encontraron administradores"
          sx={{ minWidth: 220 }}
        />
        <Autocomplete
          options={selectedAdmin ? buildings.filter((b: any) => b.administratorId === selectedAdmin.id) : buildings}
          getOptionLabel={(option) => `${option.name} ${option.address ? `(${option.address})` : ''}`}
          value={selectedBuilding}
          onChange={handleBuildingChange}
          renderInput={(params) => <TextField {...params} label="Edificio" />}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          noOptionsText="No se encontraron edificios"
          sx={{ minWidth: 220, flexGrow: 1 }}
        />
        <Button onClick={handleClearFilters} variant="outlined">Limpiar filtros</Button>
      </Stack>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Edificio</TableCell>
              <TableCell>Dirección</TableCell>
              <TableCell>Administrador</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Técnico</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell>{service.building?.name}</TableCell>
                <TableCell>{service.building?.address || '-'}</TableCell>
                <TableCell>{buildings.find((b: any) => b.id === service.buildingId)?.administrator?.name || '-'}</TableCell>
                <TableCell>{service.description}</TableCell>
                <TableCell>{service.technician?.name}</TableCell>
                <TableCell>{new Date(service.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => router.push(`/dashboard/services/${service.id}/assign`)}
                      size="small"
                    >
                      Asignar Técnico
                    </Button>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClick(service)}
                      disabled={deleting}
                      size="small"
                      title="Eliminar servicio"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {pagination.totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={pagination.totalPages}
            page={pagination.page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}

      {/* Diálogo de confirmación para eliminar servicio */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro que deseas eliminar este servicio?
            <br /><br />
            <strong>Edificio:</strong> {serviceToDelete?.building?.name}
            <br />
            <strong>Descripción:</strong> {serviceToDelete?.description}
            <br /><br />
            Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 