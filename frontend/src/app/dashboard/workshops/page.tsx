'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Build as BuildIcon,
  List as ListIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface Workshop {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  contact: string | null;
  _count?: {
    workshopRepairs: number;
  };
}

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    contact: ''
  });

  useEffect(() => {
    fetchWorkshops();
  }, []);

  const fetchWorkshops = async () => {
    try {
      setLoading(true);
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
        const errorData = await response.json().catch(() => ({}));
        console.error('Error al cargar talleres:', response.status, errorData);
        setSnackbar({ 
          open: true, 
          message: errorData.error || `Error al cargar talleres (${response.status})`, 
          severity: 'error' 
        });
      }
    } catch (error: any) {
      console.error('Error:', error);
      setSnackbar({ 
        open: true, 
        message: error.message || 'Error al cargar talleres', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (workshop: Workshop | null = null) => {
    if (workshop) {
      setEditingWorkshop(workshop);
      setFormData({
        name: workshop.name,
        address: workshop.address || '',
        phone: workshop.phone || '',
        contact: workshop.contact || ''
      });
    } else {
      setEditingWorkshop(null);
      setFormData({
        name: '',
        address: '',
        phone: '',
        contact: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingWorkshop(null);
    setFormData({
      name: '',
      address: '',
      phone: '',
      contact: ''
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name.trim()) {
        setSnackbar({ open: true, message: 'El nombre del taller es requerido', severity: 'error' });
        return;
      }

      const token = localStorage.getItem('token');
      const url = editingWorkshop
        ? `${process.env.NEXT_PUBLIC_API_URL}/workshops/${editingWorkshop.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/workshops`;
      
      const response = await fetch(url, {
        method: editingWorkshop ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSnackbar({ 
          open: true, 
          message: editingWorkshop ? 'Taller actualizado correctamente' : 'Taller creado correctamente', 
          severity: 'success' 
        });
        handleCloseDialog();
        fetchWorkshops();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar taller');
      }
    } catch (error: any) {
      console.error('Error:', error);
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este taller?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/workshops/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSnackbar({ open: true, message: 'Taller eliminado correctamente', severity: 'success' });
        fetchWorkshops();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar taller');
      }
    } catch (error: any) {
      console.error('Error:', error);
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BuildIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4">Talleres</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ListIcon />}
              onClick={() => router.push('/dashboard/workshops/repairs')}
            >
              Ver Reparaciones
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Nuevo Taller
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Dirección</TableCell>
                  <TableCell>Teléfono</TableCell>
                  <TableCell>Contacto</TableCell>
                  <TableCell align="center">Reparaciones</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workshops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No hay talleres registrados
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  workshops.map((workshop) => (
                    <TableRow key={workshop.id}>
                      <TableCell>
                        <Typography variant="body1" fontWeight="medium">
                          {workshop.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{workshop.address || '-'}</TableCell>
                      <TableCell>{workshop.phone || '-'}</TableCell>
                      <TableCell>{workshop.contact || '-'}</TableCell>
                      <TableCell align="center">
                        {workshop._count?.workshopRepairs || 0}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(workshop)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(workshop.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Dialog para crear/editar taller */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingWorkshop ? 'Editar Taller' : 'Nuevo Taller'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Nombre *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Dirección"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              fullWidth
            />
            <TextField
              label="Teléfono"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="Contacto"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingWorkshop ? 'Guardar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para mensajes */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
