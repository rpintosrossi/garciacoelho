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
import FileViewer from '@/components/FileViewer';
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
  
  console.log('🔍 [FRONTEND] InvoicePage renderizado con ID:', id);
  console.log('🔍 [FRONTEND] URL actual:', window.location.href);
  console.log('🔍 [FRONTEND] Params completos:', params);
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
    console.log('🔍 [FRONTEND] useEffect ejecutándose para cargar datos del servicio:', id);
    const fetchData = async () => {
      try {
        const [serviceRes, buildingsRes, adminsRes] = await Promise.all([
          api.get(`/services/${id}`),
          api.get('/buildings'),
          api.get('/administrators'),
        ]);
        console.log('🔍 [FRONTEND] Datos del servicio recibidos:', serviceRes.data);
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
      const invoiceData = { 
        invoiceNumber, 
        invoiceAmount, 
        invoiceDate: invoiceDate ? invoiceDate.toISOString() : new Date().toISOString()
      };
      console.log('Enviando datos de factura:', invoiceData);
      await api.post(`/services/${id}/invoice`, invoiceData);
      router.push('/dashboard/services/invoiced');
    } catch (err) {
      setError('Error al guardar la factura');
    } finally {
      setSaving(false);
    }
  };

  const handleInformalInvoice = async () => {
    console.log('🔍 [FRONTEND] Botón "Cobro sin Factura" clickeado');
    console.log('🔍 [FRONTEND] ID del servicio:', id);
    console.log('🔍 [FRONTEND] Monto:', invoiceAmount);
    
    if (!invoiceAmount) {
      setError('El importe es obligatorio');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const informalData = { 
        amount: invoiceAmount
      };
      console.log('🔍 [FRONTEND] Enviando datos de cobro sin factura:', informalData);
      console.log('🔍 [FRONTEND] URL del endpoint:', `/services/${id}/informal-invoice`);
      
      const response = await api.post(`/services/${id}/informal-invoice`, informalData);
      console.log('🔍 [FRONTEND] Respuesta del servidor:', response.data);
      
      router.push('/dashboard/services/invoiced');
    } catch (err) {
      console.error('🔍 [FRONTEND] Error al crear cobro sin factura:', err);
      console.error('🔍 [FRONTEND] Error response:', err.response);
      setError('Error al crear el cobro sin factura');
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
          <Typography variant="subtitle1"><b>Dirección:</b> {service?.building?.address || '-'}</Typography>
          <Typography variant="subtitle1"><b>Descripción:</b> {service?.description}</Typography>
          <Typography variant="subtitle1"><b>Técnico asignado:</b> {service?.technician?.name || '-'}</Typography>
          <Typography variant="subtitle1"><b>Estado:</b> {service?.status}</Typography>
        </Paper>
        
        {service?.remitos && service.remitos.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Remitos Asociados</Typography>
            {service.remitos.map((remito: any, index: number) => (
              <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="body2"><b>Número:</b> {remito.number}</Typography>
                <Typography variant="body2"><b>Fecha:</b> {remito.date ? new Date(remito.date).toLocaleDateString() : '-'}</Typography>
                <Typography variant="body2"><b>Monto:</b> ${remito.amount || 0}</Typography>
                {remito.receiptImages && remito.receiptImages.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2"><b>Imágenes:</b></Typography>
                    <Stack direction="row" spacing={1} mt={1}>
                      {remito.receiptImages.map((img: string, i: number) => (
                        <FileViewer 
                          key={i} 
                          fileUrl={img} 
                          alt={`Remito ${remito.number}`}
                          width={60}
                          height={60}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>
            ))}
          </Paper>
        )}
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
        <Box mt={3} display="flex" justifyContent="space-between">
          {console.log('🔍 [FRONTEND] Renderizando botón "Cobro sin Factura"')}
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              console.log('🔍 [FRONTEND] Botón clickeado - llamando a handleInformalInvoice');
              handleInformalInvoice();
            }}
            disabled={saving}
          >
            Cobro sin Factura
          </Button>
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