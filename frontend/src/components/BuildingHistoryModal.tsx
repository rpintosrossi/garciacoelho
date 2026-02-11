"use client";
import React, { useEffect, useState } from "react";
import api from '@/lib/axios';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Collapse,
  IconButton,
  Card,
  CardContent,
  Divider,
  TextField,
  InputAdornment
} from "@mui/material";
import { formatCurrency } from '@/utils/formatCurrency';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  Description,
  Receipt,
  Payment,
  CheckCircle,
  HourglassEmpty,
  Build,
  Download,
  Edit
} from "@mui/icons-material";

interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
  comprobante: string;
}

interface Remito {
  id: string;
  number: string;
  amount: number;
  date: string;
  status: string;
  payments: Payment[];
  receiptImages?: string[];
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  date: string;
  status: string;
  payments: Payment[];
  fileUrl?: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  visitDate: string | null;
  technician: {
    id: string;
    name: string;
  } | null;
  remitos: Remito[];
  invoice: Invoice | null;
}

interface BuildingHistoryData {
  building: {
    id: string;
    name: string;
    address: string;
    cuit: string;
    administrator: {
      id: string;
      name: string;
      email: string;
    };
  };
  summary: {
    totalServices: number;
    totalInvoices: number;
    totalRemitos: number;
    totalInvoiced: number;
    totalPaid: number;
    pending: number;
  };
  services: Service[];
}

interface BuildingHistoryModalProps {
  open: boolean;
  onClose: () => void;
  buildingId: string | null;
}

