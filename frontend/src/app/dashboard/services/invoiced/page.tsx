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
  Badge,
  Autocomplete,
  TextField,
  Pagination,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { formatCurrency } from '@/utils/formatCurrency';

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
  invoice: {
    number: string;
    amount: number;
    date: string;
  };
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function InvoicedServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [administrators, setAdministrators] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<any | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const router = useRouter();
  const [openRemito, setOpenRemito] = useState(false);
  const [remitoService, setRemitoService] = useState<Service | null>(null);
  const [remitoAmount, setRemitoAmount] = useState('');
  const [remitoDate, setRemitoDate] = useState<Date | null>(new Date());
  const [savingRemito, setSavingRemito] = useState(false);

  const fetchServices = async () => {
    try {
      const queryParams = new URLSearchParams({
        status: 'CON_REMITO',
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

  const handleOpenRemito = (service: Service) => {
    setRemitoService(service);
    setRemitoAmount('');
    setRemitoDate(new Date());
    setOpenRemito(true);
  };

  const handleCloseRemito = () => {
    setOpenRemito(false);
    setRemitoService(null);
    setRemitoAmount('');
    setRemitoDate(new Date());
  };

  const handleSaveRemito = async () => {
    if (!remitoService) return;
    setSavingRemito(true);
    try {
      await axios.post('/remitos', {
        serviceId: remitoService.id,
        amount: parseFloat(remitoAmount),
        date: remitoDate
      });
      setOpenRemito(false);
      const [servicesRes, buildingsRes] = await Promise.all([
        axios.get(`/services?${new URLSearchParams({
          status: 'CON_REMITO',
          page: pagination.page.toString(),
          limit: pagination.limit.toString()
        })}`),
        axios.get('/buildings')
      ]);
      setServices(servicesRes.data.services);
      setPagination(servicesRes.data.pagination);
      setBuildings(buildingsRes.data);
    } catch {
      // Podrías mostrar un error aquí
    } finally {
      setSavingRemito(false);
    }
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
      <Box display="flex" alignItems="center" mb={2}>
        <Badge
          badgeContent={pagination.total}
          color="primary"
          sx={{ mr: 2 }}
        >
          <AttachMoneyIcon color="primary" />
        </Badge>
        <Typography variant="h4" gutterBottom>
          Servicios con remito pendientes de facturación
        </Typography>
      </Box>
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
              <TableCell>Número de Factura</TableCell>
              <TableCell>Monto</TableCell>
              <TableCell>Fecha de Factura</TableCell>
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
                <TableCell>{service.invoice ? service.invoice.number : '-'}</TableCell>
                <TableCell>{service.invoice ? formatCurrency(service.invoice.amount) : '-'}</TableCell>
                <TableCell>{service.invoice ? `$${service.invoice.amount.toFixed(2)}` : '-'}</TableCell>
                <TableCell>{service.invoice ? new Date(service.invoice.date).toLocaleDateString() : '-'}</TableCell>
                <TableCell>
                  <Box display="flex" justifyContent="flex-end">
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => handleOpenRemito(service)}
                      >
                        Cobro sin Factura
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => router.push(`/dashboard/services/${service.id}/details`)}
                      >
                        Ver Detalles
                      </Button>
                    </Stack>
                  </Box>
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
      <Dialog open={openRemito} onClose={handleCloseRemito} fullWidth maxWidth="sm">
        <DialogTitle>Cobro sin Factura</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label="Servicio" value={remitoService?.description || ''} fullWidth disabled />
            <TextField label="Monto" type="number" value={remitoAmount} onChange={e => setRemitoAmount(e.target.value)} fullWidth />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker label="Fecha" value={remitoDate} onChange={setRemitoDate} slotProps={{ textField: { fullWidth: true } }} />
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRemito}>Cancelar</Button>
          <Button onClick={handleSaveRemito} variant="contained" disabled={savingRemito || !remitoAmount}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 