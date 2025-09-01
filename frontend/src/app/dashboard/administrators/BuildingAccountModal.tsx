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
  Alert
} from "@mui/material";
import { formatCurrency } from '@/utils/formatCurrency';
import { Payment } from "@mui/icons-material";
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
                    <TableRow 
                      key={transaction.id} 
                      sx={{ backgroundColor: getRowColor(transaction) }}
                    >
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
                                 Factura #{transaction.id.slice(0, 8)}
                               </Typography>
                               {transaction.paymentMethod === 'EFECTIVO' && (
                                 <Chip 
                                   label="EFECTIVO" 
                                   size="small" 
                                   color="success"
                                 />
                               )}
                             </Box>
                             {transaction.service?.technician && (
                               <Typography variant="caption" color="text.secondary">
                                 Técnico: {transaction.service.technician.name}
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
