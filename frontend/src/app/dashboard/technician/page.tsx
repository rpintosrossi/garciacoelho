'use client';
import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, CardActions, Button, Chip, Stack, CircularProgress, Alert, ToggleButtonGroup, ToggleButton, Avatar, Tabs, Tab
} from '@mui/material';
import Grid from '@mui/material/Grid';
import api from '@/lib/axios';
import { useRouter } from 'next/navigation';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { Cancel } from '@mui/icons-material';
import ClientLayout from '@/app/ClientLayout';

interface Trabajo {
  id: string;
  descripcion: string;
  edificio: string;
  direccion: string;
  fechaVisita: string;
  fechaTexto: string;
  estadoRemito: string;
  remitoImagenes: string[];
  status: string;
}

export default function TechnicianTasksPage() {
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'hoy' | 'maniana' | 'semana' | 'todos'>('hoy');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<'pendientes' | 'conRemito'>('pendientes');
  const [user, setUser] = useState<{name: string, email: string} | null>(null);
  const [anularId, setAnularId] = useState<string | null>(null);
  const [anulando, setAnulando] = useState(false);
  const router = useRouter();

  const fetchTrabajos = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No hay sesión activa');
        return;
      }
      let estadoRemitoParam = 'todos';
      if (tab === 'pendientes') estadoRemitoParam = 'pendiente';
      if (tab === 'conRemito') estadoRemitoParam = 'subido';
      const res = await api.get(`/services/assigned?dateFilter=${dateFilter}&estadoRemito=${estadoRemitoParam}`);
      setTrabajos(res.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al cargar trabajos';
      setError(errorMessage);
      console.error('Error al cargar trabajos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrabajos();
    // Obtener datos del usuario
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser({ name: res.data.name, email: res.data.email });
      } catch {}
    };
    fetchUser();
    // eslint-disable-next-line
  }, [dateFilter, tab]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, trabajoId: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingId(trabajoId);
    setSuccessMsg(null);
    try {
      const formData = new FormData();
      Array.from(e.target.files).forEach(file => formData.append('receipts', file));
      const token = localStorage.getItem('token');
      await api.post(`/services/${trabajoId}/receipt`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setSuccessMsg('Remito subido correctamente');
      fetchTrabajos();
      setTab('conRemito');
    } catch {
      setError('Error al subir el remito');
    } finally {
      setUploadingId(null);
    }
  };

  const handleAnular = async () => {
    if (!anularId) return;
    setAnulando(true);
    try {
      const token = localStorage.getItem('token');
      await api.post(`/services/${anularId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMsg('Visita anulada correctamente');
      setAnularId(null);
      fetchTrabajos();
    } catch {
      setError('Error al anular la visita');
    } finally {
      setAnulando(false);
    }
  };

  // Helper para saber si se puede editar el remito
  const puedeEditarRemito = (trabajo: Trabajo) => trabajo.estadoRemito !== 'Facturado';

  // Helper para saber si el archivo es PDF
  const esPDF = (filename: string) => filename.toLowerCase().endsWith('.pdf');

  return (
    <ClientLayout>
      <Box p={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4">Mis Trabajos</Typography>
          <Stack direction="row" alignItems="center" spacing={2}>
            {user ? (
              <>
                <Box textAlign="right">
                  <Typography variant="subtitle1">{user.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                </Box>
                <Button variant="outlined" color="error" onClick={() => {
                  localStorage.removeItem('token');
                  router.refresh();
                }}>Cerrar sesión</Button>
              </>
            ) : loading ? (
              <CircularProgress size={24} />
            ) : null}
          </Stack>
        </Box>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Pendientes de remito" value="pendientes" />
          <Tab label="Con remito subido" value="conRemito" />
        </Tabs>
        <ToggleButtonGroup
          value={dateFilter}
          exclusive
          onChange={(_, val) => val && setDateFilter(val)}
          sx={{ mb: 3 }}
        >
          <ToggleButton value="hoy">Hoy</ToggleButton>
          <ToggleButton value="maniana">Mañana</ToggleButton>
          <ToggleButton value="semana">Esta semana</ToggleButton>
          <ToggleButton value="todos">Todos</ToggleButton>
        </ToggleButtonGroup>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : trabajos.length === 0 ? (
          <Alert severity="info">
            {tab === 'pendientes'
              ? 'No tienes trabajos pendientes de remito para este filtro.'
              : 'No tienes trabajos con remito subido para este filtro.'}
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {trabajos.map(trabajo => (
              <Grid item xs={12} md={6} lg={4} key={trabajo.id} sx={{ display: 'flex' }}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" gap={1} mb={1}>
                      <Avatar>{trabajo.edificio[0]}</Avatar>
                      <Box>
                        <Typography variant="h6">{trabajo.edificio}</Typography>
                        <Typography variant="body2" color="text.secondary">{trabajo.direccion}</Typography>
                      </Box>
                    </Stack>
                    <Typography variant="subtitle1" gutterBottom>{trabajo.descripcion}</Typography>
                    <Chip label={trabajo.fechaTexto} color="primary" size="small" sx={{ mr: 1 }} />
                    {trabajo.status === 'CON_REMITO' ? (
                      <Chip label="Remito subido" color="success" size="small" />
                    ) : (
                      <Chip label="Pendiente de remito" color="warning" size="small" />
                    )}
                    {trabajo.remitoImagenes && trabajo.remitoImagenes.length > 0 && (
                      <Box mt={2}>
                        <Typography variant="body2" color="text.secondary">Archivos adjuntos:</Typography>
                        <Stack direction="row" spacing={1} mt={1}>
                          {trabajo.remitoImagenes.map((img, idx) => (
                            esPDF(img)
                              ? <a key={idx} href={`/${img}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                                  <img src="/pdf-icon.png" alt="PDF" style={{ width: 32, marginRight: 4 }} />
                                  <Typography variant="body2" color="primary">Descargar PDF</Typography>
                                </a>
                              : <a key={idx} href={`/${img}`} target="_blank" rel="noopener noreferrer">
                                  <img src={`/${img}`} alt="Remito" style={{ width: 80, borderRadius: 4, border: '1px solid #eee' }} />
                                </a>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </CardContent>
                  <CardActions>
                    {tab === 'pendientes' && puedeEditarRemito(trabajo) && (
                      <>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          style={{ display: 'none' }}
                          id={`upload-remito-${trabajo.id}`}
                          multiple
                          onChange={e => handleUpload(e, trabajo.id)}
                        />
                        <label htmlFor={`upload-remito-${trabajo.id}`}>
                          <Button
                            variant="contained"
                            component="span"
                            disabled={uploadingId === trabajo.id}
                          >
                            SUBIR FOTO/REMITO
                          </Button>
                        </label>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<Cancel />}
                          onClick={() => setAnularId(trabajo.id)}
                          disabled={anulando}
                          sx={{ ml: 1 }}
                        >
                          Anular
                        </Button>
                        {uploadingId === trabajo.id && <CircularProgress size={20} sx={{ ml: 2 }} />}
                      </>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
        {successMsg && <Alert severity="success" sx={{ mt: 2 }}>{successMsg}</Alert>}
        {/* Diálogo de confirmación para anular visita */}
        <Dialog open={!!anularId} onClose={() => setAnularId(null)}>
          <DialogTitle>Confirmar Anulación</DialogTitle>
          <DialogContent>
            <Typography>¿Estás seguro que deseas anular esta visita? El servicio volverá al estado pendiente de asignación.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAnularId(null)} disabled={anulando}>Cancelar</Button>
            <Button onClick={handleAnular} color="error" variant="contained" disabled={anulando}>
              {anulando ? 'Anulando...' : 'Confirmar Anulación'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ClientLayout>
  );
} 