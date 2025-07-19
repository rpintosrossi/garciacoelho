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
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { formatCurrency } from '@/utils/formatCurrency';

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
}

interface Document {
  id: string;
  type: 'FACTURA' | 'REMITO';
  amount: number;
  date?: string;
}

interface InvoiceAmounts {
  [key: string]: string;
}

const validationSchema = Yup.object({
  name: Yup.string().required("El nombre es obligatorio"),
  address: Yup.string().required("La dirección es obligatoria"),
  cuit: Yup.string().required("El CUIT es obligatorio"),
  contact: Yup.string().required("El contacto es obligatorio"),
  taxCondition: Yup.string().required("La condición fiscal es obligatoria"),
  administratorId: Yup.string().required("El administrador es obligatorio"),
});

const taxConditionLabels: Record<string, string> = {
  RESPONSABLE_INSCRIPTO: "Responsable Inscripto",
  MONOTRIBUTO: "Monotributo",
  EXENTO: "Exento",
  CONSUMIDOR_FINAL: "Consumidor Final",
};

const BuildingsPage = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Building | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const [openAccount, setOpenAccount] = useState(false);
  const [accountData, setAccountData] = useState<any>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [filterFrom, setFilterFrom] = useState<Date | null>(null);
  const [filterTo, setFilterTo] = useState<Date | null>(null);
  const [openPayment, setOpenPayment] = useState(false);
  const [paymentDate, setPaymentDate] = useState<Date | null>(new Date());
  const [paymentAmount, setPaymentAmount] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState<'manual' | 'percentage'>('manual');
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Document[]>([]);
  const [savingPayment, setSavingPayment] = useState(false);
  const [orderBy, setOrderBy] = useState<string>('name');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');
  const [invoiceAmounts, setInvoiceAmounts] = useState<InvoiceAmounts>({});
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
      const res = await api.get("/administrators", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdministrators(res.data);
    } catch (error) {
      setSnackbar({ open: true, message: "Error al cargar administradores", severity: "error" });
    }
  };

  const fetchMovements = async (buildingId: string, type?: string, from?: Date | null, to?: Date | null) => {
    setLoadingMovements(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (from) params.append('from', from.toISOString().slice(0, 10));
      if (to) params.append('to', to.toISOString().slice(0, 10));
      const res = await api.get(`/buildings/${buildingId}/account-movements?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMovements(res.data);
    } catch {
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
    fetchAdministrators();
  }, []);

  useEffect(() => {
    if (openAccount && selectedBuilding) {
      fetchMovements(selectedBuilding.id);
    }
  }, [openAccount, selectedBuilding]);

  useEffect(() => {
    if (openPayment && selectedBuilding) {
      const fetchData = async () => {
        try {
          const token = localStorage.getItem('token');
          const [methodsRes, invoicesRes] = await Promise.all([
            api.get('/payment-methods', { headers: { Authorization: `Bearer ${token}` } }),
            api.get(`/buildings/${selectedBuilding.id}/pending-invoices`, { headers: { Authorization: `Bearer ${token}` } })
          ]);
          setPaymentMethods(methodsRes.data);
          setPendingInvoices(invoicesRes.data);
        } catch {
          setPaymentMethods([]);
          setPendingInvoices([]);
        }
      };
      fetchData();
      setPaymentDate(new Date());
      setPaymentAmount('');
      setOriginalAmount('');
      setDiscount('');
      setDiscountType('manual');
      setDiscountPercentage(0);
      setDiscountReason('');
      setPaymentMethod(null);
      setSelectedInvoices([]);
    }
  }, [openPayment, selectedBuilding]);

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

  const handleOpenAccount = async (building: Building) => {
    setSelectedBuilding(building);
    setOpenAccount(true);
    setLoadingAccount(true);
    try {
      const token = localStorage.getItem('token');
      const res = await api.get(`/buildings/${building.id}/account`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAccountData(res.data);
    } catch (error) {
      setAccountData(null);
    } finally {
      setLoadingAccount(false);
    }
  };

  const handleCloseAccount = () => {
    setOpenAccount(false);
    setAccountData(null);
    setSelectedBuilding(null);
  };

  const handleApplyFilters = () => {
    if (selectedBuilding) {
      fetchMovements(selectedBuilding.id, filterType, filterFrom, filterTo);
    }
  };

  const handleOpenPayment = () => setOpenPayment(true);
  const handleClosePayment = () => setOpenPayment(false);

  const handleInvoiceAmountChange = (docId: string, amount: string) => {
    setInvoiceAmounts(prev => ({
      ...prev,
      [docId]: amount
    }));
  };

  // Calcular monto original basado en documentos seleccionados
  const calculateOriginalAmount = () => {
    return selectedInvoices.reduce((sum, doc) => {
      const amount = invoiceAmounts[doc.id] || doc.amount;
      const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      return sum + (numericAmount || 0);
    }, 0);
  };

  // Calcular descuento basado en tipo y valor
  const calculateDiscount = () => {
    const original = calculateOriginalAmount();
    if (discountType === 'percentage') {
      return (original * discountPercentage) / 100;
    }
    return parseFloat(discount) || 0;
  };

  // Calcular monto final
  const calculateFinalAmount = () => {
    const original = calculateOriginalAmount();
    const discountAmount = calculateDiscount();
    return original - discountAmount;
  };

  // Actualizar monto original cuando cambian los documentos seleccionados
  useEffect(() => {
    const original = calculateOriginalAmount();
    setOriginalAmount(original.toString());
    setPaymentAmount(calculateFinalAmount().toString());
  }, [selectedInvoices, invoiceAmounts, discount, discountPercentage, discountType]);

  // Actualizar descuento cuando cambia el porcentaje
  useEffect(() => {
    if (discountType === 'percentage') {
      const original = calculateOriginalAmount();
      const discountAmount = (original * discountPercentage) / 100;
      setDiscount(discountAmount.toString());
    }
  }, [discountPercentage, discountType, selectedInvoices, invoiceAmounts]);

  const handleSavePayment = async () => {
    if (!selectedBuilding) return;
    
    try {
      const token = localStorage.getItem('token');
      const originalAmount = calculateOriginalAmount();
      const discountAmount = calculateDiscount();
      const finalAmount = calculateFinalAmount();

      // Calcular el factor de descuento para aplicar proporcionalmente a cada documento
      const discountFactor = discountAmount > 0 ? (finalAmount / originalAmount) : 1;

      const docsToAssociate = selectedInvoices.map(doc => {
        const originalDocAmount = parseFloat(invoiceAmounts[doc.id] || doc.amount.toString());
        const adjustedAmount = originalDocAmount * discountFactor;
        
        return {
          id: doc.id,
          type: doc.type,
          amount: adjustedAmount
        };
      });

      await api.post('/payments', {
        amount: finalAmount,
        originalAmount: originalAmount,
        discount: discountAmount,
        discountReason: discountReason || null,
        date: paymentDate,
        paymentMethodId: paymentMethod.id,
        docsToAssociate
      }, { headers: { Authorization: `Bearer ${token}` } });

      handleClosePayment();
      fetchMovements(selectedBuilding.id);
    } catch (error) {
      console.error('Error al guardar pago:', error);
      // Aquí podrías mostrar un mensaje de error al usuario
    }
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
        (b.cuit && b.cuit.toLowerCase().includes(buildingFilter.toLowerCase()))
      )
    : buildings;

  return (
    <Container>
      <Box p={3}>
        <Typography variant="h4" mb={2}>Edificios</Typography>
        <Autocomplete
          options={Array.from(new Set([
            ...buildings.map(b => b.administrator?.name).filter(Boolean),
            ...buildings.map(b => b.cuit).filter(Boolean)
          ]))}
          value={buildingFilter}
          onInputChange={(_, value) => setBuildingFilter(value)}
          renderInput={params => <TextField {...params} label="Buscar por administrador o CUIT" sx={{ mb: 2, maxWidth: 400 }} />}
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
                <TableCell colSpan={6} align="right" sx={{ fontWeight: 'bold' }}>
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
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Administrador</InputLabel>
                <Select
                  name="administratorId"
                  value={formik.values.administratorId}
                  label="Administrador"
                  onChange={formik.handleChange}
                  error={formik.touched.administratorId && Boolean(formik.errors.administratorId)}
                >
                  {administrators.map((admin) => (
                    <MenuItem key={admin.id} value={admin.id}>{admin.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Cancelar</Button>
              <Button type="submit" variant="contained">{editing ? "Actualizar" : "Crear"}</Button>
            </DialogActions>
          </form>
        </Dialog>
        <Dialog open={openAccount} onClose={handleCloseAccount} fullWidth maxWidth="md">
          <DialogTitle>Cuenta corriente de {selectedBuilding?.name}</DialogTitle>
          <DialogContent>
            <Box mb={2} display="flex" gap={2} alignItems="center">
              <Button variant="contained" onClick={handleOpenPayment}>Ingresar Pago</Button>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Tipo</InputLabel>
                <Select value={filterType} label="Tipo" onChange={e => setFilterType(e.target.value)}>
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="FACTURA">Factura</MenuItem>
                  <MenuItem value="REMITO">Remito</MenuItem>
                  <MenuItem value="PAGO">Pago</MenuItem>
                </Select>
              </FormControl>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker label="Desde" value={filterFrom} onChange={setFilterFrom} slotProps={{ textField: { size: 'small' } }} />
                <DatePicker label="Hasta" value={filterTo} onChange={setFilterTo} slotProps={{ textField: { size: 'small' } }} />
              </LocalizationProvider>
              <Button variant="outlined" onClick={handleApplyFilters}>Filtrar</Button>
            </Box>
            {loadingMovements ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px"><Typography>Cargando movimientos...</Typography></Box>
            ) : (
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>N° Comprobante</TableCell>
                      <TableCell>Monto</TableCell>
                      <TableCell>Medio de Pago</TableCell>
                      <TableCell>Documentos Asociados</TableCell>
                      <TableCell>Descuento</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {movements.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{new Date(row.fecha).toLocaleDateString()}</TableCell>
                        <TableCell>{row.tipo}</TableCell>
                        <TableCell>{row.comprobante}</TableCell>
                        <TableCell align="right">
                          {row.monto >= 0 
                            ? `+${formatCurrency(row.monto)}` 
                            : `-${formatCurrency(Math.abs(row.monto))}`}
                        </TableCell>
                        <TableCell>{row.tipo === 'PAGO' ? row.extra?.medio : '-'}</TableCell>
                        <TableCell>{row.tipo === 'PAGO' ? row.extra?.documentos : '-'}</TableCell>
                        <TableCell>
                          {row.tipo === 'PAGO' && row.extra?.descuento ? (
                            <Box>
                              <Typography variant="body2" color="error">
                                -{formatCurrency(row.extra.descuento.monto)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {row.extra.descuento.razon || 'Descuento'}
                              </Typography>
                            </Box>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1}>
              <Typography variant="h6">Saldo a favor:</Typography>
              <Typography variant="h6" color={movements.length && movements[movements.length-1].saldoParcial < 0 ? 'error' : 'success'}>
                {formatCurrency(movements.length ? movements[movements.length-1].saldoParcial : 0)}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAccount}>Cerrar</Button>
          </DialogActions>
        </Dialog>
        <Dialog open={openPayment} onClose={handleClosePayment} fullWidth maxWidth="sm">
          <DialogTitle>Ingresar Pago</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker label="Fecha de pago" value={paymentDate} onChange={setPaymentDate} slotProps={{ textField: { fullWidth: true } }} />
              </LocalizationProvider>
              <TextField 
                label="Monto original" 
                type="number" 
                value={originalAmount} 
                InputProps={{ readOnly: true }}
                helperText="Calculado automáticamente de las facturas seleccionadas"
                fullWidth 
              />
              <Autocomplete
                options={paymentMethods}
                getOptionLabel={option => option.name}
                value={paymentMethod}
                onChange={(_, value) => setPaymentMethod(value)}
                renderInput={params => <TextField {...params} label="Medio de pago" fullWidth />}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
              
              {/* Campos de descuento */}
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Descuento (opcional)
                </Typography>
                <Box display="flex" gap={2} alignItems="flex-end">
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Tipo de descuento</InputLabel>
                    <Select
                      value={discountType}
                      label="Tipo de descuento"
                      onChange={(e) => setDiscountType(e.target.value as 'manual' | 'percentage')}
                    >
                      <MenuItem value="manual">Monto fijo</MenuItem>
                      <MenuItem value="percentage">Porcentaje</MenuItem>
                    </Select>
                  </FormControl>
                  
                  {discountType === 'manual' ? (
                    <TextField
                      label="Descuento"
                      type="number"
                      value={discount}
                      onChange={e => setDiscount(e.target.value)}
                      
                      sx={{ flex: 1 }}
                    />
                  ) : (
                    <FormControl sx={{ flex: 1 }}>
                      <InputLabel>Porcentaje</InputLabel>
                      <Select
                        value={discountPercentage}
                        label="Porcentaje"
                        onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                      >
                        <MenuItem value={5}>5%</MenuItem>
                        <MenuItem value={10}>10%</MenuItem>
                        <MenuItem value={15}>15%</MenuItem>
                        <MenuItem value={20}>20%</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                  
                  <TextField
                    label="Razón del descuento"
                    value={discountReason}
                    onChange={e => setDiscountReason(e.target.value)}
                    placeholder="ej: coima, descuento comercial"
                    sx={{ flex: 2 }}
                  />
                </Box>
                
                {/* Resumen del descuento */}
                {(parseFloat(discount) > 0 || discountPercentage > 0) && (
                  <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Resumen:</strong> Monto original {formatCurrency(parseFloat(originalAmount))} - 
                      Descuento {formatCurrency(calculateDiscount())} = 
                      <strong> Monto final {formatCurrency(calculateFinalAmount())}</strong>
                    </Typography>
                  </Box>
                )}
              </Box>
              <Autocomplete
                multiple
                options={pendingInvoices}
                getOptionLabel={option => {
                  const tipo = option.type === 'REMITO' ? 'Remito' : 'Factura';
                  const fecha = option.date ? new Date(option.date).toLocaleDateString() : '-';
                  return `${tipo} - ${fecha} - ${formatCurrency(option.amount)}`;
                }}
                value={selectedInvoices}
                onChange={(_, value) => setSelectedInvoices(value)}
                renderInput={params => <TextField {...params} label="Facturas a asociar (opcional)" fullWidth />}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    {option.type === 'REMITO' ? 'Remito' : 'Factura'} - {option.date ? new Date(option.date).toLocaleDateString() : '-'} - {formatCurrency(option.amount)}
                  </li>
                )}
              />
              {selectedInvoices.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle1" gutterBottom>
                    Montos por documento
                  </Typography>
                  {selectedInvoices.map(doc => (
                    <Box key={doc.id} display="flex" alignItems="center" gap={2} mb={1}>
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {doc.type === 'REMITO' ? 'Remito' : 'Factura'} - {formatCurrency(doc.amount)}
                      </Typography>
                      <TextField
                        size="small"
                        type="number"
                        label="Monto a aplicar"
                        value={invoiceAmounts[doc.id] || ''}
                        onChange={(e) => handleInvoiceAmountChange(doc.id, e.target.value)}
                        inputProps={{ max: doc.amount }}
                        sx={{ width: 150 }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePayment}>Cancelar</Button>
            <Button onClick={handleSavePayment} variant="contained" color="primary">
              Guardar
            </Button>
          </DialogActions>
        </Dialog>
        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default BuildingsPage; 