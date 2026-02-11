'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Autocomplete
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { History as HistoryIcon, Upload as UploadIcon } from '@mui/icons-material';
import api from '@/lib/axios';

interface Building {
  id: string;
  name: string;
  address: string;
}

interface Technician {
  id: string;
  name: string;
  email: string;
}

interface ServiceType {
  id: string;
  name: string;
  description?: string;
}

interface QuickPastServiceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickPastServiceModal({ open, onClose, onSuccess }: QuickPastServiceModalProps) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    buildingId: '',
    description: '',
    visitDate: new Date(),
    technicianId: '',
    remitoFiles: [] as File[]
  });

  useEffect(() => {
    if (open) {
      loadBuildings();
      loadTechnicians();
      loadServiceTypes();
    }
  }, [open]);

  const loadBuildings = async () => {
    try {
      const response = await api.get('/buildings?limit=1000');
      setBuildings(response.data.buildings || []);
    } catch (error) {
      console.error('Error al cargar edificios:', error);
      setError('Error al cargar edificios');
    }
  };

  const loadServiceTypes = async () => {
    try {
      // Agregar timestamp para evitar caché del navegador
      const response = await api.get(`/service-types?_t=${Date.now()}`);
      setServiceTypes(response.data || []);
    } catch (error) {
      console.error('Error al cargar tipos de servicio:', error);
      // No mostramos error al usuario, simplemente no habrá sugerencias
    }
  };

  const loadTechnicians = async () => {
    try {
      const response = await api.get('/technicians');
      setTechnicians(response.data || []);
    } catch (error) {
      console.error('Error al cargar técnicos:', error);
      setError('Error al cargar técnicos');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setFormData({ ...formData, remitoFiles: filesArray });
    }
  };

  const handleSubmit = async () => {
    if (!formData.buildingId || !formData.description || !formData.technicianId) {
      setError('Por favor completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submitData = new FormData();
      
      submitData.append('buildingId', formData.buildingId);
      submitData.append('description', formData.description);
      submitData.append('visitDate', formData.visitDate.toISOString());
      submitData.append('technicianId', formData.technicianId);
      
      // Agregar múltiples archivos
      if (formData.remitoFiles.length > 0) {
        formData.remitoFiles.forEach((file) => {
          submitData.append('remitoFiles', file);
        });
      }

      await api.post('/services/past', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Resetear formulario
      setFormData({
        buildingId: '',
        description: '',
        visitDate: new Date(),
        technicianId: '',
        remitoFiles: []
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error al crear servicio anterior:', error);
      setError(error.response?.data?.message || 'Error al crear servicio anterior');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        buildingId: '',
        description: '',
        visitDate: new Date(),
        technicianId: '',
        remitoFiles: []
      });
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <HistoryIcon />
          Crear Servicio Anterior
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Carga rápida de servicios anteriores. El servicio se creará directamente en estado "Facturación".
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Autocomplete
            options={buildings}
            getOptionLabel={(option) => `${option.name} - ${option.address}`}
            value={buildings.find(b => b.id === formData.buildingId) || null}
            onChange={(_, newValue) => {
              setFormData({ ...formData, buildingId: newValue ? newValue.id : '' });
            }}
            disabled={loading}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Edificio *"
                fullWidth
              />
            )}
            noOptionsText="No se encontraron edificios"
            isOptionEqualToValue={(option, value) => option.id === value.id}
          />

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Servicios Frecuentes (Click para agregar)
            </Typography>
            <Autocomplete
              options={serviceTypes.map((option) => option.name)}
              value={null}
              onChange={(_, newValue) => {
                if (newValue) {
                  const currentDesc = formData.description;
                  const separator = currentDesc ? '\n' : '';
                  setFormData({ 
                    ...formData, 
                    description: currentDesc + separator + newValue 
                  });
                }
              }}
              disabled={loading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Buscar servicio frecuente..."
                  size="small"
                />
              )}
              noOptionsText="No hay tipos de servicio configurados"
            />
          </Box>

          <TextField
            label="Descripción del Servicio *"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Escribe la descripción del trabajo realizado..."
            fullWidth
            disabled={loading}
          />

          <DatePicker
            label="Fecha de visita *"
            value={formData.visitDate}
            onChange={(newValue) => setFormData({ ...formData, visitDate: newValue || new Date() })}
            slotProps={{
              textField: {
                fullWidth: true,
              },
            }}
            disabled={loading}
          />

          <TextField
            select
            label="Técnico *"
            value={formData.technicianId}
            onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
            fullWidth
            disabled={loading}
          >
            <MenuItem value="">Seleccionar técnico</MenuItem>
            {technicians.map((tech) => (
              <MenuItem key={tech.id} value={tech.id}>
                {tech.name}
              </MenuItem>
            ))}
          </TextField>

          <Box>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              fullWidth
              disabled={loading}
            >
              {formData.remitoFiles.length > 0 
                ? `${formData.remitoFiles.length} archivo(s) seleccionado(s)` 
                : 'Adjuntar Remitos (Opcional)'}
              <input
                type="file"
                hidden
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileChange}
              />
            </Button>
            {formData.remitoFiles.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {formData.remitoFiles.map((file, index) => (
                  <Typography key={index} variant="caption" display="block" color="text.secondary">
                    {index + 1}. {file.name}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.buildingId || !formData.description || !formData.technicianId}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Creando...' : 'Crear Servicio'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
