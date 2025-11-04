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
} from '@mui/material';
import api from '@/lib/axios';

interface Building {
  id: string;
  name: string;
  administrator: { id: string; name: string };
}

export default function ReceiptPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [service, setService] = useState<any>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [administrators, setAdministrators] = useState<any[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<any | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [remitoNumber, setRemitoNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [serviceRes, buildingsRes, adminsRes] = await Promise.all([
          api.get(`/services/${id}`),
          api.get('/buildings'),
          api.get('/administrators'),
        ]);
        setService(serviceRes.data);
        // Manejar la respuesta que puede ser un objeto con array o directamente un array
        setBuildings(buildingsRes.data.buildings || buildingsRes.data);
        setAdministrators(adminsRes.data.administrators || adminsRes.data);
      } catch (err) {
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleAdminChange = (admin: any | null) => {
    setSelectedAdmin(admin);
    setSelectedBuilding(null);
  };

  const handleBuildingChange = (building: Building | null) => {
    setSelectedBuilding(building);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Solo se permiten archivos JPG y PDF');
        return;
      }
      
      // Validar tamaño (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setError('El archivo es demasiado grande. Máximo 10MB');
        return;
      }
      
      setReceiptFile(file);
      setError('');
    }
  };

  const handleSave = async () => {
    if (!receiptFile) {
      setError('Debes subir un archivo del remito');
      return;
    }
    
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('receipts', receiptFile);
      formData.append('remitoNumber', remitoNumber.trim());
      
      await api.post(`/services/${id}/receipt`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      router.push('/dashboard/services/invoiced');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al subir el remito';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const filteredBuildings = selectedAdmin
    ? buildings.filter((b) => b.administrator?.id === selectedAdmin.id)
    : buildings;

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
        Subir Remito
      </Typography>
      <Stack spacing={2} mb={2}>
        <Autocomplete
          options={administrators}
          getOptionLabel={(option) => option.name}
          value={selectedAdmin}
          onChange={(_, newValue) => handleAdminChange(newValue)}
          renderInput={(params) => <TextField {...params} label="Buscar administrador" />}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          noOptionsText="No se encontraron administradores"
        />
        <Autocomplete
          options={filteredBuildings}
          getOptionLabel={(option) => option.name}
          value={selectedBuilding}
          onChange={(_, newValue) => handleBuildingChange(newValue)}
          renderInput={(params) => <TextField {...params} label="Buscar edificio" />}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          noOptionsText="No se encontraron edificios"
        />
      </Stack>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1"><b>Edificio:</b> {service?.building?.name}</Typography>
        <Typography variant="subtitle1"><b>Descripción:</b> {service?.description}</Typography>
      </Paper>
      
      <Stack spacing={3}>
        {/* Campo de número de remito */}
        <TextField
          label="Número de Remito (opcional)"
          value={remitoNumber}
          onChange={(e) => setRemitoNumber(e.target.value)}
          fullWidth
          placeholder="Ej: REM-2024-001 o A12345 (se generará automáticamente si no ingresas uno)"
          helperText="Ingresa el número de remito o déjalo vacío para generar uno automáticamente"
        />
        
        {/* Subida de archivo */}
        <Box>
          <input
            accept=".jpg,.jpeg,.pdf"
            type="file"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="receipt-file"
          />
          <label htmlFor="receipt-file">
            <Button variant="contained" component="span">
              📄 Subir Remito (JPG o PDF)
            </Button>
          </label>
          {receiptFile && (
            <Box mt={1}>
              <Typography variant="body2" color="success.main">
                ✅ Archivo cargado: {receiptFile.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tipo: {receiptFile.type} | Tamaño: {(receiptFile.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
            </Box>
          )}
        </Box>
      </Stack>
      
      <Box mt={3} display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={saving || !receiptFile}
        >
          Guardar Remito
        </Button>
      </Box>
    </Box>
  );
} 