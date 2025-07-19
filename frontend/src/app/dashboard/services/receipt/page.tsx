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
  Stack
} from '@mui/material';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
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
  };
  technician: {
    name: string;
  };
  receipt: {
    imageUrl: string;
  };
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ServicesWithReceipt() {
  const [services, setServices] = useState<Service[]>([]);
  const [administrators, setAdministrators] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<any | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const { refreshCounts } = useServiceCounts();

  const fetchServices = async () => {
    try {
      const queryParams = new URLSearchParams({
        status: 'ASIGNADO',
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (selectedAdmin) {
        queryParams.append('administratorId', selectedAdmin.id);
      }
      if (selectedBuilding) {
        queryParams.append('buildingId', selectedBuilding.id);
      }

      const [servicesRes, adminsRes, buildingsRes] = await Promise.all([
        axios.get(`/services?${queryParams}`),
        axios.get('/administrators'),
        axios.get('/buildings'),
      ]);

      setServices(servicesRes.data.services);
      setPagination(servicesRes.data.pagination);
      setAdministrators(adminsRes.data);
      setBuildings(buildingsRes.data);
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, serviceId: string) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setError('Debes seleccionar al menos un archivo');
      return;
    }
    setUploadingId(serviceId);
    setError('');
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('receipts', file);
      });
      await axios.post(`/services/${serviceId}/receipt`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      fetchServices(); // Recargar los servicios después de subir el remito
      await refreshCounts();
    } catch (err) {
      setError('Error al subir el remito');
    } finally {
      setUploadingId(null);
    }
  };

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
        Subir Remito
      </Typography>
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
          getOptionLabel={(option) => option.name}
          value={selectedBuilding}
          onChange={handleBuildingChange}
          renderInput={(params) => <TextField {...params} label="Edificio" />}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          noOptionsText="No se encontraron edificios"
          sx={{ minWidth: 220 }}
        />
        <Button onClick={handleClearFilters} variant="outlined">Limpiar filtros</Button>
      </Stack>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Edificio</TableCell>
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
                <TableCell>{buildings.find((b: any) => b.id === service.buildingId)?.administrator?.name || '-'}</TableCell>
                <TableCell>{service.description}</TableCell>
                <TableCell>{service.technician?.name}</TableCell>
                <TableCell>{new Date(service.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    style={{ display: 'none' }}
                    id={`upload-remito-${service.id}`}
                    multiple
                    onChange={(e) => handleFileChange(e, service.id)}
                  />
                  <label htmlFor={`upload-remito-${service.id}`}>
                    <Button
                      variant="contained"
                      color="primary"
                      component="span"
                      disabled={uploadingId === service.id}
                    >
                      Subir Remito
                    </Button>
                  </label>
                  {uploadingId === service.id && (
                    <CircularProgress size={20} sx={{ ml: 2 }} />
                  )}
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
    </Box>
  );
} 