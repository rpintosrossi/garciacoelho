'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  Paper,
  Alert,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Autocomplete,
  Stack,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useRouter } from 'next/navigation';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
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

const steps = ['Registro de Servicio', 'Asignación', 'Remito', 'Facturación'];

const schema = yup.object().shape({
  buildingId: yup.string().required('El edificio es requerido'),
  description: yup.string().required('La descripción de la falla es requerida'),
  technicianId: yup.string().nullable(),
  visitDate: yup.date().nullable(),
  receiptImage: yup.string().nullable(),
  step: yup.number().default(0)
});

type FormValues = yup.InferType<typeof schema>;

export default function NewService() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [visitDate, setVisitDate] = useState<Date | null>(null);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      buildingId: '',
      description: '',
      step: 0,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Iniciando carga de datos...');
        const [buildingsRes, techniciansRes] = await Promise.all([
          api.get('/buildings'),
          api.get('/technicians'),
        ]);
        console.log('Respuesta de técnicos:', techniciansRes.data);
        setBuildings(buildingsRes.data);
        setTechnicians(techniciansRes.data);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError('Error al cargar los datos necesarios');
      }
    };

    fetchData();
  }, []);

  const handleBuildingChange = (building: Building | null) => {
    setSelectedBuilding(building);
    setValue('buildingId', building?.id || '');
  };

  const handleTechnicianChange = (technician: Technician | null) => {
    setSelectedTechnician(technician);
    setValue('technicianId', technician?.id || '');
  };

  const handleVisitDateChange = (date: Date | null) => {
    setVisitDate(date);
    setValue('visitDate', date || undefined);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReceiptImage(file);
      // Aquí podrías subir la imagen a un servicio de almacenamiento
      // y guardar la URL en el formulario
      setValue('receiptImage', 'URL_DE_LA_IMAGEN');
    }
  };

  const handleNext = async () => {
    setIsSaving(true);
    setError('');
    try {
      const currentData = getValues();
      if (activeStep === 0) {
        // Paso 1: Crear servicio y redirigir a asignación
        const response = await api.post('/services', {
          buildingId: currentData.buildingId,
          description: currentData.description,
        });
        const newServiceId = response.data.id;
        router.push(`/dashboard/services/${newServiceId}/assign`);
        return;
      } else if (activeStep === 1 && serviceId) {
        // Paso 2: Asignar técnico
        await api.post(`/services/${serviceId}/assign`, {
          technicianId: currentData.technicianId,
          visitDate: currentData.visitDate,
        });
        setActiveStep((prev) => prev + 1);
      } else if (activeStep === 2 && serviceId) {
        // Paso 3: Subir remito
        // Aquí deberías subir la imagen y obtener la URL real
        await api.post(`/services/${serviceId}/receipt`, {
          receiptImage: currentData.receiptImage || 'URL_DE_LA_IMAGEN',
        });
        setActiveStep((prev) => prev + 1);
      } else if (activeStep === 3 && serviceId) {
        // Paso 4: Facturación (puedes implementar el endpoint si lo necesitas)
        // await api.post(`/services/${serviceId}/invoice`, { ... });
        router.push('/dashboard/services/invoiced');
      }
    } catch (error) {
      setError('Error al guardar el progreso');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSaving(true);
      await api.post('/services', data);
      router.push('/dashboard/services');
    } catch (error) {
      setError('Error al crear el servicio');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <Autocomplete
                options={buildings}
                getOptionLabel={(option) => `${option.name} - ${option.address}`}
                value={selectedBuilding}
                onChange={(_, newValue) => handleBuildingChange(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Buscar edificio"
                    error={!!errors.buildingId}
                    helperText={errors.buildingId?.message}
                  />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                noOptionsText="No se encontraron edificios"
                loadingText="Cargando edificios..."
              />
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Descripción de la falla"
              placeholder="Ejemplo: No funciona el portero en 7C, 4B y 8D"
              {...register('description')}
              error={!!errors.description}
              helperText={errors.description?.message}
              sx={{ mb: 2 }}
            />
          </>
        );
      case 1:
        return (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <Autocomplete
                options={technicians}
                getOptionLabel={(option) => `${option.name} (${option.email})`}
                value={selectedTechnician}
                onChange={(_, newValue) => handleTechnicianChange(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Buscar técnico"
                    error={!!errors.technicianId}
                    helperText={errors.technicianId?.message || (technicians.length === 0 ? 'No hay técnicos disponibles' : '')}
                  />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                noOptionsText="No se encontraron técnicos"
                loadingText="Cargando técnicos..."
                disabled={technicians.length === 0}
              />
            </FormControl>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <DateTimePicker
                label="Fecha y hora de visita"
                value={visitDate}
                onChange={handleVisitDateChange}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.visitDate,
                    helperText: errors.visitDate?.message,
                  },
                }}
              />
            </LocalizationProvider>
          </>
        );
      case 2:
        return (
          <Stack spacing={2}>
            <Typography>
              Sube una imagen del remito firmado. Solo el técnico asignado podrá acceder a este paso.
            </Typography>
            <input
              accept="image/*"
              type="file"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              id="receipt-image"
            />
            <label htmlFor="receipt-image">
              <Button
                variant="contained"
                component="span"
                disabled={!selectedTechnician}
              >
                Subir imagen del remito
              </Button>
            </label>
            {receiptImage && (
              <Typography variant="body2" color="success.main">
                Imagen cargada: {receiptImage.name}
              </Typography>
            )}
          </Stack>
        );
      case 3:
        return (
          <Typography>
            La facturación se realizará en una futura integración.
          </Typography>
        );
      default:
        return null;
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Nuevo Servicio
      </Typography>
      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      {error && <Alert severity="error">{error}</Alert>}
      <form onSubmit={handleSubmit(handleNext)}>
        {renderStepContent(activeStep)}
        <Box mt={2} display="flex" justifyContent="space-between">
          <Button
            disabled={activeStep === 0 || isSaving}
            onClick={handleBack}
            variant="outlined"
          >
            Atrás
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSaving}
          >
            {activeStep === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
          </Button>
        </Box>
        {isSaving && (
          <Box display="flex" justifyContent="center" mt={2}>
            <CircularProgress size={24} />
          </Box>
        )}
      </form>
    </Box>
  );
} 