const BuildingHistoryModal: React.FC<BuildingHistoryModalProps> = ({
  open,
  onClose,
  buildingId
}) => {
  const [data, setData] = useState<BuildingHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  
  // Edit Invoice State
  const [editInvoiceOpen, setEditInvoiceOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<{id: string, amount: number} | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [errorEdit, setErrorEdit] = useState<string | null>(null);

  useEffect(() => {
    if (open && buildingId) {
      fetchHistory();
    }
  }, [open, buildingId]);

  const fetchHistory = async () => {
    if (!buildingId) return;
    
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await api.get(`/buildings/${buildingId}/service-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (err) {
      console.error("Error al cargar historial:", err);
      setError("Error al cargar el historial de servicios");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (invoice: {id: string, amount: number}) => {
    setSelectedInvoice(invoice);
    setEditAmount(invoice.amount.toString());
    setEditInvoiceOpen(true);
    setErrorEdit(null);
  };

  const handleEditClose = () => {
    setEditInvoiceOpen(false);
    setSelectedInvoice(null);
    setEditAmount('');
    setErrorEdit(null);
  };

  const handleSaveInvoiceChanges = async () => {
    if (!selectedInvoice || !editAmount) return;

    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) {
      setErrorEdit('El monto debe ser un número válido mayor o igual a 0');
      return;
    }

    setSavingInvoice(true);
    setErrorEdit(null);

    try {
      const token = localStorage.getItem("token");
      await api.put(`/invoices/${selectedInvoice.id}`, {
        amount: amount
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state or refetch
      await fetchHistory();
      handleEditClose();
    } catch (err) {
      console.error('Error actualizando factura:', err);
      setErrorEdit('Error al actualizar el monto de la factura');
    } finally {
      setSavingInvoice(false);
    }
  };

  const toggleServiceExpand = (serviceId: string) => {
    const newExpanded = new Set(expandedServices);
    if (newExpanded.has(serviceId)) {
      newExpanded.delete(serviceId);
    } else {
      newExpanded.add(serviceId);
    }
    setExpandedServices(newExpanded);
  };

  const getStatusColor = (status: string) => {
    const statusMap: { [key: string]: "default" | "primary" | "secondary" | "success" | "error" | "info" | "warning" } = {
      'PENDIENTE': 'warning',
      'ASIGNADO': 'info',
      'CON_REMITO': 'primary',
      'FACTURADO': 'success',
      'PAGADO': 'success',
      'ANULADO': 'error'
    };
    return statusMap[status] || 'default';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Typography variant="h5" component="div">
          Historial de Servicios
        </Typography>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : data ? (
          <>
            {/* Información del edificio */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary">
                    {data.building.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {data.building.address}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    CUIT: {data.building.cuit}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2">
                    <strong>Administrador:</strong> {data.building.administrator.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {data.building.administrator.email}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Resumen */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Build color="primary" />
                    <Box>
                      <Typography variant="h6">{data.summary.totalServices}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Servicios
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Description color="secondary" />
                    <Box>
                      <Typography variant="h6">{data.summary.totalInvoices}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Facturas
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Receipt color="warning" />
                    <Box>
                      <Typography variant="h6">{data.summary.totalRemitos}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Remitos
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Payment color="success" />
                    <Box>
                      <Typography variant="h6" color={data.summary.pending > 0 ? 'error' : 'success'}>
                        {formatCurrency(data.summary.pending)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pendiente
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Lista de servicios */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Servicios ({data.services.length})
            </Typography>
            
            {data.services.length === 0 ? (
              <Alert severity="info">No hay servicios registrados para este edificio</Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={50}></TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell>Técnico</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell align="right">Monto</TableCell>
                      <TableCell>Documentos</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.services.map((service) => {
                      const isExpanded = expandedServices.has(service.id);
                      const totalService = service.invoice?.amount || 0 + service.remitos.reduce((sum, r) => sum + r.amount, 0);
                      const hasDocuments = service.invoice || service.remitos.length > 0;
                      
                      return (
                        <React.Fragment key={service.id}>
                          <TableRow hover>
                            <TableCell>
                              {hasDocuments && (
                                <IconButton
                                  size="small"
                                  onClick={() => toggleServiceExpand(service.id)}
                                >
                                  {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                                </IconButton>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(service.createdAt)}</TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {service.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {service.description}
                              </Typography>
                            </TableCell>
                            <TableCell>{service.technician?.name || '-'}</TableCell>
                            <TableCell>
                              <Chip
                                label={service.status}
                                color={getStatusColor(service.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              {totalService > 0 ? formatCurrency(totalService) : '-'}
                            </TableCell>
                            <TableCell>
                              <Box display="flex" gap={0.5}>
                                {service.invoice && (
                                  <Chip
                                    icon={<Description />}
                                    label="Factura"
                                    size="small"
                                    color="secondary"
                                  />
                                )}
                                {service.remitos.length > 0 && (
                                  <Chip
                                    icon={<Receipt />}
                                    label={`${service.remitos.length} Remito${service.remitos.length > 1 ? 's' : ''}`}
                                    size="small"
                                    color="warning"
                                  />
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                          {hasDocuments && (
                            <TableRow>
                              <TableCell colSpan={7} sx={{ py: 0, borderBottom: isExpanded ? 1 : 0 }}>
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                  <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                                    {/* Factura */}
                                    {service.invoice && (
                                      <Box mb={2}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                          <Typography variant="subtitle2" color="secondary">
                                            <Description fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                                            Factura #{service.invoice.number || service.invoice.id.substring(0, 8)}
                                          </Typography>
                                          {service.invoice.fileUrl && (
                                            <IconButton
                                              size="small"
                                              color="primary"
                                              onClick={() => window.open(service.invoice.fileUrl, '_blank')}
                                              title="Descargar factura"
                                            >
                                              <Download fontSize="small" />
                                            </IconButton>
                                          )}
                                        </Box>
                                        <Paper sx={{ p: 2 }}>
                                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
                                            <Box>
                                              <Typography variant="caption" color="text.secondary">
                                                Fecha
                                              </Typography>
                                              <Typography variant="body2">
                                                {formatDate(service.invoice.date)}
                                              </Typography>
                                            </Box>
                                            <Box>
                                              <Typography variant="caption" color="text.secondary">
                                                Monto
                                              </Typography>
                                              <Box display="flex" alignItems="center">
                                                <Typography variant="body2" fontWeight="bold">
                                                  {formatCurrency(service.invoice.amount)}
                                                </Typography>
                                                <IconButton
                                                  size="small"
                                                  color="primary"
                                                  onClick={() => handleEditClick({
                                                    id: service.invoice!.id,
                                                    amount: service.invoice!.amount
                                                  })}
                                                  sx={{ ml: 0.5, p: 0.5 }}
                                                  title="Editar monto"
                                                >
                                                  <Edit fontSize="small" sx={{ fontSize: '1rem' }} />
                                                </IconButton>
                                              </Box>
                                            </Box>
                                            <Box>
                                              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                                Estado
                                              </Typography>
                                              <Chip
                                                label={service.invoice.status}
                                                size="small"
                                                color={service.invoice.status === 'PAGADO' ? 'success' : 'warning'}
                                              />
                                            </Box>
                                            <Box>
                                              <Typography variant="caption" color="text.secondary">
                                                Pagos
                                              </Typography>
                                              <Typography variant="body2">
                                                {formatCurrency(
                                                  service.invoice.payments.reduce((sum, p) => sum + p.amount, 0)
                                                )}
                                              </Typography>
                                            </Box>
                                          </Box>
                                          
                                          {service.invoice.payments.length > 0 && (
                                            <Box mt={2}>
                                              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                                Detalle de pagos:
                                              </Typography>
                                              {service.invoice.payments.map((payment) => (
                                                <Box
                                                  key={payment.id}
                                                  sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    p: 1,
                                                    mb: 0.5,
                                                    bgcolor: 'background.paper',
                                                    borderRadius: 1
                                                  }}
                                                >
                                                  <Typography variant="caption">
                                                    {formatDate(payment.date)} - {payment.method}
                                                  </Typography>
                                                  <Typography variant="caption" fontWeight="bold">
                                                    {formatCurrency(payment.amount)}
                                                  </Typography>
                                                </Box>
                                              ))}
                                            </Box>
                                          )}
                                        </Paper>
                                      </Box>
                                    )}

                                    {/* Remitos */}
                                    {service.remitos.length > 0 && (
                                      <Box>
                                        <Typography variant="subtitle2" gutterBottom color="warning.main">
                                          <Receipt fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                                          Remitos ({service.remitos.length})
                                        </Typography>
                                        {service.remitos.map((remito) => (
                                          <Paper key={remito.id} sx={{ p: 2, mb: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                              <Typography variant="body2" fontWeight="medium">
                                                #{remito.number || remito.id.substring(0, 8)}
                                              </Typography>
                                              {remito.receiptImages && remito.receiptImages.length > 0 && (
                                                <Box>
                                                  {remito.receiptImages.map((imageUrl, idx) => (
                                                    <IconButton
                                                      key={idx}
                                                      size="small"
                                                      color="primary"
                                                      onClick={() => window.open(imageUrl, '_blank')}
                                                      title={`Descargar remito ${idx + 1}`}
                                                    >
                                                      <Download fontSize="small" />
                                                    </IconButton>
                                                  ))}
                                                </Box>
                                              )}
                                            </Box>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
                                              <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                  Número
                                                </Typography>
                                                <Typography variant="body2">
                                                  #{remito.number || remito.id.substring(0, 8)}
                                                </Typography>
                                              </Box>
                                              <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                  Fecha
                                                </Typography>
                                                <Typography variant="body2">
                                                  {formatDate(remito.date)}
                                                </Typography>
                                              </Box>
                                              <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                  Monto
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                  {formatCurrency(remito.amount)}
                                                </Typography>
                                              </Box>
                                              <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                  Pagos
                                                </Typography>
                                                <Typography variant="body2">
                                                  {formatCurrency(
                                                    remito.payments.reduce((sum, p) => sum + p.amount, 0)
                                                  )}
                                                </Typography>
                                              </Box>
                                            </Box>

                                            {remito.payments.length > 0 && (
                                              <Box mt={2}>
                                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                                  Detalle de pagos:
                                                </Typography>
                                                {remito.payments.map((payment) => (
                                                  <Box
                                                    key={payment.id}
                                                    sx={{
                                                      display: 'flex',
                                                      justifyContent: 'space-between',
                                                      p: 1,
                                                      mb: 0.5,
                                                      bgcolor: 'background.paper',
                                                      borderRadius: 1
                                                    }}
                                                  >
                                                    <Typography variant="caption">
                                                      {formatDate(payment.date)} - {payment.method}
                                                    </Typography>
                                                    <Typography variant="caption" fontWeight="bold">
                                                      {formatCurrency(payment.amount)}
                                                    </Typography>
                                                  </Box>
                                                ))}
                                              </Box>
                                            )}
                                          </Paper>
                                        ))}
                                      </Box>
                                    )}
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>

    <Dialog open={editInvoiceOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Monto de Factura</DialogTitle>
        <DialogContent>
          <Box pt={2}>
            {errorEdit && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorEdit}
              </Alert>
            )}
            <TextField
              sx={{ marginTop: 1 }}
              fullWidth
              label="Nuevo monto"
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose} disabled={savingInvoice}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveInvoiceChanges} 
            variant="contained" 
            disabled={savingInvoice}
            color="primary"
          >
            {savingInvoice ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BuildingHistoryModal;
