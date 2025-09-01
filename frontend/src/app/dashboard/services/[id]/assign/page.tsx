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
  Stack,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { es } from 'date-fns/locale';
import { format, startOfWeek, addDays, setHours, setMinutes } from 'date-fns';
import api from '@/lib/axios';
import { useServiceCounts } from '@/hooks/useServiceCounts';

interface Technician {
  id: string;
  name: string;
  email: string;
}

interface TimeRange {
  label: string;
  startHour: number;
  endHour: number;
}

const timeRanges: TimeRange[] = [
  { label: '08-12', startHour: 8, endHour: 12 },
  { label: '13-17', startHour: 13, endHour: 17 },
  { label: '17-20', startHour: 17, endHour: 20 },
];

export default function AssignTechnicianPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [service, setService] = useState<any>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [visitDate, setVisitDate] = useState<Date | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const { refreshCounts } = useServiceCounts();

  // Obtener los días de la semana actual
  const getWeekDays = () => {
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); // Lunes como inicio de semana
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(startOfCurrentWeek, i);
      days.push({
        date: day,
        label: format(day, 'EEEE', { locale: es }),
        isToday: format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'),
        isPast: day < new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      });
    }
    return days;
  };

  const weekDays = getWeekDays();

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

  const handleDaySelect = (day: any) => {
    if (day.isPast) return; // No permitir seleccionar días pasados
    
    const selectedDate = new Date(day.date);
    setVisitDate(selectedDate);
    setSelectedTimeRange(null); // Resetear el rango de tiempo al cambiar día
  };

  const handleTimeRangeSelect = (timeRange: TimeRange) => {
    if (!visitDate) return;
    
    setSelectedTimeRange(timeRange);
    
    // Establecer la hora del día seleccionado
    const finalDate = new Date(visitDate);
    finalDate.setHours(timeRange.startHour, 0, 0, 0);
    setVisitDate(finalDate);
  };

  const handleCalendarOpen = () => {
    setCalendarOpen(true);
  };

  const handleCalendarClose = () => {
    setCalendarOpen(false);
    setCustomDate(null);
  };

  const handleCustomDateSelect = (date: Date | null) => {
    if (!date) return;
    
    // Verificar que la fecha no sea en el pasado
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      setError('No puedes seleccionar una fecha en el pasado');
      return;
    }
    
    // Establecer solo la fecha sin hora
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    setCustomDate(selectedDate);
    setVisitDate(selectedDate);
    setSelectedTimeRange(null);
    setError('');
  };

  const handleCustomTimeRangeSelect = (timeRange: TimeRange) => {
    if (!customDate) return;
    
    setSelectedTimeRange(timeRange);
    
    // Establecer la hora del día seleccionado
    const finalDate = new Date(customDate);
    finalDate.setHours(timeRange.startHour, 0, 0, 0);
    setVisitDate(finalDate);
  };

  const handleAssign = async () => {
    if (!selectedTechnician || !visitDate || !selectedTimeRange) {
      setError('Selecciona un técnico, día y horario de visita');
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
      router.push('/dashboard/services/receipt');
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
    <Box p={3} maxWidth={800} mx="auto">
      <Typography variant="h4" gutterBottom>
        Asignar Técnico
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1"><b>Edificio:</b> {service?.building?.name}</Typography>
        <Typography variant="subtitle1"><b>Descripción:</b> {service?.description}</Typography>
      </Paper>
      
      <FormControl fullWidth sx={{ mb: 3 }}>
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

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Seleccionar Día de la Semana
          </Typography>
          <Button
            variant="outlined"
            onClick={handleCalendarOpen}
            sx={{ ml: 2 }}
          >
            📅 Otra Fecha
          </Button>
        </Box>
        
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          {weekDays.map((day) => (
            <Chip
              key={day.label}
              label={day.label}
              variant={visitDate && format(visitDate, 'yyyy-MM-dd') === format(day.date, 'yyyy-MM-dd') ? 'filled' : 'outlined'}
              color={visitDate && format(visitDate, 'yyyy-MM-dd') === format(day.date, 'yyyy-MM-dd') ? 'primary' : 'default'}
              onClick={() => handleDaySelect(day)}
              disabled={day.isPast}
              sx={{
                fontWeight: day.isToday ? 'bold' : 'normal',
                backgroundColor: day.isToday ? 'primary.light' : 'transparent',
                color: day.isToday ? 'white' : 'inherit',
              }}
            />
          ))}
        </Stack>
        
        {visitDate && !selectedTimeRange && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Seleccionar Horario
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {timeRanges.map((timeRange) => (
                <Chip
                  key={timeRange.label}
                  label={timeRange.label}
                  variant="outlined"
                  onClick={() => handleTimeRangeSelect(timeRange)}
                />
              ))}
            </Stack>
          </>
        )}
        
        {visitDate && selectedTimeRange && (
          <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="body2" color="text.secondary">
              <b>Fecha seleccionada:</b> {format(visitDate, 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es })} a las {selectedTimeRange.startHour}:00
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Dialog para seleccionar fecha personalizada */}
      <Dialog open={calendarOpen} onClose={handleCalendarClose} maxWidth="sm" fullWidth>
        <DialogTitle>Seleccionar Fecha Personalizada</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <DatePicker
              label="Fecha de visita"
              value={customDate}
              onChange={handleCustomDateSelect}
              minDate={new Date()}
              slotProps={{
                textField: {
                  fullWidth: true,
                  sx: { mb: 2 },
                },
              }}
            />
            
            {customDate && !selectedTimeRange && (
              <>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Seleccionar Horario
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {timeRanges.map((timeRange) => (
                    <Chip
                      key={timeRange.label}
                      label={timeRange.label}
                      variant="outlined"
                      onClick={() => handleCustomTimeRangeSelect(timeRange)}
                    />
                  ))}
                </Stack>
              </>
            )}
            
            {customDate && selectedTimeRange && (
              <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
                <Typography variant="body2" color="text.secondary">
                  <b>Fecha seleccionada:</b> {format(customDate, 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es })} a las {selectedTimeRange.startHour}:00
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCalendarClose}>Cancelar</Button>
          <Button 
            onClick={handleCalendarClose} 
            variant="contained"
            disabled={!customDate || !selectedTimeRange}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Box mt={3} display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          color="primary"
          onClick={handleAssign}
          disabled={saving || !selectedTechnician || !visitDate || !selectedTimeRange}
        >
          Asignar Técnico
        </Button>
      </Box>
    </Box>
  );
} 