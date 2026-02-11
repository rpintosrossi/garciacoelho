'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  Tooltip
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { cachedApi } from '@/lib/axios';

interface ServiceType {
  id: string;
  name: string;
  description?: string;
}

export default function ServiceTypesManager() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceType | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchServiceTypes();
  }, []);

  const fetchServiceTypes = async () => {
    try {
      const response = await cachedApi.get('/service-types');
      setServiceTypes(response.data);
    } catch (error) {
      console.error('Error al cargar tipos de servicio:', error);
      setSnackbar({ open: true, message: 'Error al cargar tipos de servicio', severity: 'error' });
    }
  };

  const handleOpen = (type?: ServiceType) => {
    setEditing(type || null);
    setName(type?.name || '');
    setDescription(type?.description || '');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setName('');
    setDescription('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setSnackbar({ open: true, message: 'El nombre es obligatorio', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const data = { name, description };

      if (editing) {
        await cachedApi.put(`/service-types/${editing.id}`, data);
        setSnackbar({ open: true, message: 'Tipo de servicio actualizado', severity: 'success' });
      } else {
        await cachedApi.post('/service-types', data);
        setSnackbar({ open: true, message: 'Tipo de servicio creado', severity: 'success' });
      }

      // Limpiar caché para asegurar que otros componentes obtengan datos frescos
      cachedApi.clearCacheFor('/service-types');

      fetchServiceTypes();
      handleClose();
    } catch (error: any) {
      console.error('Error al guardar:', error);
      setSnackbar({ open: true, message: error.response?.data?.message || 'Error al guardar', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este tipo de servicio?')) return;
    
    try {
      await cachedApi.delete(`/service-types/${id}`);
      // Limpiar caché
      cachedApi.clearCacheFor('/service-types');
      
      setSnackbar({ open: true, message: 'Tipo de servicio eliminado', severity: 'success' });
      fetchServiceTypes();
    } catch (error: any) {
      console.error('Error al eliminar:', error);
      setSnackbar({ open: true, message: 'Error al eliminar tipo de servicio', severity: 'error' });
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Tipos de Servicio</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
          Nuevo Tipo
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {serviceTypes.map((type) => (
              <TableRow key={type.id}>
                <TableCell>{type.name}</TableCell>
                <TableCell>{type.description}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <IconButton onClick={() => handleOpen(type)} color="primary">
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton onClick={() => handleDelete(type.id)} color="error">
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {serviceTypes.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No hay tipos de servicio configurados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Tipo de Servicio' : 'Nuevo Tipo de Servicio'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Nombre *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Descripción"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
