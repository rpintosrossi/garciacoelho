"use client";
import React, { useEffect, useState } from "react";
import api from '@/lib/axios';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Container,
} from "@mui/material";
import { Add, Edit, Delete, AccountBalance } from "@mui/icons-material";
import { useFormik } from "formik";
import * as Yup from "yup";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { formatCurrency } from '@/utils/formatCurrency';
import { useCommonData } from '@/contexts/CommonDataContext';
import BuildingAccountModal from '../administrators/BuildingAccountModal';

interface Administrator {
  id: string;
  name: string;
}

interface Building {
  id: string;
  name: string;
  address: string;
  cuit: string;
  contact: string;
  taxCondition: string;
  administratorId: string;
  administrator: Administrator;
  createdAt: string;
  updatedAt: string;
  account?: { balance: number };
  // Nuevos campos
  debtThreshold?: number;
  rating?: number;
  managerPhone?: string;
  generalInfo?: string;
  doormanType?: string;
  floors?: number;
  apartments?: number;
  phones?: string[];
  phoneNames?: string[];
  locality?: string;
}



const validationSchema = Yup.object({
  name: Yup.string().required("El nombre es obligatorio"),
  address: Yup.string().required("La dirección es obligatoria"),
  cuit: Yup.string().required("El CUIT es obligatorio"),
  contact: Yup.string().required("El contacto es obligatorio"),
  taxCondition: Yup.string().required("La condición fiscal es obligatoria"),
  administratorId: Yup.string().required("El administrador es obligatorio"),
  // Nuevos campos
  debtThreshold: Yup.number().positive("Debe ser un número positivo").integer("Debe ser un número entero"),
  rating: Yup.number().min(1, "Debe ser 1, 2 o 3").max(3, "Debe ser 1, 2 o 3"),
  managerPhone: Yup.string(),
  generalInfo: Yup.string(),
  doormanType: Yup.string(),
  floors: Yup.number().positive("Debe ser un número positivo"),
  apartments: Yup.number().positive("Debe ser un número positivo"),
  phones: Yup.array().of(Yup.string()),
  phoneNames: Yup.array().of(Yup.string()),
  locality: Yup.string(),
});

const taxConditionLabels: Record<string, string> = {
  RESPONSABLE_INSCRIPTO: "Responsable Inscripto",
  MONOTRIBUTO: "Monotributo",
  EXENTO: "Exento",
  CONSUMIDOR_FINAL: "Consumidor Final",
};

