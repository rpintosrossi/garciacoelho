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
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
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
        setBuildings(buildingsRes.data);
        setAdministrators(adminsRes.data);
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReceiptImage(file);
    }
  };

  const handleSave = async () => {
    if (!receiptImage) {
      setError('Debes subir una imagen del remito');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // Aquí deberías subir la imagen y obtener la URL real
      await api.post(`/services/${id}/receipt`, {
        receiptImage: 'URL_DE_LA_IMAGEN',
      });
      router.push('/dashboard/services/receipt');
    } catch (err) {
      setError('Error al subir el remito');
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
      <input
        accept="image/*"
        type="file"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
        id="receipt-image"
      />
      <label htmlFor="receipt-image">
        <Button variant="contained" component="span">
          Subir imagen del remito
        </Button>
      </label>
      {receiptImage && (
        <Typography variant="body2" color="success.main">
          Imagen cargada: {receiptImage.name}
        </Typography>
      )}
      <Box mt={3} display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={saving}
        >
          Guardar Remito
        </Button>
      </Box>
    </Box>
  );
} 