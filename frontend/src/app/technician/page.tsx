'use client';

import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Card, CardContent, Grid, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Stack } from '@mui/material';
import { DateRange, Today, Event, AllInbox, Camera, PhotoLibrary, Cancel } from '@mui/icons-material';
import api from '@/lib/axios';
import { useRouter } from 'next/navigation';

interface Service {
  id: string;
  descripcion: string;
  edificio: string;
  direccion: string;
  fechaVisita: string;
  fechaTexto: string;
  estadoRemito: string;
  remitoImagenes: string[];
}

export default function TechnicianPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [filter, setFilter] = useState<'hoy' | 'maniana' | 'semana' | 'todos'>('hoy');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const fetchServices = async (dateFilter: string) => {
    try {
      const response = await api.get(`/services/assigned?dateFilter=${dateFilter}&estadoRemito=pendiente`);
      setServices(response.data);
    } catch (error) {
      console.error('Error al obtener servicios:', error);
    }
  };

  useEffect(() => {
    fetchServices(filter);
  }, [filter]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser({ name: res.data.name, email: res.data.email });
      } catch {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, []);

  const handleFilterChange = (newFilter: 'hoy' | 'maniana' | 'semana' | 'todos') => {
    setFilter(newFilter);
  };

  const handleUploadClick = (service: Service) => {
    setSelectedService(service);
    setIsUploadDialogOpen(true);
  };

  const handleCancelClick = (service: Service) => {
    setSelectedService(service);
    setIsCancelDialogOpen(true);
  };

  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.capture = 'environment';
      fileInputRef.current.click();
    }
  };

  const handleGalleryClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.capture = undefined;
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedService) return;

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('receipts', file);
    });

    try {
      await api.post(`/services/${selectedService.id}/receipt`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setIsUploadDialogOpen(false);
      fetchServices(filter); // Actualizar la lista
    } catch (error) {
      console.error('Error al subir remito:', error);
    }
  };

  const handleCancelService = async () => {
    if (!selectedService) return;

    try {
      await api.post(`/services/${selectedService.id}/cancel`);
      setIsCancelDialogOpen(false);
      fetchServices(filter); // Actualizar la lista
    } catch (error) {
      console.error('Error al cancelar servicio:', error);
    }
  };

  const getFilterButtonStyle = (buttonFilter: string) => ({
    backgroundColor: filter === buttonFilter ? 'primary.main' : 'grey.200',
    color: filter === buttonFilter ? 'white' : 'text.primary',
    '&:hover': {
      backgroundColor: filter === buttonFilter ? 'primary.dark' : 'grey.300',
    },
  });

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', margin: '0 auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          Mis Trabajos Asignados
        </Typography>
        <Stack direction="row" alignItems="center" spacing={2}>
          {user ? (
            <>
              <Box textAlign="right">
                <Typography variant="subtitle1">{user.name}</Typography>
                <Typography variant="body2" color="text.secondary">{user.email}</Typography>
              </Box>
              <Button variant="outlined" color="error" onClick={() => {
                localStorage.removeItem('token');
                router.push('/login');
              }}>
                Cerrar sesión
              </Button>
            </>
          ) : loadingUser ? (
            <span>Cargando...</span>
          ) : null}
        </Stack>
      </Box>

      <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<Today />}
          onClick={() => handleFilterChange('hoy')}
          sx={getFilterButtonStyle('hoy')}
        >
          Hoy
        </Button>
        <Button
          variant="contained"
          startIcon={<DateRange />}
          onClick={() => handleFilterChange('maniana')}
          sx={getFilterButtonStyle('maniana')}
        >
          Mañana
        </Button>
        <Button
          variant="contained"
          startIcon={<Event />}
          onClick={() => handleFilterChange('semana')}
          sx={getFilterButtonStyle('semana')}
        >
          Esta Semana
        </Button>
        <Button
          variant="contained"
          startIcon={<AllInbox />}
          onClick={() => handleFilterChange('todos')}
          sx={getFilterButtonStyle('todos')}
        >
          Todos
        </Button>
      </Box>

      <Grid container spacing={3}>
        {services.map((service) => (
          <Grid item xs={12} key={service.id}>
            <Card sx={{ 
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4
              }
            }}>
              <CardContent>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  gap: 2
                }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {service.edificio}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {service.direccion}
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      {service.descripcion}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'flex-end', 
                    gap: 2,
                    minWidth: '200px'
                  }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        label={service.fechaTexto}
                        color="primary"
                        size="small"
                      />
                      <Chip
                        label={service.estadoRemito}
                        color={service.estadoRemito === 'Remito subido' ? 'success' : 'warning'}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 1,
                      width: '100%',
                      justifyContent: 'flex-end'
                    }}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Camera />}
                        onClick={() => handleUploadClick(service)}
                      >
                        SUBIR FOTO/REMITO
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="medium"
                        startIcon={<Cancel />}
                        onClick={() => handleCancelClick(service)}
                        sx={{ minWidth: '100px' }}
                      >
                        Anular
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Diálogo para subir remito */}
      <Dialog 
        open={isUploadDialogOpen} 
        onClose={() => setIsUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Subir Remito</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<Camera />}
              onClick={handleCameraClick}
              fullWidth
              size="large"
            >
              Cámara
            </Button>
            <Button
              variant="contained"
              startIcon={<PhotoLibrary />}
              onClick={handleGalleryClick}
              fullWidth
              size="large"
            >
              Galería
            </Button>
          </Box>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            multiple
            accept="image/*"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsUploadDialogOpen(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación para anular servicio */}
      <Dialog 
        open={isCancelDialogOpen} 
        onClose={() => setIsCancelDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmar Anulación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro que deseas anular esta visita? El servicio volverá al estado pendiente de asignación.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCancelDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleCancelService} color="error" variant="contained">
            Confirmar Anulación
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 