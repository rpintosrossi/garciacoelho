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
  MenuItem,
  Checkbox,
  Chip,
  IconButton
} from '@mui/material';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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
  visitDate?: string;
  buildingId: string;
  building: {
    name: string;
    address: string;
  };
  technician: {
    name: string;
  };
  invoice?: {
    number: string;
    amount: number;
    date: string;
  };
  receiptImages?: string[];
  remitos?: any[];
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

  // Delete service state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  const [deletingService, setDeletingService] = useState(false);

  // No-charge service state
  const [noChargeDialogOpen, setNoChargeDialogOpen] = useState(false);
  const [serviceToNoCharge, setServiceToNoCharge] = useState<string | null>(null);
  const [markingNoCharge, setMarkingNoCharge] = useState(false);

  const handleDeleteClick = (serviceId: string) => {
    setServiceToDelete(serviceId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setServiceToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;
    setDeletingService(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/services/${serviceToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      handleDeleteClose();
      cachedApi.clearCacheFor('/services');
      await fetchServices();
    } catch (err: any) {
      console.error('Error eliminando servicio:', err);
      alert(err?.response?.data?.message || 'Error al eliminar el servicio');
    } finally {
      setDeletingService(false);
    }
  };

  const handleNoChargeClick = (serviceId: string) => {
    setServiceToNoCharge(serviceId);
    setNoChargeDialogOpen(true);
  };

  const handleNoChargeClose = () => {
    setNoChargeDialogOpen(false);
    setServiceToNoCharge(null);
  };

  const handleConfirmNoCharge = async () => {
    if (!serviceToNoCharge) return;
    setMarkingNoCharge(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/services/${serviceToNoCharge}/no-charge`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      handleNoChargeClose();
      cachedApi.clearCacheFor('/services');
      await fetchServices();
    } catch (err: any) {
      console.error('Error marcando servicio sin cobro:', err);
      alert(err?.response?.data?.message || 'Error al marcar el servicio como sin cobro');
    } finally {
      setMarkingNoCharge(false);
    }
  };
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

  // Estados para subir remito (corrección/adición)
  const [openUploadRemito, setOpenUploadRemito] = useState(false);
  const [uploadRemitoService, setUploadRemitoService] = useState<Service | null>(null);
  const [uploadRemitoNumber, setUploadRemitoNumber] = useState('');
  const [uploadRemitoDescription, setUploadRemitoDescription] = useState('');
  const [uploadRemitoFiles, setUploadRemitoFiles] = useState<File[]>([]);
  const [isUploadingRemito, setIsUploadingRemito] = useState(false);

  // Estados para selección múltiple
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [openBulkRemito, setOpenBulkRemito] = useState(false);
  const [openBulkImportInvoice, setOpenBulkImportInvoice] = useState(false);

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
    // Limpiar caché al entrar a la página para siempre obtener datos frescos
    cachedApi.clearCacheFor('/services');
  }, []);

  useEffect(() => {
    fetchServices();
  }, [pagination.page, selectedAdmin, selectedBuilding]);

  // Escuchar eventos de actualización de servicios (ej: cuando se sube un remito desde otra vista)
  useEffect(() => {
    const handleServicesChanged = () => {
      cachedApi.clearCacheFor('/services');
      fetchServices();
    };

    window.addEventListener('servicesChanged', handleServicesChanged);
    return () => {
      window.removeEventListener('servicesChanged', handleServicesChanged);
    };
  }, []);

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

  // Handlers para selección múltiple
  const handleSelectService = (serviceId: string) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedServices.length === services.length) {
      setSelectedServices([]);
    } else {
      setSelectedServices(services.map(s => s.id));
    }
  };

  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    setSelectedServices([]);
  };

  const validateSameBuilding = (): boolean => {
    if (selectedServices.length === 0) return false;
    const selectedServicesData = services.filter(s => selectedServices.includes(s.id));
    const buildingIds = [...new Set(selectedServicesData.map(s => s.buildingId))];
    return buildingIds.length === 1;
  };

  const getSelectedBuildingName = (): string => {
    if (selectedServices.length === 0) return '';
    const selectedService = services.find(s => selectedServices.includes(s.id));
    return selectedService?.building?.name || '';
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
      
      // Limpiar caché para que se actualice la lista
      cachedApi.clearCacheFor('/services');
      
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

  const handleOpenBulkRemito = () => {
    if (selectedServices.length === 0) {
      alert('Debes seleccionar al menos un servicio');
      return;
    }
    if (!validateSameBuilding()) {
      alert('Todos los servicios deben pertenecer al mismo edificio');
      return;
    }
    setRemitoAmount('');
    setRemitoDate(new Date());
    setRemitoPaymentMethod('CUENTA_CORRIENTE');
    setOpenBulkRemito(true);
  };

  const handleCloseBulkRemito = () => {
    setOpenBulkRemito(false);
  };

  const handleOpenUploadRemito = (service: Service) => {
    setUploadRemitoService(service);
    setUploadRemitoNumber('');
    setUploadRemitoDescription(service.description || '');
    setUploadRemitoFiles([]);
    setOpenUploadRemito(true);
  };

  const handleCloseUploadRemito = () => {
    setOpenUploadRemito(false);
    setUploadRemitoService(null);
    setUploadRemitoDescription('');
    setUploadRemitoFiles([]);
    setError(null);
  };

  const handleUploadFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setUploadRemitoFiles(Array.from(event.target.files));
    }
  };

  const handleUploadRemitoSubmit = async () => {
    if (!uploadRemitoService || uploadRemitoFiles.length === 0) return;
    
    setIsUploadingRemito(true);
    setError(null);
    
    const formData = new FormData();
    uploadRemitoFiles.forEach(file => {
      formData.append('receipts', file);
    });
    
    if (uploadRemitoNumber.trim()) {
      formData.append('remitoNumber', uploadRemitoNumber.trim());
    }

    if (uploadRemitoDescription !== undefined) {
      formData.append('description', uploadRemitoDescription);
    }
    
    try {
      await axios.post(`/services/${uploadRemitoService.id}/receipt`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Limpiar caché para asegurar que se vean los cambios
      cachedApi.clearCacheFor('/services');
      
      handleCloseUploadRemito();
      fetchServices();
      // Opcional: mostrar notificación de éxito
    } catch (err: any) {
      console.error('Error uploading remito:', err);
      setError(err.response?.data?.message || 'Error al subir el remito');
    } finally {
      setIsUploadingRemito(false);
    }
  };

  const handleSaveBulkRemito = async () => {
    if (!remitoAmount) {
      alert('El monto es obligatorio');
      return;
    }
    setSavingRemito(true);
    try {
      await axios.post('/services/bulk/informal-invoice', {
        serviceIds: selectedServices,
        amount: parseFloat(remitoAmount),
        paymentMethod: remitoPaymentMethod
      });
      
      setOpenBulkRemito(false);
      setSelectedServices([]);
      setBulkMode(false);
      
      localStorage.setItem('servicesLastUpdate', Date.now().toString());
      localStorage.setItem('servicesUpdateType', 'service_invoiced');
      
      // Limpiar caché para que se actualice la lista
      cachedApi.clearCacheFor('/services');
      
      await fetchServices();
    } catch (error) {
      console.error('Error al crear cobro sin factura múltiple:', error);
      alert('Error al crear el cobro sin factura');
    } finally {
      setSavingRemito(false);
    }
  };

  const handleOpenBulkImportInvoice = () => {
    if (selectedServices.length === 0) {
      alert('Debes seleccionar al menos un servicio');
      return;
    }
    if (!validateSameBuilding()) {
      alert('Todos los servicios deben pertenecer al mismo edificio');
      return;
    }
    setInvoiceFile(null);
    setInvoiceNumber('');
    setInvoiceAmount('');
    setInvoiceDate(new Date());
    setOpenBulkImportInvoice(true);
  };

  const handleCloseBulkImportInvoice = () => {
    setOpenBulkImportInvoice(false);
  };

  const handleSaveBulkImportInvoice = async () => {
    if (!invoiceFile || !invoiceNumber || !invoiceAmount) {
      alert('Debes completar todos los campos obligatorios');
      return;
    }
    setSavingInvoice(true);
    try {
      const formData = new FormData();
      formData.append('invoice', invoiceFile);
      formData.append('serviceIds', JSON.stringify(selectedServices));
      formData.append('number', invoiceNumber);
      formData.append('amount', invoiceAmount);
      formData.append('date', invoiceDate?.toISOString() || new Date().toISOString());
      formData.append('paymentMethod', 'CUENTA_CORRIENTE');
      
      await axios.post('/services/bulk/import-invoice', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      handleCloseBulkImportInvoice();
      setSelectedServices([]);
      setBulkMode(false);
      
      localStorage.setItem('servicesLastUpdate', Date.now().toString());
      localStorage.setItem('servicesUpdateType', 'service_invoiced');
      
      cachedApi.clearCacheFor('/services');
      
      await fetchServices();
      
      window.dispatchEvent(new Event('servicesChanged'));
    } catch (error) {
      console.error('Error al importar factura múltiple:', error);
      alert('Error al importar la factura');
    } finally {
      setSavingInvoice(false);
    }
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
      cachedApi.clearCacheFor('/services');
      
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
        <Autocomplete
          options={selectedAdmin ? buildings.filter((b: any) => b.administratorId === selectedAdmin.id) : buildings}
          getOptionLabel={(option) => option.address || ''}
          value={selectedBuilding}
          onChange={handleBuildingChange}
          renderInput={(params) => <TextField {...params} label="Dirección" />}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          noOptionsText="No se encontraron direcciones"
          sx={{ minWidth: 220 }}
        />
        <Button onClick={handleClearFilters} variant="outlined">Limpiar filtros</Button>
      </Stack>
      
      {/* Botones de selección múltiple */}
      <Box mb={2} display="flex" gap={2} alignItems="center">
        <Button 
          variant={bulkMode ? "contained" : "outlined"} 
          color="primary"
          onClick={toggleBulkMode}
        >
          {bulkMode ? 'Cancelar selección múltiple' : 'Seleccionar varios servicios'}
        </Button>
        {bulkMode && (
          <>
            <Chip 
              label={`${selectedServices.length} servicio(s) seleccionado(s)`} 
              color="primary" 
              variant="outlined"
            />
            {selectedServices.length > 0 && (
              <>
                <Button 
                  variant="outlined" 
                  color="secondary"
                  onClick={handleOpenBulkRemito}
                  disabled={!validateSameBuilding()}
                >
                  Cobro sin Factura
                </Button>
                <Button 
                  variant="outlined" 
                  color="primary"
                  onClick={handleOpenBulkImportInvoice}
                  disabled={!validateSameBuilding()}
                >
                  Importar Factura
                </Button>
                {!validateSameBuilding() && selectedServices.length > 0 && (
                  <Typography variant="caption" color="error">
                    Los servicios deben ser del mismo edificio
                  </Typography>
                )}
              </>
            )}
          </>
        )}
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {bulkMode && (
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={services.length > 0 && selectedServices.length === services.length}
                    indeterminate={selectedServices.length > 0 && selectedServices.length < services.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              <TableCell>Edificio</TableCell>
              <TableCell>Dirección</TableCell>
              <TableCell>Administrador</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Técnico</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>N° Remito</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {services.map((service) => {
              const hasReceipt = (service.receiptImages && service.receiptImages.length > 0) || (service.remitos && service.remitos.length > 0);
              const remitoNumber = service.remitos && service.remitos.length > 0 ? service.remitos[0].number : '-';
              
              return (
              <TableRow key={service.id}>
                {bulkMode && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedServices.includes(service.id)}
                      onChange={() => handleSelectService(service.id)}
                    />
                  </TableCell>
                )}
                <TableCell>{service.building?.name}</TableCell>
                <TableCell>{service.building?.address}</TableCell>
                <TableCell>{buildings.find((b: any) => b.id === service.buildingId)?.administrator?.name || '-'}</TableCell>
                <TableCell>{service.description}</TableCell>
                <TableCell>{service.technician?.name}</TableCell>
                <TableCell>{new Date(service.visitDate || service.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {hasReceipt ? (
                      <>
                        <Typography variant="body2">{remitoNumber}</Typography>
                        <Button
                          size="small"
                          variant="text" 
                          onClick={() => {
                            const urls = service.remitos?.[0]?.receiptImages || service.receiptImages || [];
                            if (urls.length > 0) {
                              window.open(urls[0], '_blank');
                            }
                          }}
                        >
                          Ver
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<CloudUploadIcon />}
                        onClick={() => handleOpenUploadRemito(service)}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        Subir
                      </Button>
                    )}
                  </Stack>
                </TableCell>
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
                      <IconButton
                        color="success"
                        title="Sin cobro económico"
                        onClick={() => handleNoChargeClick(service.id)}
                        disabled={markingNoCharge}
                      >
                        <CheckCircleIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        title="Eliminar servicio"
                        onClick={() => handleDeleteClick(service.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Box>
                </TableCell>
              </TableRow>
            );
            })}
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
      <Dialog open={deleteDialogOpen} onClose={handleDeleteClose} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar Servicio</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            ¿Estás seguro que querés eliminar este servicio? Se eliminarán también todos sus remitos asociados. Esta acción no se puede deshacer.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose} disabled={deletingService}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error" disabled={deletingService}>
            {deletingService ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={noChargeDialogOpen} onClose={handleNoChargeClose} maxWidth="xs" fullWidth>
        <DialogTitle>Sin Cobro Económico</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mt: 1 }}>
            ¿Confirmas que este servicio fue completado sin cobro económico? El servicio quedará registrado en el historial del edificio.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNoChargeClose} disabled={markingNoCharge}>Cancelar</Button>
          <Button onClick={handleConfirmNoCharge} variant="contained" color="success" disabled={markingNoCharge}>
            {markingNoCharge ? 'Guardando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* Diálogo para subir remito adicional/corrección */}
      <Dialog open={openUploadRemito} onClose={handleCloseUploadRemito} fullWidth maxWidth="sm">
        <DialogTitle>Subir/Corregir Remito</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Typography variant="body2" color="text.secondary">
              Sube un nuevo archivo de remito para el servicio: <b>{uploadRemitoService?.description}</b>.
              Esto agregará nuevas imágenes al remito existente.
            </Typography>

            <TextField
              label="Descripción del Servicio"
              multiline
              rows={3}
              value={uploadRemitoDescription}
              onChange={(e) => setUploadRemitoDescription(e.target.value)}
              fullWidth
              placeholder="Descripción del trabajo realizado"
            />
            
            <TextField
              label="Número de Remito (opcional)"
              value={uploadRemitoNumber}
              onChange={(e) => setUploadRemitoNumber(e.target.value)}
              fullWidth
              placeholder="Ej: REM-2024-001 (dejar vacío para auto-generar uno nuevo si no existe)"
            />
            
            <Box>
                <input
                  accept=".jpg,.jpeg,.pdf"
                  type="file"
                  multiple
                  onChange={handleUploadFileSelect}
                  style={{ display: 'none' }}
                  id="remito-upload-input-invoiced"
              />
              <label htmlFor="remito-upload-input-invoiced">
                <Button variant="contained" component="span">
                  📄 Seleccionar Archivos (JPG o PDF)
                </Button>
              </label>
              {uploadRemitoFiles.length > 0 && (
                <Box mt={1}>
                  <Typography variant="body2" color="success.main">
                    ✅ {uploadRemitoFiles.length} archivo(s) seleccionado(s)
                  </Typography>
                  {uploadRemitoFiles.map((file, index) => (
                    <Typography key={index} variant="caption" display="block" color="text.secondary">
                      {index + 1}. {file.name} - {(file.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadRemito}>Cancelar</Button>
          <Button 
            onClick={handleUploadRemitoSubmit} 
            disabled={isUploadingRemito || uploadRemitoFiles.length === 0} 
            variant="contained" 
            color="primary"
          >
            {isUploadingRemito ? 'Subiendo...' : 'Subir'}
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

      {/* Modal para cobro sin factura múltiple */}
      <Dialog open={openBulkRemito} onClose={handleCloseBulkRemito} fullWidth maxWidth="sm">
        <DialogTitle>Cobro sin Factura - Múltiples Servicios</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Alert severity="info">
              Se facturarán {selectedServices.length} servicios del edificio: {getSelectedBuildingName()}
            </Alert>
            <TextField 
              label="Monto Total" 
              type="number" 
              value={remitoAmount} 
              onChange={e => setRemitoAmount(e.target.value)} 
              fullWidth 
              required
            />
            <DatePicker 
              label="Fecha" 
              value={remitoDate} 
              onChange={setRemitoDate} 
              slotProps={{ textField: { fullWidth: true } }} 
            />
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
          <Button onClick={handleCloseBulkRemito}>Cancelar</Button>
          <Button 
            onClick={handleSaveBulkRemito} 
            variant="contained" 
            disabled={savingRemito || !remitoAmount}
          >
            {savingRemito ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para importar factura múltiple */}
      <Dialog open={openBulkImportInvoice} onClose={handleCloseBulkImportInvoice} fullWidth maxWidth="sm">
        <DialogTitle>Importar Factura - Múltiples Servicios</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Alert severity="info">
              Se facturarán {selectedServices.length} servicios del edificio: {getSelectedBuildingName()}
            </Alert>
            <TextField 
              label="Número de Factura" 
              value={invoiceNumber} 
              onChange={e => setInvoiceNumber(e.target.value)} 
              fullWidth 
              required
            />
            <TextField 
              label="Monto Total" 
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
                id="bulk-invoice-file-input"
                type="file"
                onChange={handleInvoiceFileSelect}
              />
              <label htmlFor="bulk-invoice-file-input">
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
          <Button onClick={handleCloseBulkImportInvoice}>Cancelar</Button>
          <Button 
            onClick={handleSaveBulkImportInvoice} 
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