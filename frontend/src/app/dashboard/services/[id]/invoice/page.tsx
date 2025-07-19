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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import api from '@/lib/axios';

interface Building {
  id: string;
  name: string;
  administrator: { id: string; name: string };
}

export default function InvoicePage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [service, setService] = useState<any>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [administrators, setAdministrators] = useState<any[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<any | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<Date | null>(null);
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

  const handleSave = async () => {
    if (!invoiceNumber || !invoiceAmount || !invoiceDate) {
      setError('Completa todos los campos de la factura');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // Aquí deberías llamar al endpoint de facturación
      // await api.post(`/services/${id}/invoice`, { invoiceNumber, invoiceAmount, invoiceDate });
      router.push('/dashboard/services/invoiced');
    } catch (err) {
      setError('Error al guardar la factura');
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
        Facturación
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
      <TextField
        fullWidth
        label="Número de Factura"
        value={invoiceNumber}
        onChange={(e) => setInvoiceNumber(e.target.value)}
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label="Monto"
        type="number"
        value={invoiceAmount}
        onChange={(e) => setInvoiceAmount(e.target.value)}
        sx={{ mb: 2 }}
      />
      <DatePicker
        label="Fecha de Factura"
        value={invoiceDate}
        onChange={setInvoiceDate}
        slotProps={{
          textField: {
            fullWidth: true,
          },
        }}
      />
      <Box mt={3} display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={saving}
        >
          Guardar Factura
        </Button>
      </Box>
    </Box>
  );
} 