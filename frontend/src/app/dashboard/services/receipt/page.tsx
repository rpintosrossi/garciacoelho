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
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Build as BuildIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { useServiceCounts } from '@/hooks/useServiceCounts';
import { cachedApi } from '@/lib/axios';
import { useCommonData } from '@/contexts/CommonDataContext';
import WorkshopRepairModal from '@/components/WorkshopRepairModal';

interface Service {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  buildingId: string;
  building: {
    name: string;
    address: string;
    doormanType?: string;
  };
  technician: {
    name: string;
  };
  receipt: {
    imageUrl: string;
  };
  visitDate?: string;
  workshopRepairs?: Array<{ id: string }>;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ServicesWithReceipt() {
  const router = useRouter();
  const { administrators, buildings } = useCommonData();
  const [services, setServices] = useState<Service[]>([]);
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

  // Estados para el modal de subida de remito
  const [remitoModalOpen, setRemitoModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [remitoNumber, setRemitoNumber] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [workshopRepairModalOpen, setWorkshopRepairModalOpen] = useState(false);
  const [selectedServiceForRepair, setSelectedServiceForRepair] = useState<Service | null>(null);
  
  // Estados para el diálogo de reasignación
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [serviceToReassign, setServiceToReassign] = useState<Service | null>(null);
  const [reassignReason, setReassignReason] = useState('');

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

  const handleUploadClick = (service: Service) => {
    setSelectedService(service);
    setRemitoNumber('');
    setSelectedFiles([]);
    setRemitoModalOpen(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const filesArray = Array.from(files);
      
      // Validar tipo de archivo para cada uno
      const allowedTypes = ['image/jpeg', 'image/jpg', 'application/pdf'];
      const invalidFiles = filesArray.filter(file => !allowedTypes.includes(file.type));
      
      if (invalidFiles.length > 0) {
        setError('Solo se permiten archivos JPG y PDF');
        return;
      }
      
      // Validar tamaño (máximo 10MB por archivo)
      const maxSize = 10 * 1024 * 1024; // 10MB
      const oversizedFiles = filesArray.filter(file => file.size > maxSize);
      
      if (oversizedFiles.length > 0) {
        setError('Hay archivos demasiado grandes. Máximo 10MB por archivo');
        return;
      }
      
      setSelectedFiles(filesArray);
      setError('');
    }
  };

  const handleUploadRemito = async () => {
    if (!selectedService || selectedFiles.length === 0) {
      setError('Debes seleccionar al menos un archivo');
      return;
    }

    setUploadingId(selectedService.id);
    setError('');
    
    try {
      const formData = new FormData();
      
      // Agregar múltiples archivos
      selectedFiles.forEach((file) => {
        formData.append('receipts', file);
      });
      
      formData.append('remitoNumber', remitoNumber.trim());
      
      const response = await api.post(`/services/${selectedService.id}/receipt`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Limpiar caché para que se actualice la lista
      cachedApi.clearCacheFor('/services');

      console.log('Respuesta exitosa:', response);
      console.log('Respuesta data:', response.data);
      
      console.log('Cerrando modal...');
      setRemitoModalOpen(false);
      setRemitoNumber('');
      setSelectedFiles([]);
      
      console.log('Actualizando servicios...');
      await fetchServices();
      
      console.log('Actualizando conteos...');
      await refreshCounts();
      
      console.log('Redirigiendo a facturación...');
      // Redirigir a la página de facturación
      const serviceId = selectedService.id;
      setSelectedService(null);
      router.push('/dashboard/services/invoiced');
    } catch (err: any) {
      console.error('Error completo:', err);
      console.error('Error response:', err.response);
      console.error('Error data:', err.response?.data);
      console.error('Error message:', err.message);
      console.error('Error name:', err.name);
      
      let errorMessage = 'Error al subir el remito';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setUploadingId(null);
    }
  };

  const handleCloseModal = () => {
    setRemitoModalOpen(false);
    setSelectedService(null);
    setRemitoNumber('');
    setSelectedFiles([]);
    setError('');
  };

  const handleReassign = (service: Service) => {
    setServiceToReassign(service);
    setReassignDialogOpen(true);
    setReassignReason('');
  };

  const handleOpenWorkshopRepair = (service: Service) => {
    setSelectedServiceForRepair(service);
    setWorkshopRepairModalOpen(true);
  };

  const handleWorkshopRepairSuccess = () => {
    fetchServices();
  };

  const handleConfirmReassign = async () => {
    if (!serviceToReassign) return;
    
    if (!reassignReason.trim()) {
      setError('Debes proporcionar un motivo de reasignación');
      return;
    }

    setReassigningId(serviceToReassign.id);
    setError('');
    
    try {
      await api.post(`/services/${serviceToReassign.id}/cancel`, {
        cancellationReason: reassignReason.trim()
      });
      
      // Limpiar caché para que se actualice la lista
      cachedApi.clearCacheFor('/services');
      
      // Cerrar el diálogo
      setReassignDialogOpen(false);
      setServiceToReassign(null);
      setReassignReason('');
      
      // Actualizar la lista de servicios
      await fetchServices();
      
      // Actualizar conteos
      await refreshCounts();
      
      // Redirigir a la página de asignación
      router.push('/dashboard/services/assigned');
    } catch (err: any) {
      let errorMessage = 'Error al reasignar el servicio';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setReassigningId(null);
    }
  };

  const handleCloseReassignDialog = () => {
    setReassignDialogOpen(false);
    setServiceToReassign(null);
    setReassignReason('');
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
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleUploadClick(service)}
                      disabled={uploadingId === service.id || reassigningId === service.id}
                    >
                      Subir Remito
                    </Button>
                    <Tooltip title={service.workshopRepairs && service.workshopRepairs.length > 0 ? "Ya existe un taller para este servicio" : "Reparación a Taller"}>
                      <span>
                        <IconButton
                          onClick={() => handleOpenWorkshopRepair(service)}
                          color="warning"
                          disabled={uploadingId === service.id || reassigningId === service.id || (service.workshopRepairs && service.workshopRepairs.length > 0)}
                        >
                          <BuildIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={() => handleReassign(service)}
                      disabled={uploadingId === service.id || reassigningId === service.id}
                    >
                      Reasignar
                    </Button>
                    {(uploadingId === service.id || reassigningId === service.id) && (
                      <CircularProgress size={20} />
                    )}
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

      {/* Modal para subir remito */}
      <Dialog open={remitoModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>
          Subir Remito - {selectedService?.building?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <b>Descripción:</b> {selectedService?.description}
            </Typography>
            
            <TextField
              label="Número de Remito (opcional)"
              value={remitoNumber}
              onChange={(e) => setRemitoNumber(e.target.value)}
              fullWidth
              placeholder="Ej: REM-2024-001 o A12345 (se generará automáticamente si no ingresas uno)"
              helperText="Ingresa el número de remito o déjalo vacío para generar uno automáticamente"
              sx={{ mb: 2 }}
            />
            
            <Box>
              <input
                accept=".jpg,.jpeg,.pdf"
                type="file"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="remito-file-input"
              />
              <label htmlFor="remito-file-input">
                <Button variant="contained" component="span">
                  📄 Seleccionar Archivos (JPG o PDF)
                </Button>
              </label>
              {selectedFiles.length > 0 && (
                <Box mt={1}>
                  <Typography variant="body2" color="success.main">
                    ✅ {selectedFiles.length} archivo(s) seleccionado(s)
                  </Typography>
                  {selectedFiles.map((file, index) => (
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
          <Button onClick={handleCloseModal}>Cancelar</Button>
          <Button 
            onClick={handleUploadRemito} 
            variant="contained"
            disabled={selectedFiles.length === 0 || uploadingId === selectedService?.id}
          >
            {uploadingId === selectedService?.id ? 'Subiendo...' : 'Subir Remito'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para reasignar servicio */}
      <Dialog open={reassignDialogOpen} onClose={handleCloseReassignDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Reasignar Servicio - {serviceToReassign?.building?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <b>Descripción:</b> {serviceToReassign?.description}
            </Typography>
            
            <Alert severity="warning" sx={{ mb: 2 }}>
              Este servicio volverá al estado de asignación y deberá ser reasignado a un técnico.
            </Alert>
            
            <TextField
              label="Motivo de reasignación"
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Ej: Técnico no puede completar el trabajo, error en la asignación, etc."
              required
              helperText="Debes proporcionar un motivo para reasignar el servicio"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReassignDialog} disabled={reassigningId !== null}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmReassign} 
            variant="contained"
            color="warning"
            disabled={!reassignReason.trim() || reassigningId !== null}
          >
            {reassigningId !== null ? 'Reasignando...' : 'Confirmar Reasignación'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Reparación a Taller */}
      <WorkshopRepairModal
        open={workshopRepairModalOpen}
        onClose={() => setWorkshopRepairModalOpen(false)}
        service={selectedServiceForRepair}
        onSuccess={handleWorkshopRepairSuccess}
      />
    </Box>
  );
} 