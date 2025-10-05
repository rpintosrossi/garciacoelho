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
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FileViewer from '@/components/FileViewer';
import { formatCurrency } from '@/utils/formatCurrency';
import { cachedApi } from '@/lib/axios';
import { useCommonData } from '@/contexts/CommonDataContext';

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
  console.log('🔍 [FRONTEND] InvoicedServices renderizado');
  const { administrators, buildings } = useCommonData();
  const [services, setServices] = useState<Service[]>([]);
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
  const [remitoPaymentMethod, setRemitoPaymentMethod] = useState('CUENTA_CORRIENTE');
  const [savingRemito, setSavingRemito] = useState(false);
  
  // Estados para el modal de importar factura
  const [openImportInvoice, setOpenImportInvoice] = useState(false);
  const [importInvoiceService, setImportInvoiceService] = useState<Service | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<Date | null>(new Date());
  const [savingInvoice, setSavingInvoice] = useState(false);

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

  const handleOpenRemito = (service: Service) => {
    setRemitoService(service);
    setRemitoAmount('');
    setRemitoDate(new Date());
    setRemitoPaymentMethod('CUENTA_CORRIENTE');
    setOpenRemito(true);
  };

  const handleCloseRemito = () => {
    setOpenRemito(false);
    setRemitoService(null);
    setRemitoAmount('');
    setRemitoDate(new Date());
    setRemitoPaymentMethod('CUENTA_CORRIENTE');
  };

  const handleSaveRemito = async () => {
    if (!remitoService) return;
    setSavingRemito(true);
    try {
      console.log('🔍 [FRONTEND] Creando cobro sin factura para servicio:', remitoService.id);
      console.log('🔍 [FRONTEND] Monto:', remitoAmount);
      console.log('🔍 [FRONTEND] Método de pago:', remitoPaymentMethod);
      
      await axios.post(`/services/${remitoService.id}/informal-invoice`, {
        amount: parseFloat(remitoAmount),
        paymentMethod: remitoPaymentMethod
      });
      
      console.log('🔍 [FRONTEND] Cobro sin factura creado exitosamente');
      setOpenRemito(false);
      
      // Notificar cambio usando localStorage para actualizar otras páginas
      localStorage.setItem('servicesLastUpdate', Date.now().toString());
      localStorage.setItem('servicesUpdateType', 'service_invoiced');
      
      // Recargar los servicios para mostrar los cambios
      await fetchServices();
    } catch (error) {
      console.error('🔍 [FRONTEND] Error al crear cobro sin factura:', error);
      // Podrías mostrar un error aquí
    } finally {
      setSavingRemito(false);
    }
  };

  const handleOpenImportInvoice = (service: Service) => {
    setImportInvoiceService(service);
    setInvoiceFile(null);
    setInvoiceNumber('');
    setInvoiceAmount('');
    setInvoiceDate(new Date());
    setOpenImportInvoice(true);
  };

  const handleCloseImportInvoice = () => {
    setOpenImportInvoice(false);
    setImportInvoiceService(null);
    setInvoiceFile(null);
    setInvoiceNumber('');
    setInvoiceAmount('');
    setInvoiceDate(new Date());
  };

  const handleInvoiceFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar que sea PDF
      if (file.type !== 'application/pdf') {
        alert('Solo se permiten archivos PDF');
        return;
      }
      
      // Validar tamaño (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('El archivo es demasiado grande. Máximo 10MB');
        return;
      }
      
      setInvoiceFile(file);
    }
  };

  const handleSaveInvoice = async () => {
    if (!importInvoiceService || !invoiceFile || !invoiceNumber || !invoiceAmount) {
      alert('Debes completar todos los campos obligatorios');
      return;
    }

    setSavingInvoice(true);
    try {
      const formData = new FormData();
      formData.append('invoice', invoiceFile);
      formData.append('number', invoiceNumber);
      formData.append('amount', invoiceAmount);
      formData.append('date', invoiceDate?.toISOString() || new Date().toISOString());
      formData.append('paymentMethod', 'CUENTA_CORRIENTE');
      
      await axios.post(`/services/${importInvoiceService.id}/import-invoice`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('🔍 [FRONTEND] Factura importada exitosamente');
      
      // Cerrar el modal primero
      handleCloseImportInvoice();
      
      // Notificar cambio usando localStorage para actualizar otras páginas
      localStorage.setItem('servicesLastUpdate', Date.now().toString());
      localStorage.setItem('servicesUpdateType', 'service_invoiced');
      
      // Limpiar caché de axios
      axios.clearCacheFor?.('/services');
      
      // Recargar los servicios para mostrar los cambios inmediatamente
      await fetchServices();
      
      // Disparar evento personalizado para que otras páginas también se actualicen
      window.dispatchEvent(new Event('servicesChanged'));
    } catch (error) {
      console.error('🔍 [FRONTEND] Error al importar factura:', error);
      alert('Error al importar la factura');
    } finally {
      setSavingInvoice(false);
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
                  <Box display="flex" justifyContent="flex-end">
                    <Stack direction="row" spacing={1}>
                      {console.log('🔍 [FRONTEND] Renderizando botón "Cobro sin Factura" para servicio:', service.id)}
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => {
                          console.log('🔍 [FRONTEND] Botón "Cobro sin Factura" clickeado para servicio:', service.id);
                          handleOpenRemito(service);
                        }}
                      >
                        Cobro sin Factura
                      </Button>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => {
                          console.log('🔍 [FRONTEND] Botón "Importar Factura" clickeado para servicio:', service.id);
                          handleOpenImportInvoice(service);
                        }}
                      >
                        Importar Factura
                      </Button>
                      <Button
                        variant="outlined"
                        color="default"
                        disabled
                        sx={{ 
                          color: 'text.disabled',
                          borderColor: 'text.disabled',
                          '&:hover': {
                            borderColor: 'text.disabled',
                            backgroundColor: 'transparent'
                          }
                        }}
                        onClick={() => {
                          // TODO: Implementar funcionalidad de facturación electrónica
                          console.log('🔍 [FRONTEND] Botón "Facturación Electrónica" clickeado para servicio:', service.id);
                        }}
                      >
                        Facturación Electrónica
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
            <DatePicker label="Fecha" value={remitoDate} onChange={setRemitoDate} slotProps={{ textField: { fullWidth: true } }} />
            <FormControl fullWidth>
              <InputLabel>Método de Pago</InputLabel>
              <Select
                value={remitoPaymentMethod}
                onChange={(e) => setRemitoPaymentMethod(e.target.value)}
                label="Método de Pago"
              >
                <MenuItem value="CUENTA_CORRIENTE">Cuenta Corriente</MenuItem>
                <MenuItem value="EFECTIVO">Efectivo</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRemito}>Cancelar</Button>
          <Button onClick={handleSaveRemito} variant="contained" disabled={savingRemito || !remitoAmount}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal para importar factura */}
      <Dialog open={openImportInvoice} onClose={handleCloseImportInvoice} fullWidth maxWidth="sm">
        <DialogTitle>Importar Factura</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField 
              label="Servicio" 
              value={importInvoiceService?.description || ''} 
              fullWidth 
              disabled 
            />
            <TextField 
              label="Número de Factura" 
              value={invoiceNumber} 
              onChange={e => setInvoiceNumber(e.target.value)} 
              fullWidth 
              required
            />
            <TextField 
              label="Monto" 
              type="number" 
              value={invoiceAmount} 
              onChange={e => setInvoiceAmount(e.target.value)} 
              fullWidth 
              required
            />
            <DatePicker 
              label="Fecha de Factura" 
              value={invoiceDate} 
              onChange={setInvoiceDate} 
              slotProps={{ textField: { fullWidth: true } }} 
            />
            <Box>
              <input
                accept=".pdf"
                style={{ display: 'none' }}
                id="invoice-file-input"
                type="file"
                onChange={handleInvoiceFileSelect}
              />
              <label htmlFor="invoice-file-input">
                <Button variant="outlined" component="span" fullWidth>
                  {invoiceFile ? `Archivo seleccionado: ${invoiceFile.name}` : 'Seleccionar PDF de Factura'}
                </Button>
              </label>
            </Box>
            <Alert severity="info">
              La factura se registrará con método de pago "Cuenta Corriente" y quedará pendiente de pago.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImportInvoice}>Cancelar</Button>
          <Button 
            onClick={handleSaveInvoice} 
            variant="contained" 
            disabled={savingInvoice || !invoiceFile || !invoiceNumber || !invoiceAmount}
          >
            {savingInvoice ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 