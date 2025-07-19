'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  FormControl,
  Autocomplete,
  TextField,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import api from '@/lib/axios';
import { useServiceCounts } from '@/hooks/useServiceCounts';

interface Technician {
  id: string;
  name: string;
  email: string;
}

export default function AssignTechnicianPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [service, setService] = useState<any>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [visitDate, setVisitDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { refreshCounts } = useServiceCounts();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [serviceRes, techRes] = await Promise.all([
          api.get(`/services/${id}`),
          api.get('/technicians'),
        ]);
        setService(serviceRes.data);
        setTechnicians(techRes.data);
      } catch (err) {
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleAssign = async () => {
    if (!selectedTechnician || !visitDate) {
      setError('Selecciona un técnico y una fecha de visita');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post(`/services/${id}/assign`, {
        technicianId: selectedTechnician.id,
        visitDate,
      });
      await refreshCounts();
      router.push('/dashboard/services/assigned');
    } catch (err) {
      setError('Error al asignar técnico');
    } finally {
      setSaving(false);
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
      <Box p={3}><Alert severity="error">{error}</Alert></Box>
    );
  }

  return (
    <Box p={3} maxWidth={600} mx="auto">
      <Typography variant="h4" gutterBottom>
        Asignar Técnico
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1"><b>Edificio:</b> {service?.building?.name}</Typography>
        <Typography variant="subtitle1"><b>Descripción:</b> {service?.description}</Typography>
      </Paper>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <Autocomplete
          options={technicians}
          getOptionLabel={(option) => `${option.name} (${option.email})`}
          value={selectedTechnician}
          onChange={(_, newValue) => setSelectedTechnician(newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Buscar técnico" />
          )}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          noOptionsText="No se encontraron técnicos"
          loadingText="Cargando técnicos..."
        />
      </FormControl>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
        <DateTimePicker
          label="Fecha y hora de visita"
          value={visitDate}
          onChange={setVisitDate}
          ampm={false}
          desktopModeMediaQuery="@media (min-width:600px)"
          slotProps={{
            textField: {
              fullWidth: true,
              sx: { minWidth: 260 },
            },
            popper: {
              placement: 'bottom',
              modifiers: [
                { name: 'preventOverflow', options: { boundary: 'viewport' } }
              ]
            }
          }}
        />
      </LocalizationProvider>
      <Box mt={3} display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          color="primary"
          onClick={handleAssign}
          disabled={saving}
        >
          Asignar Técnico
        </Button>
      </Box>
    </Box>
  );
} 