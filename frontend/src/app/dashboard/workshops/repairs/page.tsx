'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Tabs,
  Tab
} from '@mui/material';
import {
  Edit as EditIcon,
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';

interface WorkshopRepair {
  id: string;
  buildingAddress: string;
  doormanBrand: string | null;
  workshopCost: number | null;
  clientPrice: number | null;
  visitDate: string | null;
  workshopEntryDate: string | null;
  installationDate: string | null;
  paid: boolean;
  createdAt: string;
  service: {
    id: string;
    description: string;
    building: {
      name: string;
    };
  };
  workshop: {
    id: string;
    name: string;
  };
}

interface Workshop {
  id: string;
  name: string;
}

export default function WorkshopRepairsListPage() {
  const [repairs, setRepairs] = useState<WorkshopRepair[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<WorkshopRepair | null>(null);
  const [tabValue, setTabValue] = useState(0);

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
    fetchRepairs();
    fetchWorkshops();
  }, []);

  const fetchRepairs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/workshop-repairs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRepairs(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

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
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleEditClick = (repair: WorkshopRepair) => {
    setSelectedRepair(repair);
    setFormData({
      workshopId: repair.workshop.id,
      buildingAddress: repair.buildingAddress,
      doormanBrand: repair.doormanBrand || '',
      workshopCost: repair.workshopCost?.toString() || '',
      clientPrice: repair.clientPrice?.toString() || '',
      visitDate: repair.visitDate ? new Date(repair.visitDate) : null,
      workshopEntryDate: repair.workshopEntryDate ? new Date(repair.workshopEntryDate) : null,
      installationDate: repair.installationDate ? new Date(repair.installationDate) : null,
      paid: repair.paid
    });
    setEditDialogOpen(true);
  };

  const handleUpdateRepair = async () => {
    if (!selectedRepair) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/workshop-repairs/${selectedRepair.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
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
        }
      );

      if (response.ok) {
        fetchRepairs();
        setEditDialogOpen(false);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy');
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(value);
  };

  const filteredRepairs = tabValue === 0 
    ? repairs 
    : tabValue === 1 
    ? repairs.filter(r => r.paid)
    : repairs.filter(r => !r.paid);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <BuildIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4">Reparaciones en Talleres</Typography>
          </Box>

          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
            <Tab label="Todas" />
            <Tab label="Pagadas" />
            <Tab label="Pendientes de Pago" />
          </Tabs>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Edificio</TableCell>
                    <TableCell>Dirección</TableCell>
                    <TableCell>Taller</TableCell>
                    <TableCell>Marca Portero</TableCell>
                    <TableCell>Costo Taller</TableCell>
                    <TableCell>Precio Cliente</TableCell>
                    <TableCell>Fecha Visita</TableCell>
                    <TableCell>Ingreso Taller</TableCell>
                    <TableCell>Instalación</TableCell>
                    <TableCell>Estado Pago</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRepairs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center">
                        <Typography variant="body2" color="textSecondary">
                          No hay reparaciones registradas
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRepairs.map((repair) => (
                      <TableRow key={repair.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {repair.service.building.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {repair.service.description}
                          </Typography>
                        </TableCell>
                        <TableCell>{repair.buildingAddress}</TableCell>
                        <TableCell>
                          <Chip label={repair.workshop.name} size="small" />
                        </TableCell>
                        <TableCell>{repair.doormanBrand || '-'}</TableCell>
                        <TableCell>{formatCurrency(repair.workshopCost)}</TableCell>
                        <TableCell>{formatCurrency(repair.clientPrice)}</TableCell>
                        <TableCell>{formatDate(repair.visitDate)}</TableCell>
                        <TableCell>{formatDate(repair.workshopEntryDate)}</TableCell>
                        <TableCell>{formatDate(repair.installationDate)}</TableCell>
                        <TableCell>
                          {repair.paid ? (
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="Pagado"
                              color="success"
                              size="small"
                            />
                          ) : (
                            <Chip
                              icon={<CancelIcon />}
                              label="Pendiente"
                              color="warning"
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleEditClick(repair)}
                            color="primary"
                          >
                            <EditIcon />
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

        {/* Dialog para editar reparación */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Editar Reparación</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <TextField
                label="Dirección del Edificio"
                value={formData.buildingAddress}
                onChange={(e) => setFormData({ ...formData, buildingAddress: e.target.value })}
                fullWidth
              />

              <TextField
                label="Marca del Portero"
                value={formData.doormanBrand}
                onChange={(e) => setFormData({ ...formData, doormanBrand: e.target.value })}
                fullWidth
              />

              <TextField
                select
                label="Taller"
                value={formData.workshopId}
                onChange={(e) => setFormData({ ...formData, workshopId: e.target.value })}
                fullWidth
              >
                {workshops.map((workshop) => (
                  <MenuItem key={workshop.id} value={workshop.id}>
                    {workshop.name}
                  </MenuItem>
                ))}
              </TextField>

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
            <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateRepair} variant="contained">
              Guardar
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
}
