'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/utils/formatCurrency';

interface Client {
  id: string;
  name: string;
  address: string;
  cuit: string;
  contact: string;
  taxCondition: 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTO' | 'EXENTO' | 'CONSUMIDOR_FINAL';
  account: {
    balance: number;
  };
}

const schema = yup.object().shape({
  name: yup.string().required('El nombre es requerido'),
  address: yup.string().required('La dirección es requerida'),
  cuit: yup.string().required('El CUIT es requerido'),
  contact: yup.string().required('El contacto es requerido'),
  taxCondition: yup.string().required('La condición fiscal es requerida'),
});

const taxConditionLabels = {
  RESPONSABLE_INSCRIPTO: 'Responsable Inscripto',
  MONOTRIBUTO: 'Monotributo',
  EXENTO: 'Exento',
  CONSUMIDOR_FINAL: 'Consumidor Final',
};

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [taxCondition, setTaxCondition] = useState('');
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    fetchClients();
  }, [search, taxCondition]);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Token:', token); // Verificar si el token existe
      
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (taxCondition) params.append('taxCondition', taxCondition);

      const response = await api.get(`/clients?${params}`);
      setClients(response.data);
    } catch (error) {
      console.error('Error:', error);
      setError('Error al cargar los clientes');
    }
  };

  const handleOpen = (client?: Client) => {
    if (client) {
      setSelectedClient(client);
      reset(client);
    } else {
      setSelectedClient(null);
      reset({});
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedClient(null);
    reset({});
  };

  const onSubmit = async (data: any) => {
    try {
      if (selectedClient) {
        await api.put(`/clients/${selectedClient.id}`, data);
      } else {
        await api.post('/clients', data);
      }
      handleClose();
      fetchClients();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error al guardar el cliente');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este cliente?')) {
      try {
        await api.delete(`/clients/${id}`);
        fetchClients();
      } catch (error: any) {
        setError(error.response?.data?.message || 'Error al eliminar el cliente');
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Clientes</Typography>
        <Button variant="contained" onClick={() => handleOpen()}>
          Nuevo Cliente
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Box sx={{ flex: 1 }}>
            <TextField
              fullWidth
              label="Buscar por nombre o CUIT"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Condición Fiscal</InputLabel>
              <Select
                value={taxCondition}
                label="Condición Fiscal"
                onChange={(e) => setTaxCondition(e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                {Object.entries(taxConditionLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Dirección</TableCell>
              <TableCell>CUIT</TableCell>
              <TableCell>Contacto</TableCell>
              <TableCell>Condición Fiscal</TableCell>
              <TableCell>Saldo</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>{client.name}</TableCell>
                <TableCell>{client.address}</TableCell>
                <TableCell>{client.cuit}</TableCell>
                <TableCell>{client.contact}</TableCell>
                <TableCell>{taxConditionLabels[client.taxCondition]}</TableCell>
                <TableCell>{formatCurrency(client.account.balance)}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(client)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(client.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedClient ? 'Editar Cliente' : 'Nuevo Cliente'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <TextField
              fullWidth
              label="Nombre"
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Dirección"
              {...register('address')}
              error={!!errors.address}
              helperText={errors.address?.message}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="CUIT"
              {...register('cuit')}
              error={!!errors.cuit}
              helperText={errors.cuit?.message}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Contacto"
              {...register('contact')}
              error={!!errors.contact}
              helperText={errors.contact?.message}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth>
              <InputLabel>Condición Fiscal</InputLabel>
              <Select
                {...register('taxCondition')}
                label="Condición Fiscal"
                error={!!errors.taxCondition}
              >
                {Object.entries(taxConditionLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Guardar
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
} 