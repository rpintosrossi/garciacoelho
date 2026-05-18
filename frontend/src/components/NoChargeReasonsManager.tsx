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
  Tooltip,
  Chip
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { cachedApi } from '@/lib/axios';

interface NoChargeReason {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function NoChargeReasonsManager() {
  const [reasons, setReasons] = useState<NoChargeReason[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NoChargeReason | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReasons();
  }, []);

  const fetchReasons = async () => {
    try {
      const response = await cachedApi.get('/no-charge-reasons');
      setReasons(response.data);
    } catch (error) {
      console.error('Error al cargar motivos:', error);
      setSnackbar({ open: true, message: 'Error al cargar los motivos', severity: 'error' });
    }
  };

  const handleOpen = (reason?: NoChargeReason) => {
    setEditing(reason || null);
    setName(reason?.name || '');
    setDescription(reason?.description || '');
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
      if (editing) {
        await cachedApi.put(`/no-charge-reasons/${editing.id}`, { name, description });
        setSnackbar({ open: true, message: 'Motivo actualizado', severity: 'success' });
      } else {
        await cachedApi.post('/no-charge-reasons', { name, description });
        setSnackbar({ open: true, message: 'Motivo creado', severity: 'success' });
      }
      cachedApi.clearCacheFor('/no-charge-reasons');
      fetchReasons();
      handleClose();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.response?.data?.message || 'Error al guardar', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reason: NoChargeReason) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el motivo "${reason.name}"?`)) return;
    try {
      await cachedApi.delete(`/no-charge-reasons/${reason.id}`);
      cachedApi.clearCacheFor('/no-charge-reasons');
      setSnackbar({ open: true, message: 'Motivo eliminado', severity: 'success' });
      fetchReasons();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.response?.data?.message || 'Error al eliminar', severity: 'error' });
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Motivos Sin Cobro Económico</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
          Nuevo Motivo
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reasons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No hay motivos creados todavía
                </TableCell>
              </TableRow>
            ) : (
              reasons.map((reason) => (
                <TableRow key={reason.id}>
                  <TableCell><strong>{reason.name}</strong></TableCell>
                  <TableCell>{reason.description || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={reason.isActive ? 'Activo' : 'Inactivo'}
                      color={reason.isActive ? 'success' : 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton onClick={() => handleOpen(reason)} color="primary">
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton onClick={() => handleDelete(reason)} color="error">
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Motivo' : 'Nuevo Motivo'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Nombre"
            fullWidth
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            label="Descripción (opcional)"
            fullWidth
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
