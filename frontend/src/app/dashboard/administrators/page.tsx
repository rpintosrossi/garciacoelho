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
import BuildingAccountModal from "./BuildingAccountModal";
import { formatCurrency } from '@/utils/formatCurrency';
import { useCommonData } from '@/contexts/CommonDataContext';
import { cachedApi } from '@/lib/axios';

interface Administrator {
  id: string;
  name: string;
  email: string;
  phone: string;
  phones?: string[];
  phoneNames?: string[];
  emails?: string[];
  emailNames?: string[];
  createdAt: string;
  updatedAt: string;
  saldoTotal?: number;
}

const validationSchema = Yup.object({
  name: Yup.string().required("El nombre es obligatorio"),
  email: Yup.string().email("Email inválido").required("El email es obligatorio"),
  phone: Yup.string().required("El teléfono es obligatorio"),
  phones: Yup.array().of(Yup.string()),
  phoneNames: Yup.array().of(Yup.string()),
  emails: Yup.array().of(Yup.string().email("Email inválido")),
  emailNames: Yup.array().of(Yup.string()),
});

const AdministratorsPage = () => {
  const { administrators, refreshData } = useCommonData();
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
  const [openBuildingAccount, setOpenBuildingAccount] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [adminFilter, setAdminFilter] = useState('');

  useEffect(() => {
    if (openAccount && selectedAdmin) {
      setLoadingBuildings(true);
      const token = localStorage.getItem("token");
      api.get(`/administrators/${selectedAdmin.id}/buildings-balances`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => setBuildings(res.data))
        .catch((error) => {
          setSnackbar({ 
            open: true, 
            message: "Error al cargar edificios", 
            severity: "error" 
          });
        })
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
      phones: editing?.phones || [],
      phoneNames: editing?.phoneNames || [],
      emails: editing?.emails || [],
      emailNames: editing?.emailNames || [],
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
        // Limpiar caché y refrescar datos del contexto
        cachedApi.clearCacheFor('/administrators');
        await refreshData();
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
      // Limpiar caché y refrescar datos del contexto
      cachedApi.clearCacheFor('/administrators');
      await refreshData();
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

  const handleOpenBuildingAccount = (building: any) => {
    setSelectedBuilding(building);
    setOpenBuildingAccount(true);
  };

  const handleCloseBuildingAccount = () => {
    setOpenBuildingAccount(false);
    setSelectedBuilding(null);
  };

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
              <TableCell>Teléfonos Adicionales</TableCell>
              <TableCell>Emails Adicionales</TableCell>
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
                <TableCell>
                  {administrator.phones && administrator.phones.length > 0 ? (
                    <Box>
                      {administrator.phones.slice(0, 2).map((phone, index) => (
                        <Typography key={index} variant="body2" sx={{ fontSize: '0.75rem' }}>
                          {phone} {administrator.phoneNames && administrator.phoneNames[index] ? `(${administrator.phoneNames[index]})` : ''}
                        </Typography>
                      ))}
                      {administrator.phones.length > 2 && (
                        <Typography variant="caption" color="text.secondary">
                          +{administrator.phones.length - 2} más
                        </Typography>
                      )}
                    </Box>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {administrator.emails && administrator.emails.length > 0 ? (
                    <Box>
                      {administrator.emails.slice(0, 2).map((email, index) => (
                        <Typography key={index} variant="body2" sx={{ fontSize: '0.75rem' }}>
                          {email} {administrator.emailNames && administrator.emailNames[index] ? `(${administrator.emailNames[index]})` : ''}
                        </Typography>
                      ))}
                      {administrator.emails.length > 2 && (
                        <Typography variant="caption" color="text.secondary">
                          +{administrator.emails.length - 2} más
                        </Typography>
                      )}
                    </Box>
                  ) : '-'}
                </TableCell>
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
              <TableCell colSpan={5} align="right" sx={{ fontWeight: 'bold' }}>
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
            
            {/* Teléfonos adicionales */}
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Teléfonos Adicionales</Typography>
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
              sx={{ mt: 1, mb: 2 }}
            >
              + Agregar Teléfono
            </Button>
            
            {/* Emails adicionales */}
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Emails Adicionales</Typography>
            {formik.values.emails.map((email, index) => (
              <Box key={index} display="flex" gap={2} sx={{ mb: 1 }}>
                <TextField
                  label={`Email ${index + 1}`}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    const newEmails = [...formik.values.emails];
                    newEmails[index] = e.target.value;
                    formik.setFieldValue('emails', newEmails);
                  }}
                  sx={{ flex: 1 }}
                  size="small"
                />
                <TextField
                  label={`Nombre ${index + 1}`}
                  value={formik.values.emailNames[index] || ''}
                  onChange={(e) => {
                    const newEmailNames = [...formik.values.emailNames];
                    newEmailNames[index] = e.target.value;
                    formik.setFieldValue('emailNames', newEmailNames);
                  }}
                  sx={{ flex: 1 }}
                  size="small"
                />
                <IconButton
                  color="error"
                  onClick={() => {
                    const newEmails = formik.values.emails.filter((_, i) => i !== index);
                    const newEmailNames = formik.values.emailNames.filter((_, i) => i !== index);
                    formik.setFieldValue('emails', newEmails);
                    formik.setFieldValue('emailNames', newEmailNames);
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
                formik.setFieldValue('emails', [...formik.values.emails, '']);
                formik.setFieldValue('emailNames', [...formik.values.emailNames, '']);
              }}
              sx={{ mt: 1 }}
            >
              + Agregar Email
            </Button>
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
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {buildings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.name}</TableCell>
                      <TableCell>{b.address}</TableCell>
                      <TableCell>{formatCurrency(b.account?.balance)}</TableCell>
                      <TableCell>
                        <IconButton 
                          color="primary" 
                          onClick={() => handleOpenBuildingAccount(b)}
                          title="Ver detalles de cuenta"
                          size="small"
                        >
                          <AccountBalance />
                        </IconButton>
                      </TableCell>
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
      
      {/* Modal para detalles de cuenta de edificio */}
      <BuildingAccountModal
        open={openBuildingAccount}
        onClose={handleCloseBuildingAccount}
        buildingId={selectedBuilding?.id || null}
        buildingName={selectedBuilding?.name}
      />
      
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