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
import { Add, Edit, Delete, AccountBalance, Payment, Apartment, PictureAsPdf } from "@mui/icons-material";
import { jsPDF } from "jspdf";
import MassivePaymentModal from "./MassivePaymentModal";
import BuildingAccountModal from "./BuildingAccountModal";
import AdministratorFormModal from "./AdministratorFormModal";
import { formatCurrency } from '@/utils/formatCurrency';
import { cachedApi } from '@/lib/axios';
import { Pagination } from "@mui/material";

interface Administrator {
  id: string;
  name: string;
  administratorName?: string;
  email: string;
  phone: string;
  cuit?: string;
  phones?: string[];
  phoneNames?: string[];
  emails?: string[];
  emailNames?: string[];
  officeAddress?: string;
  createdAt: string;
  updatedAt: string;
  saldoTotal?: number;
}


const AdministratorsPage = () => {
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Administrator | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ 
    open: false, 
    message: "", 
    severity: "success" 
  });
  const [openAccount, setOpenAccount] = useState(false);
  const [openBuildingsList, setOpenBuildingsList] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Administrator | null>(null);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [openMassivePayment, setOpenMassivePayment] = useState(false);
  const [openBuildingAccount, setOpenBuildingAccount] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [adminFilter, setAdminFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');

  useEffect(() => {
    fetchAdministrators();
  }, [pagination.page, debouncedFilter]);

  const fetchAdministrators = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const searchParam = debouncedFilter ? `&search=${encodeURIComponent(debouncedFilter)}` : '';
      const res = await api.get(`/administrators?page=${pagination.page}&limit=${pagination.limit}${searchParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdministrators(res.data.administrators);
      setPagination(res.data.pagination);
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: "Error al cargar administradores", 
        severity: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminBuildings = async (adminId: string) => {
    setLoadingBuildings(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/administrators/${adminId}/buildings-balances`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBuildings(res.data);
    } catch {
      setBuildings([]);
      setSnackbar({
        open: true,
        message: "Error al cargar edificios",
        severity: "error",
      });
    } finally {
      setLoadingBuildings(false);
    }
  };

  useEffect(() => {
    if ((openAccount || openBuildingsList) && selectedAdmin) {
      fetchAdminBuildings(selectedAdmin.id);
    }
  }, [openAccount, openBuildingsList, selectedAdmin]);

  const handleOpen = (administrator?: Administrator) => {
    setEditing(administrator || null);
    setOpen(true);
  };

  const handleError = (message: string) => {
    setSnackbar({ 
      open: true, 
      message, 
      severity: "error" 
    });
  };

  const handleSuccess = (message: string) => {
    setSnackbar({ 
      open: true, 
      message, 
      severity: "success" 
    });
    fetchAdministrators();
  };

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
      // Limpiar caché y refrescar datos
      cachedApi.clearCacheFor('/administrators');
      await fetchAdministrators();
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
    setBuildings([]);
  };

  const handleOpenBuildingsList = (administrator: Administrator) => {
    setSelectedAdmin(administrator);
    setOpenBuildingsList(true);
  };

  const handleCloseBuildingsList = () => {
    setOpenBuildingsList(false);
    setSelectedAdmin(null);
    setBuildings([]);
  };

  const handleDownloadBuildingsPdf = async () => {
    if (!selectedAdmin || buildings.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const today = new Date().toLocaleDateString('es-AR');

    let logoImg: HTMLImageElement | null = null;
    try {
      const imgEl = new Image();
      imgEl.src = '/logo.png';
      await new Promise<void>((resolve) => {
        imgEl.onload = () => { logoImg = imgEl; resolve(); };
        imgEl.onerror = () => resolve();
      });
    } catch (_) { /* logo no crítico */ }

    const colWidths = {
      name: 55,
      address: 70,
      cuit: 35,
      locality: 45,
      balance: 40,
    };
    const tableStartX = margin;

    const drawHeader = (): number => {
      let y = 10;

      if (logoImg) {
        const logoW = 40;
        const logoH = logoImg.naturalWidth > 0
          ? (logoImg.naturalHeight / logoImg.naturalWidth) * logoW
          : 16;
        doc.addImage(logoImg, 'PNG', margin, y, logoW, logoH);
        y += logoH + 4;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Edificios de ${selectedAdmin.name}`, pageW / 2, y, { align: 'center' });
      y += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha: ${today}`, margin, y);
      doc.text(`${buildings.length} edificio${buildings.length !== 1 ? 's' : ''}`, pageW - margin, y, { align: 'right' });
      y += 8;
      return y;
    };

    const drawTableHeader = (y: number): number => {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, pageW - margin * 2, 8, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      let x = tableStartX + 1;
      doc.text('Edificio', x, y + 5.5);
      x += colWidths.name;
      doc.text('Dirección', x, y + 5.5);
      x += colWidths.address;
      doc.text('CUIT', x, y + 5.5);
      x += colWidths.cuit;
      doc.text('Localidad', x, y + 5.5);
      x += colWidths.locality;
      doc.text('Saldo', x + colWidths.balance - 2, y + 5.5, { align: 'right' });
      return y + 11;
    };

    let y = drawHeader();
    y = drawTableHeader(y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    buildings.forEach((b) => {
      const nameLines = doc.splitTextToSize(b.name || '-', colWidths.name - 2);
      const addressLines = doc.splitTextToSize(b.address || '-', colWidths.address - 2);
      const localityLines = doc.splitTextToSize(b.locality || '-', colWidths.locality - 2);
      const rowH = Math.max(nameLines.length, addressLines.length, localityLines.length, 1) * 4.5 + 3;

      if (y + rowH > pageH - 20) {
        doc.addPage();
        y = 14;
        y = drawTableHeader(y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
      }

      let x = tableStartX + 1;
      doc.text(nameLines, x, y);
      x += colWidths.name;
      doc.text(addressLines, x, y);
      x += colWidths.address;
      doc.text(b.cuit || '-', x, y);
      x += colWidths.cuit;
      doc.text(localityLines, x, y);
      x += colWidths.locality;
      doc.text(formatCurrency(b.account?.balance), x + colWidths.balance - 2, y, { align: 'right' });

      y += rowH;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y - 2, pageW - margin, y - 2);
    });

    const totalBalance = buildings.reduce((sum, b) => sum + (b.account?.balance || 0), 0);
    if (y + 12 > pageH - 14) {
      doc.addPage();
      y = 20;
    } else {
      y += 6;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Saldo total:', pageW - margin - 50, y, { align: 'right' });
    doc.text(formatCurrency(totalBalance), pageW - margin, y, { align: 'right' });

    const safeName = selectedAdmin.name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').replace(/\s+/g, '_');
    doc.save(`Edificios_${safeName}.pdf`);
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

  // Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilter(adminFilter);
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [adminFilter]);

  return (
    <Box p={3}>
      <Typography variant="h4" mb={2}>Administradores</Typography>
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <Typography>Cargando...</Typography>
        </Box>
      ) : (
        <>
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
              <TableCell>CUIT</TableCell>
              <TableCell>Saldo</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {administrators.map((administrator) => (
              <TableRow key={administrator.id}>
                <TableCell>{administrator.name}</TableCell>
                <TableCell>{administrator.email}</TableCell>
                <TableCell>{administrator.phone || '-'}</TableCell>
                <TableCell>{administrator.cuit || '-'}</TableCell>
                <TableCell>{formatCurrency(administrator.saldoTotal)}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpen(administrator)} title="Editar">
                    <Edit />
                  </IconButton>
                  <IconButton
                    color="secondary"
                    onClick={() => handleOpenBuildingsList(administrator)}
                    title="Ver edificios"
                  >
                    <Apartment />
                  </IconButton>
                  <IconButton color="info" onClick={() => handleOpenAccount(administrator)} title="Cuenta corriente">
                    <AccountBalance />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDelete(administrator.id)} title="Eliminar">
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {/* Fila de total */}
            <TableRow sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>
              <TableCell colSpan={4} align="right" sx={{ fontWeight: 'bold' }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  SALDO TOTAL:
                </Typography>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <Typography 
                  variant="subtitle1" 
                  fontWeight="bold"
                  color={administrators.reduce((sum, admin) => sum + (admin.saldoTotal || 0), 0) < 0 ? 'error' : 'success'}
                >
                  {formatCurrency(administrators.reduce((sum, admin) => sum + (admin.saldoTotal || 0), 0))}
                </Typography>
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Paginación */}
      <Box display="flex" justifyContent="center" mt={3}>
        <Pagination
          count={pagination.totalPages}
          page={pagination.page}
          onChange={(_, page) => setPagination(prev => ({ ...prev, page }))}
          color="primary"
        />
      </Box>
        </>
      )}
      <AdministratorFormModal
        open={open} 
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        editing={editing}
        onSuccess={handleSuccess}
        onError={handleError}
      />
      <Dialog open={openBuildingsList} onClose={handleCloseBuildingsList} fullWidth maxWidth="md">
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
            <span>Edificios de {selectedAdmin?.name}</span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PictureAsPdf />}
              onClick={handleDownloadBuildingsPdf}
              disabled={loadingBuildings || buildings.length === 0}
            >
              Descargar PDF
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingBuildings ? (
            <Typography>Cargando edificios...</Typography>
          ) : buildings.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              Este administrador no tiene edificios asignados.
            </Typography>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {buildings.length} edificio{buildings.length !== 1 ? 's' : ''}
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Edificio</TableCell>
                      <TableCell>Dirección</TableCell>
                      <TableCell>CUIT</TableCell>
                      <TableCell>Localidad</TableCell>
                      <TableCell>Saldo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {buildings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>{b.name}</TableCell>
                        <TableCell>{b.address || '-'}</TableCell>
                        <TableCell>{b.cuit || '-'}</TableCell>
                        <TableCell>{b.locality || '-'}</TableCell>
                        <TableCell>{formatCurrency(b.account?.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBuildingsList}>Cerrar</Button>
        </DialogActions>
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
              if (selectedAdmin) fetchAdminBuildings(selectedAdmin.id);
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