const BuildingsPage = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [availableLocalities, setAvailableLocalities] = useState<string[]>([]);
  const [administrators, setAdministrators] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Building | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const [openAccount, setOpenAccount] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [orderBy, setOrderBy] = useState<string>('name');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');
  const [buildingFilter, setBuildingFilter] = useState('');

  const fetchBuildings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/buildings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBuildings(res.data);
    } catch (error) {
      setSnackbar({ open: true, message: "Error al cargar edificios", severity: "error" });
    }
  };

  const fetchAdministrators = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/administrators?basic=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdministrators(res.data);
    } catch (error) {
      setSnackbar({ open: true, message: "Error al cargar administradores", severity: "error" });
    }
  };

  const fetchAvailableLocalities = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/buildings/localities/available", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvailableLocalities(res.data);
    } catch (error) {
      setSnackbar({ open: true, message: "Error al cargar localidades", severity: "error" });
    }
  };



  useEffect(() => {
    fetchBuildings();
    fetchAdministrators();
    fetchAvailableLocalities();
  }, []);



  const handleOpen = (building?: Building) => {
    setEditing(building || null);
    setOpen(true);
  };

  const handleClose = () => {
    setEditing(null);
    setOpen(false);
    formik.resetForm();
  };

  const formik = useFormik({
    initialValues: {
      name: editing?.name || "",
      address: editing?.address || "",
      cuit: editing?.cuit || "",
      contact: editing?.contact || "",
      taxCondition: editing?.taxCondition || "CONSUMIDOR_FINAL",
      administratorId: editing?.administratorId || "",
      // Nuevos campos
      debtThreshold: editing?.debtThreshold || 30,
      rating: editing?.rating || 1,
      managerPhone: editing?.managerPhone || "",
      generalInfo: editing?.generalInfo || "",
      doormanType: editing?.doormanType || "",
      floors: editing?.floors || "",
      apartments: editing?.apartments || "",
      phones: editing?.phones || [],
      phoneNames: editing?.phoneNames || [],
      locality: editing?.locality || "",
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values) => {
      try {
        const token = localStorage.getItem("token");
        if (editing) {
          await api.put(`/buildings/${editing.id}`, values, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSnackbar({ open: true, message: "Edificio actualizado", severity: "success" });
        } else {
          await api.post("/buildings", values, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSnackbar({ open: true, message: "Edificio creado", severity: "success" });
        }
        fetchBuildings();
        handleClose();
      } catch (error: any) {
        setSnackbar({ open: true, message: error?.response?.data?.message || "Error al guardar", severity: "error" });
      }
    },
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este edificio?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/buildings/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSnackbar({ open: true, message: "Edificio eliminado", severity: "success" });
      fetchBuildings();
    } catch (error: any) {
      setSnackbar({ open: true, message: error?.response?.data?.message || "Error al eliminar", severity: "error" });
    }
  };

  const handleOpenAccount = (building: Building) => {
    setSelectedBuilding(building);
    setOpenAccount(true);
  };

  const handleCloseAccount = () => {
    setOpenAccount(false);
    setSelectedBuilding(null);
  };



  const handleSort = (column: string) => {
    if (orderBy === column) {
      setOrderDirection(orderDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(column);
      setOrderDirection('asc');
    }
  };

  const sortedBuildings = [...buildings].sort((a, b) => {
    let comparison = 0;
    switch (orderBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'address':
        comparison = a.address.localeCompare(b.address);
        break;
      case 'cuit':
        comparison = a.cuit.localeCompare(b.cuit);
        break;
      case 'contact':
        comparison = a.contact.localeCompare(b.contact);
        break;
      case 'taxCondition':
        comparison = a.taxCondition.localeCompare(b.taxCondition);
        break;
      case 'administrator':
        comparison = (a.administrator?.name || '').localeCompare(b.administrator?.name || '');
        break;
      case 'debtThreshold':
        comparison = (a.debtThreshold || 0) - (b.debtThreshold || 0);
        break;
      case 'locality':
        comparison = (a.locality || '').localeCompare(b.locality || '');
        break;
      case 'floors':
        comparison = (a.floors || 0) - (b.floors || 0);
        break;
      case 'balance':
        comparison = (a.account?.balance || 0) - (b.account?.balance || 0);
        break;
      default:
        comparison = 0;
    }
    return orderDirection === 'asc' ? comparison : -comparison;
  });

  const filteredBuildings = buildingFilter
    ? buildings.filter(b =>
        (b.administrator?.name && b.administrator.name.toLowerCase().includes(buildingFilter.toLowerCase())) ||
        (b.cuit && b.cuit.toLowerCase().includes(buildingFilter.toLowerCase())) ||
        (b.locality && b.locality.toLowerCase().includes(buildingFilter.toLowerCase())) ||
        (b.name && b.name.toLowerCase().includes(buildingFilter.toLowerCase()))
      )
    : buildings;

  return (
    <Box p={3}>
        <Typography variant="h4" mb={2}>Edificios</Typography>
        <Autocomplete
          options={Array.from(new Set([
            ...buildings.map(b => b.administrator?.name).filter(Boolean),
            ...buildings.map(b => b.cuit).filter(Boolean),
            ...buildings.map(b => b.locality).filter(Boolean),
            ...buildings.map(b => b.name).filter(Boolean)
          ]))}
          value={buildingFilter}
          onInputChange={(_, value) => setBuildingFilter(value)}
          renderInput={params => <TextField {...params} label="Buscar por nombre, administrador, CUIT o localidad" sx={{ mb: 2, maxWidth: 400 }} />}
          freeSolo
        />
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()} sx={{ mb: 2 }}>
          Nuevo Edificio
        </Button>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                  Nombre {orderBy === 'name' && (orderDirection === 'asc' ? '↑' : '↓')}
                </TableCell>
                <TableCell onClick={() => handleSort('address')} style={{ cursor: 'pointer' }}>
                  Dirección {orderBy === 'address' && (orderDirection === 'asc' ? '↑' : '↓')}
                </TableCell>
                <TableCell onClick={() => handleSort('cuit')} style={{ cursor: 'pointer' }}>
                  CUIT {orderBy === 'cuit' && (orderDirection === 'asc' ? '↑' : '↓')}
                </TableCell>
                <TableCell onClick={() => handleSort('contact')} style={{ cursor: 'pointer' }}>
                  Contacto {orderBy === 'contact' && (orderDirection === 'asc' ? '↑' : '↓')}
                </TableCell>
                <TableCell onClick={() => handleSort('taxCondition')} style={{ cursor: 'pointer' }}>
                  Condición Fiscal {orderBy === 'taxCondition' && (orderDirection === 'asc' ? '↑' : '↓')}
                </TableCell>
                <TableCell onClick={() => handleSort('administrator')} style={{ cursor: 'pointer' }}>
                  Administrador {orderBy === 'administrator' && (orderDirection === 'asc' ? '↑' : '↓')}
                </TableCell>
                <TableCell onClick={() => handleSort('debtThreshold')} style={{ cursor: 'pointer' }}>
                  Umbral Deuda {orderBy === 'debtThreshold' && (orderDirection === 'asc' ? '↑' : '↓')}
                </TableCell>
                <TableCell onClick={() => handleSort('locality')} style={{ cursor: 'pointer' }}>
                  Localidad {orderBy === 'locality' && (orderDirection === 'asc' ? '↑' : '↓')}
                </TableCell>
                <TableCell onClick={() => handleSort('floors')} style={{ cursor: 'pointer' }}>
                  Pisos {orderBy === 'floors' && (orderDirection === 'asc' ? '↑' : '↓')}
                </TableCell>
                <TableCell>Teléfonos</TableCell>
                <TableCell onClick={() => handleSort('balance')} style={{ cursor: 'pointer' }}>
                  Saldo {orderBy === 'balance' && (orderDirection === 'asc' ? '↑' : '↓')}
                </TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBuildings.map((building) => (
                <TableRow key={building.id}>
                  <TableCell>{building.name}</TableCell>
                  <TableCell>{building.address}</TableCell>
                  <TableCell>{building.cuit}</TableCell>
                  <TableCell>{building.contact}</TableCell>
                  <TableCell>{taxConditionLabels[building.taxCondition]}</TableCell>
                  <TableCell>{building.administrator?.name || '-'}</TableCell>
                  <TableCell>{building.debtThreshold || '-'} días</TableCell>
                  <TableCell>{building.locality || '-'}</TableCell>
                  <TableCell>{building.floors || '-'}</TableCell>
                  <TableCell>
                    {building.phones && building.phones.length > 0 ? (
                      <Box>
                        {building.phones.slice(0, 2).map((phone, index) => (
                          <Typography key={index} variant="body2" sx={{ fontSize: '0.75rem' }}>
                            {phone} {building.phoneNames && building.phoneNames[index] ? `(${building.phoneNames[index]})` : ''}
                          </Typography>
                        ))}
                        {building.phones.length > 2 && (
                          <Typography variant="caption" color="text.secondary">
                            +{building.phones.length - 2} más
                          </Typography>
                        )}
                      </Box>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{formatCurrency(building.account?.balance)}</TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleOpen(building)}><Edit /></IconButton>
                    <IconButton color="info" onClick={() => handleOpenAccount(building)} title="Cuenta corriente"><AccountBalance /></IconButton>
                    <IconButton color="error" onClick={() => handleDelete(building.id)}><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {/* Fila de total */}
              <TableRow sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>
                <TableCell colSpan={10} align="right" sx={{ fontWeight: 'bold' }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    SALDO TOTAL:
                  </Typography>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <Typography 
                    variant="subtitle1" 
                    fontWeight="bold"
                    color={filteredBuildings.reduce((sum, building) => sum + (building.account?.balance || 0), 0) < 0 ? 'error' : 'success'}
                  >
                    {formatCurrency(filteredBuildings.reduce((sum, building) => sum + (building.account?.balance || 0), 0))}
                  </Typography>
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
          <DialogTitle>{editing ? "Editar Edificio" : "Nuevo Edificio"}</DialogTitle>
          <form onSubmit={formik.handleSubmit}>
            <DialogContent>
              <TextField
                margin="dense"
                label="Nombre"
                name="name"
                fullWidth
                value={formik.values.name}
                onChange={formik.handleChange}
                error={formik.touched.name && Boolean(formik.errors.name)}
                helperText={formik.touched.name && formik.errors.name}
              />
              <TextField
                margin="dense"
                label="Dirección"
                name="address"
                fullWidth
                value={formik.values.address}
                onChange={formik.handleChange}
                error={formik.touched.address && Boolean(formik.errors.address)}
                helperText={formik.touched.address && formik.errors.address}
              />
              <TextField
                margin="dense"
                label="CUIT"
                name="cuit"
                fullWidth
                value={formik.values.cuit}
                onChange={formik.handleChange}
                error={formik.touched.cuit && Boolean(formik.errors.cuit)}
                helperText={formik.touched.cuit && formik.errors.cuit}
              />
              <TextField
                margin="dense"
                label="Contacto"
                name="contact"
                fullWidth
                value={formik.values.contact}
                onChange={formik.handleChange}
                error={formik.touched.contact && Boolean(formik.errors.contact)}
                helperText={formik.touched.contact && formik.errors.contact}
              />
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Condición Fiscal</InputLabel>
                <Select
                  name="taxCondition"
                  value={formik.values.taxCondition}
                  label="Condición Fiscal"
                  onChange={formik.handleChange}
                  error={formik.touched.taxCondition && Boolean(formik.errors.taxCondition)}
                >
                  {Object.entries(taxConditionLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Autocomplete
                options={administrators}
                getOptionLabel={(option) => option.name}
                value={administrators.find(admin => admin.id === formik.values.administratorId) || null}
                onChange={(_, newValue) => {
                  formik.setFieldValue('administratorId', newValue ? newValue.id : '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    margin="dense"
                    label="Administrador"
                    error={formik.touched.administratorId && Boolean(formik.errors.administratorId)}
                    helperText={formik.touched.administratorId && formik.errors.administratorId}
                  />
                )}
                fullWidth
                sx={{ mt: 2 }}
              />
              
              {/* Nuevos campos */}
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Información Adicional</Typography>
              
              <Box display="flex" gap={2}>
                <TextField
                  margin="dense"
                  label="Umbral por Deuda (días)"
                  name="debtThreshold"
                  type="number"
                  fullWidth
                  value={formik.values.debtThreshold}
                  onChange={formik.handleChange}
                  error={formik.touched.debtThreshold && Boolean(formik.errors.debtThreshold)}
                  helperText={formik.touched.debtThreshold && formik.errors.debtThreshold || "Días de atraso para notificar"}
                />
                
                <FormControl fullWidth>
                  <InputLabel>Calificación</InputLabel>
                  <Select
                    name="rating"
                    value={formik.values.rating}
                    label="Calificación"
                    onChange={formik.handleChange}
                    error={formik.touched.rating && Boolean(formik.errors.rating)}
                  >
                    <MenuItem value={1}>1</MenuItem>
                    <MenuItem value={2}>2</MenuItem>
                    <MenuItem value={3}>3</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <TextField
                margin="dense"
                label="Teléfono Encargado"
                name="managerPhone"
                fullWidth
                value={formik.values.managerPhone}
                onChange={formik.handleChange}
                error={formik.touched.managerPhone && Boolean(formik.errors.managerPhone)}
                helperText={formik.touched.managerPhone && formik.errors.managerPhone}
              />
              
              <TextField
                margin="dense"
                label="Información General"
                name="generalInfo"
                fullWidth
                multiline
                rows={3}
                value={formik.values.generalInfo}
                onChange={formik.handleChange}
                error={formik.touched.generalInfo && Boolean(formik.errors.generalInfo)}
                helperText={formik.touched.generalInfo && formik.errors.generalInfo}
              />
              
              <TextField
                margin="dense"
                label="Tipo de Portero"
                name="doormanType"
                fullWidth
                value={formik.values.doormanType}
                onChange={formik.handleChange}
                error={formik.touched.doormanType && Boolean(formik.errors.doormanType)}
                helperText={formik.touched.doormanType && formik.errors.doormanType}
              />
              
              <Box display="flex" gap={2}>
                <TextField
                  margin="dense"
                  label="Pisos"
                  name="floors"
                  type="number"
                  fullWidth
                  value={formik.values.floors}
                  onChange={formik.handleChange}
                  error={formik.touched.floors && Boolean(formik.errors.floors)}
                  helperText={formik.touched.floors && formik.errors.floors}
                />
                
                <TextField
                  margin="dense"
                  label="Deptos"
                  name="apartments"
                  type="number"
                  fullWidth
                  value={formik.values.apartments}
                  onChange={formik.handleChange}
                  error={formik.touched.apartments && Boolean(formik.errors.apartments)}
                  helperText={formik.touched.apartments && formik.errors.apartments}
                />
              </Box>
              
              <Autocomplete
                options={availableLocalities}
                value={formik.values.locality || null}
                onChange={(_, newValue) => {
                  formik.setFieldValue('locality', newValue || '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    margin="dense"
                    label="Localidad"
                    error={formik.touched.locality && Boolean(formik.errors.locality)}
                    helperText={formik.touched.locality && formik.errors.locality}
                  />
                )}
                freeSolo
                fullWidth
              />
              
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Teléfonos</Typography>
              {formik.values.phones.map((phone, index) => (
                <Box key={index} display="flex" gap={2} sx={{ mb: 1 }}>
                  <TextField
                    label={`Teléfono ${index + 1}`}
                    value={phone}
                    onChange={(e) => {
                      const newPhones = [...formik.values.phones];
                      newPhones[index] = e.target.value;
                      formik.setFieldValue('phones', newPhones);
                    }}
                    sx={{ flex: 1 }}
                    size="small"
                  />
                  <TextField
                    label={`Nombre ${index + 1}`}
                    value={formik.values.phoneNames[index] || ''}
                    onChange={(e) => {
                      const newPhoneNames = [...formik.values.phoneNames];
                      newPhoneNames[index] = e.target.value;
                      formik.setFieldValue('phoneNames', newPhoneNames);
                    }}
                    sx={{ flex: 1 }}
                    size="small"
                  />
                  <IconButton
                    color="error"
                    onClick={() => {
                      const newPhones = formik.values.phones.filter((_, i) => i !== index);
                      const newPhoneNames = formik.values.phoneNames.filter((_, i) => i !== index);
                      formik.setFieldValue('phones', newPhones);
                      formik.setFieldValue('phoneNames', newPhoneNames);
                    }}
                    size="small"
                  >
                    <Delete />
                  </IconButton>
                </Box>
              ))}
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  formik.setFieldValue('phones', [...formik.values.phones, '']);
                  formik.setFieldValue('phoneNames', [...formik.values.phoneNames, '']);
                }}
                sx={{ mt: 1 }}
              >
                + Agregar Teléfono
              </Button>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Cancelar</Button>
              <Button type="submit" variant="contained">{editing ? "Actualizar" : "Crear"}</Button>
            </DialogActions>
          </form>
        </Dialog>
        <BuildingAccountModal
          open={openAccount}
          onClose={handleCloseAccount}
          buildingId={selectedBuilding?.id || null}
          buildingName={selectedBuilding?.name}
        />

        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
  );
};

export default BuildingsPage; 