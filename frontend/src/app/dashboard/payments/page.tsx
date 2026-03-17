"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Pagination,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Button,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Payment as PaymentIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  Description as DescriptionIcon,
  Add as AddIcon
} from "@mui/icons-material";
import api from '@/lib/axios';
import { formatCurrency } from '@/utils/formatCurrency';
import BuildingPaymentModal from '../administrators/BuildingPaymentModal';
import MassivePaymentModal from '../administrators/MassivePaymentModal';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`payments-tabpanel-${index}`}
      aria-labelledby={`payments-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function PaymentsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [buildingPayments, setBuildingPayments] = useState<any[]>([]);
  const [adminPayments, setAdminPayments] = useState<any[]>([]);
  const [buildingSearch, setBuildingSearch] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [buildingPage, setBuildingPage] = useState(1);
  const [adminPage, setAdminPage] = useState(1);
  const [buildingPagination, setBuildingPagination] = useState({ total: 0, totalPages: 0, page: 1, limit: 10 });
  const [adminPagination, setAdminPagination] = useState({ total: 0, totalPages: 0, page: 1, limit: 10 });
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para modales de nuevo pago
  const [openBuildingPayment, setOpenBuildingPayment] = useState(false);
  const [openAdminPayment, setOpenAdminPayment] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);

  // Estados para búsqueda de edificios/administradores
  const [openBuildingSearch, setOpenBuildingSearch] = useState(false);
  const [openAdminSearch, setOpenAdminSearch] = useState(false);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [administrators, setAdministrators] = useState<any[]>([]);
  const [loadingBuildingSearch, setLoadingBuildingSearch] = useState(false);
  const [loadingAdminSearch, setLoadingAdminSearch] = useState(false);
  const [buildingSearchInput, setBuildingSearchInput] = useState("");
  const [adminSearchInput, setAdminSearchInput] = useState("");

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Fetch pagos de edificios
  const fetchBuildingPayments = async () => {
    setLoadingBuildings(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: buildingPage.toString(),
        limit: '10'
      });
      
      if (buildingSearch.trim()) {
        params.append('search', buildingSearch.trim());
      }

      const res = await api.get(`/payments/buildings?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setBuildingPayments(res.data.payments);
      setBuildingPagination(res.data.pagination);
    } catch (err: any) {
      console.error('Error al cargar pagos de edificios:', err);
      setError(err.response?.data?.message || 'Error al cargar pagos de edificios');
    } finally {
      setLoadingBuildings(false);
    }
  };

  // Fetch pagos de administradores
  const fetchAdminPayments = async () => {
    setLoadingAdmins(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: adminPage.toString(),
        limit: '10'
      });
      
      if (adminSearch.trim()) {
        params.append('search', adminSearch.trim());
      }

      const res = await api.get(`/payments/administrators?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAdminPayments(res.data.payments);
      setAdminPagination(res.data.pagination);
    } catch (err: any) {
      console.error('Error al cargar pagos de administradores:', err);
      setError(err.response?.data?.message || 'Error al cargar pagos de administradores');
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (tabValue === 0) {
      fetchBuildingPayments();
    } else {
      fetchAdminPayments();
    }
  }, [tabValue, buildingPage, adminPage, buildingSearch, adminSearch]);

  // Buscar edificios para ingresar pago
  const searchBuildings = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setBuildings([]);
      return;
    }

    setLoadingBuildingSearch(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/buildings/search/autocomplete?search=${encodeURIComponent(searchTerm)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBuildings(res.data || []);
    } catch (err) {
      console.error('Error al buscar edificios:', err);
    } finally {
      setLoadingBuildingSearch(false);
    }
  };

  // Buscar administradores para ingresar pago
  const searchAdministrators = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setAdministrators([]);
      return;
    }

    setLoadingAdminSearch(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/administrators?search=${searchTerm}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdministrators(res.data.administrators || res.data);
    } catch (err) {
      console.error('Error al buscar administradores:', err);
    } finally {
      setLoadingAdminSearch(false);
    }
  };

  // Handlers para abrir modales de pago
  const handleOpenBuildingPaymentModal = (building: any) => {
    setSelectedBuilding(building);
    setOpenBuildingSearch(false);
    setOpenBuildingPayment(true);
  };

  const handleOpenAdminPaymentModal = (admin: any) => {
    setSelectedAdmin(admin);
    setOpenAdminSearch(false);
    setOpenAdminPayment(true);
  };

  const handleCloseBuildingPayment = () => {
    setOpenBuildingPayment(false);
    setSelectedBuilding(null);
    setBuildingSearchInput("");
    setBuildings([]);
  };

  const handleCloseAdminPayment = () => {
    setOpenAdminPayment(false);
    setSelectedAdmin(null);
    setAdminSearchInput("");
    setAdministrators([]);
  };

  const handlePaymentSuccess = () => {
    // Recargar los pagos después de registrar uno nuevo
    if (tabValue === 0) {
      fetchBuildingPayments();
    } else {
      fetchAdminPayments();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <PaymentIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4">Gestión de Pagos</Typography>
      </Box>

      <Paper sx={{ width: '100%' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="payment tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<BusinessIcon />} 
            iconPosition="start" 
            label="Pagos por Edificio" 
            id="payments-tab-0"
            aria-controls="payments-tabpanel-0"
          />
          <Tab 
            icon={<PeopleIcon />} 
            iconPosition="start" 
            label="Pagos por Administrador" 
            id="payments-tab-1"
            aria-controls="payments-tabpanel-1"
          />
        </Tabs>

        {/* Tab Panel: Pagos por Edificio */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              placeholder="Buscar por CUIT o nombre del edificio..."
              value={buildingSearch}
              onChange={(e) => {
                setBuildingSearch(e.target.value);
                setBuildingPage(1); // Reset page when searching
              }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setOpenBuildingSearch(true)}
              sx={{ minWidth: 200, height: 56 }}
            >
              Ingresar Pago
            </Button>
          </Box>

          {loadingBuildings ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : buildingPayments.length === 0 ? (
            <Alert severity="info">No se encontraron pagos para edificios</Alert>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Edificio</TableCell>
                      <TableCell>CUIT</TableCell>
                      <TableCell>Administrador</TableCell>
                      <TableCell>Monto</TableCell>
                      <TableCell>Método de Pago</TableCell>
                      <TableCell>Comprobante</TableCell>
                      <TableCell>Documentos</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {buildingPayments.map((payment) => (
                      <TableRow key={payment.id} hover>
                        <TableCell>{formatDate(payment.date)}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {payment.building?.name || 'N/A'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {payment.building?.address || ''}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{payment.building?.cuit || 'N/A'}</TableCell>
                        <TableCell>{payment.building?.administrator?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold" color="success.main">
                              {formatCurrency(payment.amount)}
                            </Typography>
                            {payment.hasDiscount && (
                              <Chip 
                                label={`Dto: ${formatCurrency(payment.discount)}`} 
                                size="small" 
                                color="warning" 
                                sx={{ mt: 0.5 }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{payment.paymentMethod?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip label={payment.comprobante} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Ver documentos asociados">
                            <Chip 
                              icon={<ReceiptIcon />}
                              label={`${payment.documents.length} doc(s)`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {buildingPagination.totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={buildingPagination.totalPages}
                    page={buildingPage}
                    onChange={(_, page) => setBuildingPage(page)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </TabPanel>

        {/* Tab Panel: Pagos por Administrador */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              placeholder="Buscar por nombre del administrador..."
              value={adminSearch}
              onChange={(e) => {
                setAdminSearch(e.target.value);
                setAdminPage(1); // Reset page when searching
              }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AddIcon />}
              onClick={() => setOpenAdminSearch(true)}
              sx={{ minWidth: 200, height: 56 }}
            >
              Ingresar Pago
            </Button>
          </Box>

          {loadingAdmins ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : adminPayments.length === 0 ? (
            <Alert severity="info">No se encontraron pagos masivos para administradores</Alert>
          ) : (
            <>
              {adminPayments.map((payment) => (
                <Accordion key={payment.id} sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {payment.administrator?.name || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Fecha: {formatDate(payment.date)} | Comprobante: {payment.comprobante}
                        </Typography>
                      </Box>
                      <Chip 
                        icon={<BusinessIcon />}
                        label={`${payment.buildingCount} edificio(s)`}
                        color="primary"
                        size="small"
                      />
                      <Typography variant="h6" color="success.main" fontWeight="bold">
                        {formatCurrency(payment.amount)}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Card variant="outlined" sx={{ flex: 1, minWidth: 200 }}>
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">
                              Monto Original
                            </Typography>
                            <Typography variant="h6">
                              {formatCurrency(payment.originalAmount || payment.amount)}
                            </Typography>
                          </CardContent>
                        </Card>
                        {payment.hasDiscount && (
                          <Card variant="outlined" sx={{ flex: 1, minWidth: 200 }}>
                            <CardContent>
                              <Typography variant="caption" color="text.secondary">
                                Descuento
                              </Typography>
                              <Typography variant="h6" color="warning.main">
                                {formatCurrency(payment.discount)}
                              </Typography>
                              {payment.discountReason && (
                                <Typography variant="caption" color="text.secondary">
                                  {payment.discountReason}
                                </Typography>
                              )}
                            </CardContent>
                          </Card>
                        )}
                        <Card variant="outlined" sx={{ flex: 1, minWidth: 200 }}>
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">
                              Método de Pago
                            </Typography>
                            <Typography variant="body1">
                              {payment.paymentMethod?.name || 'N/A'}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Box>

                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        Edificios involucrados:
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Edificio</TableCell>
                              <TableCell>CUIT</TableCell>
                              <TableCell>Dirección</TableCell>
                              <TableCell>Documentos</TableCell>
                              <TableCell>Monto Aplicado</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {payment.buildings.map((buildingData: any) => (
                              <TableRow key={buildingData.building.id}>
                                <TableCell>{buildingData.building.name}</TableCell>
                                <TableCell>{buildingData.building.cuit}</TableCell>
                                <TableCell>{buildingData.building.address}</TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {buildingData.documents.map((doc: any) => (
                                      <Chip
                                        key={doc.id}
                                        label={doc.type === 'FACTURA' ? 
                                          `F: ${doc.invoiceNumber || 'S/N'}` : 
                                          `R: ${doc.remitoNumber || 'S/N'}`
                                        }
                                        size="small"
                                        icon={doc.type === 'FACTURA' ? <DescriptionIcon /> : <ReceiptIcon />}
                                      />
                                    ))}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="bold" color="success.main">
                                    {formatCurrency(
                                      buildingData.documents.reduce((sum: number, doc: any) => sum + doc.amount, 0)
                                    )}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}

              {adminPagination.totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={adminPagination.totalPages}
                    page={adminPage}
                    onChange={(_, page) => setAdminPage(page)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </TabPanel>
      </Paper>

      {/* Dialog de búsqueda de edificio para ingresar pago */}
      <Dialog 
        open={openBuildingSearch} 
        onClose={() => {
          setOpenBuildingSearch(false);
          setBuildingSearchInput("");
          setBuildings([]);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Buscar Edificio para Ingresar Pago</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Autocomplete
              options={buildings}
              filterOptions={(x) => x}
              getOptionLabel={(option) => `${option.name} - ${option.cuit}${option.administrator ? ' - ' + option.administrator.name : ''}`}
              loading={loadingBuildingSearch}
              onInputChange={(_, value) => {
                setBuildingSearchInput(value);
                searchBuildings(value);
              }}
              onChange={(_, value) => {
                if (value) {
                  handleOpenBuildingPaymentModal(value);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Buscar por nombre, CUIT de edificio o administrador"
                  placeholder="Escribe al menos 2 caracteres..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingBuildingSearch ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <Box component="li" key={key} {...otherProps}>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        CUIT: {option.cuit} | {option.address}
                      </Typography>
                      {option.administrator && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Administrador: {option.administrator.name}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              }}
              noOptionsText={
                buildingSearchInput.length < 2 
                  ? "Escribe al menos 2 caracteres" 
                  : "No se encontraron edificios"
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenBuildingSearch(false);
            setBuildingSearchInput("");
            setBuildings([]);
          }}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de búsqueda de administrador para ingresar pago */}
      <Dialog 
        open={openAdminSearch} 
        onClose={() => {
          setOpenAdminSearch(false);
          setAdminSearchInput("");
          setAdministrators([]);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Buscar Administrador para Ingresar Pago Masivo</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Autocomplete
              options={administrators}
              getOptionLabel={(option) => option.name}
              loading={loadingAdminSearch}
              onInputChange={(_, value) => {
                setAdminSearchInput(value);
                searchAdministrators(value);
              }}
              onChange={(_, value) => {
                if (value) {
                  handleOpenAdminPaymentModal(value);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Buscar por nombre"
                  placeholder="Escribe al menos 2 caracteres..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingAdminSearch ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <Box component="li" key={key} {...otherProps}>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.email} | {option.phone}
                      </Typography>
                    </Box>
                  </Box>
                );
              }}
              noOptionsText={
                adminSearchInput.length < 2 
                  ? "Escribe al menos 2 caracteres" 
                  : "No se encontraron administradores"
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenAdminSearch(false);
            setAdminSearchInput("");
            setAdministrators([]);
          }}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de pago para edificio */}
      {selectedBuilding && (
        <BuildingPaymentModal
          open={openBuildingPayment}
          onClose={handleCloseBuildingPayment}
          buildingId={selectedBuilding.id}
          buildingName={selectedBuilding.name}
          onSuccess={() => {
            handlePaymentSuccess();
            handleCloseBuildingPayment();
          }}
        />
      )}

      {/* Modal de pago masivo para administrador */}
      {selectedAdmin && (
        <MassivePaymentModal
          open={openAdminPayment}
          onClose={handleCloseAdminPayment}
          adminId={selectedAdmin.id}
          onSuccess={() => {
            handlePaymentSuccess();
            handleCloseAdminPayment();
          }}
        />
      )}
    </Box>
  );
}
