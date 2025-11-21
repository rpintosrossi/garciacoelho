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
  Link
} from "@mui/material";
import { formatCurrency } from '@/utils/formatCurrency';
import { Payment, KeyboardArrowDown, KeyboardArrowUp, Description, GetApp } from "@mui/icons-material";
import BuildingPaymentModal from './BuildingPaymentModal';

interface Transaction {
  id: string;
  type: 'invoice' | 'payment';
  displayType: 'invoice' | 'payment';
  amount: number;
  status: string;
  createdAt: string;
  comprobante?: string;
  paymentMethod?: string;
  discount?: number;
  discountReason?: string;
  associatedInvoiceId?: string;
  service?: any;
  remaining?: number;
  services?: any[]; // Array de servicios asociados a la factura
  number?: string; // Número de factura real
  invoice?: {
    fileUrl?: string; // URL del PDF de la factura
  };
}

interface BuildingAccountDetails {
  building: any;
  transactions: Transaction[];
  summary: {
    totalInvoices: number;
    totalPayments: number;
    currentBalance: number;
    totalTransactions: number;
  };
}

interface BuildingAccountModalProps {
  open: boolean;
  onClose: () => void;
  buildingId: string | null;
  buildingName?: string;
}

const BuildingAccountModal: React.FC<BuildingAccountModalProps> = ({
  open,
  onClose,
  buildingId,
  buildingName
}) => {
  const [data, setData] = useState<BuildingAccountDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

  const toggleInvoice = (invoiceId: string) => {
    setExpandedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (open && buildingId) {
      fetchAccountDetails();
    }
  }, [open, buildingId]);

  const fetchAccountDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      const response = await api.get(`/buildings/${buildingId}/account-details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al cargar los detalles de la cuenta");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentModal = () => {
    setOpenPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setOpenPaymentModal(false);
  };

  const handlePaymentSuccess = () => {
    fetchAccountDetails(); // Recargar los datos después del pago
  };

  const getRowColor = (transaction: Transaction) => {
    console.log('🔍 [FRONTEND] getRowColor para transacción:', {
      id: transaction.id,
      displayType: transaction.displayType,
      paymentMethod: transaction.paymentMethod,
      isEfectivo: transaction.displayType === 'invoice' && transaction.paymentMethod === 'EFECTIVO'
    });
    
    if (transaction.displayType === 'payment') {
      return '#e8f5e8'; // Verde claro para pagos
    }
    if (transaction.displayType === 'invoice' && transaction.paymentMethod === 'EFECTIVO') {
      return '#f0f8ff'; // Azul muy claro para facturas pagadas en efectivo
    }
    return 'inherit'; // Color normal para facturas
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAGADO':
        return 'success';
      case 'PENDIENTE':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    // Abrir el archivo en una nueva pestaña o descargarlo
    window.open(fileUrl, '_blank');
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Cuenta Corriente - {buildingName || data?.building?.name}
      </DialogTitle>
      <DialogContent>
        {loading && (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {data && !loading && (
          <>
            {/* Resumen */}
            <Box mb={3} p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="h6" gutterBottom>
                Resumen
              </Typography>
              <Box display="flex" gap={4} alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Facturas
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(data.summary.totalInvoices)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Pagos
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(data.summary.totalPayments)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Saldo Actual
                  </Typography>
                  <Typography 
                    variant="h6" 
                    color={data.summary.currentBalance < 0 ? 'error' : 'success'}
                  >
                    {formatCurrency(data.summary.currentBalance)}
                  </Typography>
                </Box>
                <Box ml="auto">
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Payment />}
                    onClick={handleOpenPaymentModal}
                  >
                    Registrar Pago
                  </Button>
                </Box>
              </Box>
            </Box>

            {/* Tabla de transacciones */}
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={50}></TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Comprobante</TableCell>
                    <TableCell>Método de Pago</TableCell>
                    <TableCell align="right">Importe</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.transactions.map((transaction) => (
                    <React.Fragment key={transaction.id}>
                      <TableRow sx={{ backgroundColor: getRowColor(transaction) }}>
                        <TableCell>
                          {transaction.displayType === 'invoice' && transaction.services && transaction.services.length > 0 && (
                            <IconButton
                              size="small"
                              onClick={() => toggleInvoice(transaction.id)}
                            >
                              {expandedInvoices.has(transaction.id) ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                            </IconButton>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatDate(transaction.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={transaction.displayType === 'invoice' ? 'FACTURA' : 'PAGO'}
                            color={transaction.displayType === 'invoice' ? 'primary' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {transaction.displayType === 'invoice' ? (
                            <Box>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2">
                                  {transaction.number ? `Factura #${transaction.number}` : 'Factura sin número'}
                                </Typography>
                                {transaction.paymentMethod === 'EFECTIVO' && (
                                  <Chip 
                                    label="EFECTIVO" 
                                    size="small" 
                                    color="success"
                                  />
                                )}
                                {/* Botón para descargar factura si existe fileUrl */}
                                {transaction.service?.invoice?.fileUrl && (
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleDownloadFile(
                                      transaction.service.invoice.fileUrl,
                                      `factura_${transaction.number || transaction.id}.pdf`
                                    )}
                                    title="Descargar factura"
                                  >
                                    <GetApp fontSize="small" />
                                  </IconButton>
                                )}
                              </Box>
                              {transaction.services && transaction.services.length > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  {transaction.services.length} servicio(s)
                                </Typography>
                              )}
                              {transaction.paymentMethod === 'EFECTIVO' ? (
                                <Typography variant="caption" color="success.main">
                                  Pagado en efectivo
                                </Typography>
                              ) : transaction.remaining !== undefined && transaction.remaining > 0 && (
                                <Typography variant="caption" color="error">
                                  Pendiente: {formatCurrency(transaction.remaining)}
                                </Typography>
                              )}
                            </Box>
                          ) : (
                          <Box>
                            <Typography variant="body2">
                              Pago #{transaction.id.slice(0, 8)}
                            </Typography>
                            {transaction.discount && transaction.discount > 0 && (
                              <Typography variant="caption" color="success.main">
                                Descuento: {formatCurrency(transaction.discount)}
                                {transaction.discountReason && ` (${transaction.discountReason})`}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {transaction.comprobante || '-'}
                      </TableCell>
                      <TableCell>
                        {transaction.paymentMethod?.name || '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2"
                          color={transaction.displayType === 'payment' ? 'success.main' : 'inherit'}
                        >
                          {transaction.displayType === 'payment' ? '-' : ''}
                          {formatCurrency(transaction.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={transaction.status}
                          color={getStatusColor(transaction.status) as any}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                    
                    {/* Fila colapsable con los servicios de la factura */}
                    {transaction.displayType === 'invoice' && transaction.services && transaction.services.length > 0 && (
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                          <Collapse in={expandedInvoices.has(transaction.id)} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2, bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                              <Typography variant="subtitle2" gutterBottom component="div" color="primary">
                                Servicios incluidos en esta factura:
                              </Typography>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Fecha</TableCell>
                                    <TableCell>Categoría</TableCell>
                                    <TableCell>Descripción</TableCell>
                                    <TableCell>Técnico</TableCell>
                                    <TableCell>Remitos</TableCell>
                                    <TableCell>Estado</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {transaction.services.map((service: any) => (
                                    <TableRow key={service.id}>
                                      <TableCell>{formatDate(service.createdAt)}</TableCell>
                                      <TableCell>{service.category?.name || '-'}</TableCell>
                                      <TableCell>
                                        <Typography variant="body2">
                                          {service.description || '-'}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>{service.technician?.name || '-'}</TableCell>
                                      <TableCell>
                                        {service.remitos && service.remitos.length > 0 ? (
                                          <Box display="flex" flexDirection="column" gap={0.5}>
                                            {service.remitos.map((remito: any) => (
                                              <Box key={remito.id} display="flex" alignItems="center" gap={1}>
                                                <Chip 
                                                  label={`#${remito.number}`}
                                                  size="small"
                                                  variant="outlined"
                                                  color="info"
                                                />
                                                {remito.receiptImages && remito.receiptImages.length > 0 && (
                                                  <Box display="flex" gap={0.5}>
                                                    {remito.receiptImages.map((imageUrl: string, idx: number) => (
                                                      <IconButton
                                                        key={idx}
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleDownloadFile(imageUrl, `remito_${remito.number}_${idx + 1}.pdf`)}
                                                        title="Descargar remito"
                                                      >
                                                        <Description fontSize="small" />
                                                      </IconButton>
                                                    ))}
                                                  </Box>
                                                )}
                                              </Box>
                                            ))}
                                          </Box>
                                        ) : (
                                          <Typography variant="caption" color="text.secondary">
                                            Sin remitos
                                          </Typography>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <Chip 
                                          label={service.status}
                                          size="small"
                                          color={service.status === 'COMPLETADO' ? 'success' : 'default'}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

                         {/* Nota explicativa */}
             <Box mt={2} p={2} bgcolor="info.light" borderRadius={1}>
               <Typography variant="body2" color="info.contrastText">
                 <strong>Nota:</strong> Los pagos aparecen inmediatamente después de su factura correspondiente 
                 con fondo verde para facilitar la identificación visual. Las facturas pagadas en efectivo 
                 aparecen con fondo azul claro y no generan pagos adicionales ya que fueron abonadas directamente.
               </Typography>
             </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>

      {/* Modal de Pago */}
      {buildingId && (
        <BuildingPaymentModal
          open={openPaymentModal}
          onClose={handleClosePaymentModal}
          buildingId={buildingId}
          buildingName={buildingName || data?.building?.name || ''}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </Dialog>
  );
};

export default BuildingAccountModal;
