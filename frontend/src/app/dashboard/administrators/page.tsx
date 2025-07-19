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
  Autocomplete,
} from "@mui/material";
import { Add, Edit, Delete, AccountBalance, Payment } from "@mui/icons-material";
import { useFormik } from "formik";
import * as Yup from "yup";
import MassivePaymentModal from "./MassivePaymentModal";
import { formatCurrency } from '@/utils/formatCurrency';

interface Administrator {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  saldoTotal: number;
}

const validationSchema = Yup.object({
  name: Yup.string().required("El nombre es obligatorio"),
  email: Yup.string().email("Email inválido").required("El email es obligatorio"),
  phone: Yup.string().required("El teléfono es obligatorio"),
});

const AdministratorsPage = () => {
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Administrator | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ 
    open: false, 
    message: "", 
    severity: "success" 
  });
  const [openAccount, setOpenAccount] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Administrator | null>(null);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [openMassivePayment, setOpenMassivePayment] = useState(false);
  const [adminFilter, setAdminFilter] = useState('');

  const fetchAdministrators = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/administrators", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdministrators(res.data);
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: "Error al cargar administradores", 
        severity: "error" 
      });
    }
  };

  useEffect(() => {
    fetchAdministrators();
  }, []);

  useEffect(() => {
    if (openAccount && selectedAdmin) {
      setLoadingBuildings(true);
      const token = localStorage.getItem("token");
      api.get(`/administrators/${selectedAdmin.id}/buildings-balances`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => setBuildings(res.data))
        .catch(() => setBuildings([]))
        .finally(() => setLoadingBuildings(false));
    }
  }, [openAccount, selectedAdmin]);

  const handleOpen = (administrator?: Administrator) => {
    setEditing(administrator || null);
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
      email: editing?.email || "",
      phone: editing?.phone || "",
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values) => {
      try {
        const token = localStorage.getItem("token");
        if (editing) {
          await api.put(`/administrators/${editing.id}`, values, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSnackbar({ 
            open: true, 
            message: "Administrador actualizado", 
            severity: "success" 
          });
        } else {
          await api.post("/administrators", values, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSnackbar({ 
            open: true, 
            message: "Administrador creado", 
            severity: "success" 
          });
        }
        fetchAdministrators();
        handleClose();
      } catch (error: any) {
        setSnackbar({ 
          open: true, 
          message: error?.response?.data?.message || "Error al guardar", 
          severity: "error" 
        });
      }
    },
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este administrador?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/administrators/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSnackbar({ 
        open: true, 
        message: "Administrador eliminado", 
        severity: "success" 
      });
      fetchAdministrators();
    } catch (error: any) {
      setSnackbar({ 
        open: true, 
        message: error?.response?.data?.message || "Error al eliminar", 
        severity: "error" 
      });
    }
  };

  const handleOpenAccount = (administrator: Administrator) => {
    setSelectedAdmin(administrator);
    setOpenAccount(true);
  };

  const handleCloseAccount = () => {
    setOpenAccount(false);
    setSelectedAdmin(null);
  };

  const handleOpenMassivePayment = () => setOpenMassivePayment(true);
  const handleCloseMassivePayment = () => setOpenMassivePayment(false);

  // Función para calcular el saldo total de un administrador
  const getAdminBalance = (adminId: string) => {
    return buildings
      .filter((b) => b.administratorId === adminId)
      .reduce((sum, b) => sum + (b.account?.balance || 0), 0);
  };

  const filteredAdministrators = adminFilter
    ? administrators.filter(a => a.name.toLowerCase().includes(adminFilter.toLowerCase()))
    : administrators;

  return (
    <Box p={3}>
      <Typography variant="h4" mb={2}>Administradores</Typography>
      <Autocomplete
        options={administrators.map(a => a.name)}
        value={adminFilter}
        onInputChange={(_, value) => setAdminFilter(value)}
        renderInput={params => <TextField {...params} label="Buscar administrador" sx={{ mb: 2, maxWidth: 400 }} />}
        freeSolo
      />
      <Button 
        variant="contained" 
        startIcon={<Add />} 
        onClick={() => handleOpen()} 
        sx={{ mb: 2 }}
      >
        Nuevo Administrador
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell>Saldo</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAdministrators.map((administrator) => (
              <TableRow key={administrator.id}>
                <TableCell>{administrator.name}</TableCell>
                <TableCell>{administrator.email}</TableCell>
                <TableCell>{administrator.phone}</TableCell>
                <TableCell>{formatCurrency(administrator.saldoTotal)}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpen(administrator)}>
                    <Edit />
                  </IconButton>
                  <IconButton color="info" onClick={() => handleOpenAccount(administrator)} title="Cuenta corriente">
                    <AccountBalance />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDelete(administrator.id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {/* Fila de total */}
            <TableRow sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>
              <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  SALDO TOTAL:
                </Typography>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <Typography 
                  variant="subtitle1" 
                  fontWeight="bold"
                  color={filteredAdministrators.reduce((sum, admin) => sum + (admin.saldoTotal || 0), 0) < 0 ? 'error' : 'success'}
                >
                  {formatCurrency(filteredAdministrators.reduce((sum, admin) => sum + (admin.saldoTotal || 0), 0))}
                </Typography>
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          {editing ? "Editar Administrador" : "Nuevo Administrador"}
        </DialogTitle>
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
              label="Email"
              name="email"
              type="email"
              fullWidth
              value={formik.values.email}
              onChange={formik.handleChange}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
            />
            <TextField
              margin="dense"
              label="Teléfono"
              name="phone"
              fullWidth
              value={formik.values.phone}
              onChange={formik.handleChange}
              error={formik.touched.phone && Boolean(formik.errors.phone)}
              helperText={formik.touched.phone && formik.errors.phone}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button type="submit" variant="contained">
              {editing ? "Actualizar" : "Crear"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog open={openAccount} onClose={handleCloseAccount} fullWidth maxWidth="md">
        <DialogTitle>Cuenta corriente de {selectedAdmin?.name}</DialogTitle>
        <DialogContent>
          <Box mb={2} display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              color="secondary"
              startIcon={<Payment />}
              onClick={handleOpenMassivePayment}
              disabled={loadingBuildings || buildings.length === 0}
            >
              Ingresar pago para varios edificios
            </Button>
          </Box>
          {loadingBuildings ? (
            <Typography>Cargando edificios...</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Edificio</TableCell>
                    <TableCell>Dirección</TableCell>
                    <TableCell>Saldo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {buildings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.name}</TableCell>
                      <TableCell>{b.address}</TableCell>
                      <TableCell>{formatCurrency(b.account?.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {!loadingBuildings && buildings.length > 0 && (
            <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1} mt={2}>
              <Typography variant="h6">Saldo final:</Typography>
              <Typography variant="h6" color={buildings.reduce((sum, b) => sum + (b.account?.balance || 0), 0) < 0 ? 'error' : 'success'}>
                {formatCurrency(buildings.reduce((sum, b) => sum + (b.account?.balance || 0), 0))}
              </Typography>
            </Box>
          )}
          <MassivePaymentModal
            open={openMassivePayment}
            onClose={handleCloseMassivePayment}
            adminId={selectedAdmin?.id || ""}
            onSuccess={() => {
              // Refrescar edificios al guardar un pago masivo
              const token = localStorage.getItem("token");
              setLoadingBuildings(true);
              api.get(`/administrators/${selectedAdmin?.id}/buildings-balances`, {
                headers: { Authorization: `Bearer ${token}` },
              })
                .then(res => setBuildings(res.data))
                .catch(() => setBuildings([]))
                .finally(() => setLoadingBuildings(false));
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAccount}>Cerrar</Button>
        </DialogActions>
      </Dialog>
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdministratorsPage; 