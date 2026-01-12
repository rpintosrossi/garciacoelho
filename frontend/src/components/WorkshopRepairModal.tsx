'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  Box,
  IconButton,
  MenuItem,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

interface Workshop {
  id: string;
  name: string;
}

interface Service {
  id: string;
  description: string;
  visitDate?: string;
  building: {
    address: string;
    doormanType?: string;
  };
}

interface WorkshopRepairModalProps {
  open: boolean;
  onClose: () => void;
  service: Service | null;
  onSuccess?: () => void;
}

interface WorkshopFormData {
  name: string;
  address: string;
  phone: string;
  contact: string;
}

export default function WorkshopRepairModal({ open, onClose, service, onSuccess }: WorkshopRepairModalProps) {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openWorkshopDialog, setOpenWorkshopDialog] = useState(false);
  const [workshopFormData, setWorkshopFormData] = useState<WorkshopFormData>({
    name: '',
    address: '',
    phone: '',
    contact: ''
  });

  const [formData, setFormData] = useState({
    workshopId: '',
    buildingAddress: '',
    doormanBrand: '',
    workshopCost: '',
    clientPrice: '',
    visitDate: null as Date | null,
    workshopEntryDate: null as Date | null,
    installationDate: null as Date | null,
    paid: false
  });

  useEffect(() => {
    if (open) {
      fetchWorkshops();
      if (service) {
        setFormData({
          workshopId: '',
          buildingAddress: service.building.address || '',
          doormanBrand: service.building.doormanType || '',
          workshopCost: '',
          clientPrice: '',
          visitDate: service.visitDate ? new Date(service.visitDate) : null,
          workshopEntryDate: null,
          installationDate: null,
          paid: false
        });
      } else {
        // Reset form si no hay servicio
        setFormData({
          workshopId: '',
          buildingAddress: '',
          doormanBrand: '',
          workshopCost: '',
          clientPrice: '',
          visitDate: null,
          workshopEntryDate: null,
          installationDate: null,
          paid: false
        });
      }
    }
  }, [open, service]);

  const fetchWorkshops = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/workshops`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWorkshops(data);
      } else {
        console.error('Error al cargar talleres:', response.status);
        if (response.status === 404) {
          setError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
        }
        setWorkshops([]);
      }
    } catch (error) {
      console.error('Error al cargar talleres:', error);
      setError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
      setWorkshops([]);
    }
  };

  const handleCreateWorkshop = async () => {
    try {
      if (!workshopFormData.name.trim()) {
        setError('El nombre del taller es requerido');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/workshops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(workshopFormData)
      });

      if (response.ok) {
        const newWorkshop = await response.json();
        setWorkshops([...workshops, newWorkshop]);
        setFormData({ ...formData, workshopId: newWorkshop.id });
        setOpenWorkshopDialog(false);
        setWorkshopFormData({ name: '', address: '', phone: '', contact: '' });
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al crear taller');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error al crear taller');
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.workshopId || !formData.buildingAddress) {
        setError('El taller y la dirección del edificio son requeridos');
        return;
      }

      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/workshop-repairs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceId: service?.id,
          workshopId: formData.workshopId,
          buildingAddress: formData.buildingAddress,
          doormanBrand: formData.doormanBrand || null,
          workshopCost: formData.workshopCost ? parseFloat(formData.workshopCost) : null,
          clientPrice: formData.clientPrice ? parseFloat(formData.clientPrice) : null,
          visitDate: formData.visitDate?.toISOString(),
          workshopEntryDate: formData.workshopEntryDate?.toISOString(),
          installationDate: formData.installationDate?.toISOString(),
          paid: formData.paid
        })
      });

      if (response.ok) {
        onSuccess?.();
        handleClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al crear reparación');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error al crear reparación');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      workshopId: '',
      buildingAddress: '',
      doormanBrand: '',
      workshopCost: '',
      clientPrice: '',
      visitDate: null,
      workshopEntryDate: null,
      installationDate: null,
      paid: false
    });
    setError('');
    onClose();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Reparación a Taller
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Dirección del Edificio"
              value={formData.buildingAddress}
              onChange={(e) => setFormData({ ...formData, buildingAddress: e.target.value })}
              fullWidth
              required
            />

            <TextField
              label="Marca del Portero"
              value={formData.doormanBrand}
              onChange={(e) => setFormData({ ...formData, doormanBrand: e.target.value })}
              fullWidth
            />

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                select
                label="Taller *"
                value={formData.workshopId}
                onChange={(e) => setFormData({ ...formData, workshopId: e.target.value })}
                fullWidth
                required
              >
                {workshops.map((workshop) => (
                  <MenuItem key={workshop.id} value={workshop.id}>
                    {workshop.name}
                  </MenuItem>
                ))}
              </TextField>
              <IconButton
                color="primary"
                onClick={() => setOpenWorkshopDialog(true)}
                sx={{ minWidth: 48 }}
              >
                <AddIcon />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Costo Taller"
                type="number"
                value={formData.workshopCost}
                onChange={(e) => setFormData({ ...formData, workshopCost: e.target.value })}
                fullWidth
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
              <TextField
                label="Precio a Cliente"
                type="number"
                value={formData.clientPrice}
                onChange={(e) => setFormData({ ...formData, clientPrice: e.target.value })}
                fullWidth
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <DatePicker
                label="Fecha Visita"
                value={formData.visitDate}
                onChange={(date) => setFormData({ ...formData, visitDate: date })}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="Fecha Ingreso al Taller"
                value={formData.workshopEntryDate}
                onChange={(date) => setFormData({ ...formData, workshopEntryDate: date })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Box>

            <DatePicker
              label="Fecha de Instalación"
              value={formData.installationDate}
              onChange={(date) => setFormData({ ...formData, installationDate: date })}
              slotProps={{ textField: { fullWidth: true } }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.paid}
                  onChange={(e) => setFormData({ ...formData, paid: e.target.checked })}
                />
              }
              label="Pagado"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Crear Reparación'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para crear nuevo taller */}
      <Dialog open={openWorkshopDialog} onClose={() => setOpenWorkshopDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo Taller</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Nombre *"
              value={workshopFormData.name}
              onChange={(e) => setWorkshopFormData({ ...workshopFormData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Dirección"
              value={workshopFormData.address}
              onChange={(e) => setWorkshopFormData({ ...workshopFormData, address: e.target.value })}
              fullWidth
            />
            <TextField
              label="Teléfono"
              value={workshopFormData.phone}
              onChange={(e) => setWorkshopFormData({ ...workshopFormData, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="Contacto"
              value={workshopFormData.contact}
              onChange={(e) => setWorkshopFormData({ ...workshopFormData, contact: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenWorkshopDialog(false)}>Cancelar</Button>
          <Button onClick={handleCreateWorkshop} variant="contained">
            Crear
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
