'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  InputAdornment,
  Pagination,
  Tooltip,
} from '@mui/material';
import { ExpandMore, PictureAsPdf, Search as SearchIcon, Undo as UndoIcon } from '@mui/icons-material';
import { formatCurrency } from '@/utils/formatCurrency';
import api, { cachedApi } from '@/lib/axios';
import { useCommonData } from '@/contexts/CommonDataContext';

interface Transaction {
  type: 'invoice' | 'payment' | 'remito_sin_factura';
  id: string;
  number?: string;
  date?: string;
  amount: number;
  status: string;
  createdAt: string;
  service?: {
    id: string;
    description: string;
    visitDate?: string;
    building: {
      name: string;
      address: string;
    };
    technician: {
      name: string;
    };
    remitos: Array<{
      id: string;
      number: string;
      amount: number;
      date: string;
      receiptImages: string[];
    }>;
  };
  building?: {
    name: string;
    address: string;
  };
  administrator?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  technician?: {
    name: string;
  };
  remitos?: Array<{
    id: string;
    number: string;
    amount: number;
    date: string;
    receiptImages: string[];
  }>;
  paymentMethod?: {
    name: string;
  };
  comprobante?: string;
  originalAmount?: number;
  discount?: number;
  discountReason?: string;
}

interface Administrator {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  titular?: string;
  banco?: string;
  cuenta?: string;
  cuit?: string;
  cbu?: string;
  alias?: string;
}

interface PackageData {
  administrator: Administrator;
  transactions: Transaction[];
  totalAmount: number;
  totalInvoices: number;
  totalPayments: number;
}

export default function PackagePage() {
  const { administrators } = useCommonData();
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [downloadMode, setDownloadMode] = useState<'single' | 'split' | 'individual'>('single');

  // Estado para revertir factura
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);
  const [revertInvoiceId, setRevertInvoiceId] = useState<string | null>(null);
  const [revertInvoiceLabel, setRevertInvoiceLabel] = useState('');
  const [reverting, setReverting] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filteredPackages = useMemo(() => {
    if (!search.trim()) return packages;
    const q = search.trim().toLowerCase();
    return packages.filter(pkg =>
      pkg.administrator.name.toLowerCase().includes(q) ||
      pkg.administrator.email.toLowerCase().includes(q)
    );
  }, [packages, search]);

  const totalPages = Math.ceil(filteredPackages.length / PAGE_SIZE);
  const paginatedPackages = filteredPackages.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    fetchPackages();
    fetchPaymentMethods();
  }, []); // Solo al montar — el administrador viene directo de la API

  // Escuchar cambios en paquetes para actualizar automáticamente
  useEffect(() => {
    // Función para verificar cambios en localStorage
    const checkLocalStorageChanges = () => {
      const lastUpdate = localStorage.getItem('packagesLastUpdate');
      const updateType = localStorage.getItem('packagesUpdateType');
      const servicesLastUpdate = localStorage.getItem('servicesLastUpdate');
      const servicesUpdateType = localStorage.getItem('servicesUpdateType');
      
      if (lastUpdate && updateType === 'payment_registered') {
        console.log('🔄 [PACKAGES] Cambio de pago detectado en localStorage, actualizando...');
        // Limpiar el flag para evitar actualizaciones múltiples
        localStorage.removeItem('packagesLastUpdate');
        localStorage.removeItem('packagesUpdateType');
        // Actualizar la lista
        fetchPackages();
      }
      
      // También escuchar cuando se factura un servicio
      if (servicesLastUpdate && servicesUpdateType === 'service_invoiced') {
        console.log('🔄 [PACKAGES] Cambio de facturación detectado en localStorage, actualizando...');
        // Limpiar el flag para evitar actualizaciones múltiples
        localStorage.removeItem('servicesLastUpdate');
        localStorage.removeItem('servicesUpdateType');
        // Actualizar la lista
        fetchPackages();
      }
    };

    // Verificar cambios cada 30 segundos (optimizado para reducir consumo de CPU)
    const interval = setInterval(checkLocalStorageChanges, 30000);

    // Limpiar intervalo al desmontar
    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await cachedApi.get('/payment-methods');
      const methods: PaymentMethod[] = response.data;
      setPaymentMethods(methods);
      // Establecer el primer método como seleccionado por defecto
      if (methods.length > 0 && !selectedPaymentMethod) {
        setSelectedPaymentMethod(methods[0].id);
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
    }
  };

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener todas las transacciones (facturas y cobros)
      console.log('🔍 [FRONTEND] Solicitando paquetes...');
      console.log('🔍 [FRONTEND] Administradores disponibles:', administrators);
      const transactionsRes = await cachedApi.get('/packages');
      const transactions: Transaction[] = transactionsRes.data;
      console.log('📊 [FRONTEND] Transacciones recibidas:', transactions);

      // Agrupar por administrador
      const packagesByAdmin: { [key: string]: PackageData } = {};

      transactions.forEach((transaction) => {
        const adminId = transaction.administrator?.id || 'unknown';
        console.log('🔍 [FRONTEND] Procesando transacción para adminId:', adminId);
        console.log('🔍 [FRONTEND] Administrador de la transacción:', transaction.administrator);
        
        if (!packagesByAdmin[adminId]) {
          // Usar el administrador directamente del API response (ya viene incluido)
          const adminFromApi = transaction.administrator;
          const adminFromCtx = administrators.find(a => a.id === adminId);
          packagesByAdmin[adminId] = {
            administrator: adminFromApi || adminFromCtx || {
              id: adminId,
              name: 'Administrador no encontrado',
              email: '',
              phone: ''
            },
            transactions: [],
            totalAmount: 0,
            totalInvoices: 0,
            totalPayments: 0
          };
        }

        packagesByAdmin[adminId].transactions.push(transaction);
        packagesByAdmin[adminId].totalAmount += transaction.amount;
        
        if (transaction.type === 'invoice') {
          packagesByAdmin[adminId].totalInvoices += 1;
        } else if (transaction.type === 'payment' || transaction.type === 'remito_sin_factura') {
          packagesByAdmin[adminId].totalPayments += 1;
        }
      });

      setPackages(Object.values(packagesByAdmin));
    } catch (err) {
      setError('Error al cargar los paquetes');
      console.error('Error fetching packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRevert = (invoiceId: string, label: string) => {
    setRevertInvoiceId(invoiceId);
    setRevertInvoiceLabel(label);
    setRevertConfirmOpen(true);
  };

  const handleConfirmRevert = async () => {
    if (!revertInvoiceId) return;
    setReverting(true);
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/invoices/${revertInvoiceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRevertConfirmOpen(false);
      setRevertInvoiceId(null);
      // Limpiar caché y refrescar paquetes
      cachedApi.clearCacheFor('/packages');
      await fetchPackages();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al revertir la factura';
      setError(msg);
      setRevertConfirmOpen(false);
    } finally {
      setReverting(false);
    }
  };

  const handleDownloadPackage = async (adminId: string) => {
    // Mostrar modal para seleccionar método de pago
    setSelectedAdminId(adminId);
    setShowPaymentMethodModal(true);
  };

  const handleConfirmDownload = async () => {
    if (!selectedAdminId) return;

    // Para modo 'individual', capturar el directorio ANTES de cualquier await
    // (mientras el navegador todavía tiene el contexto de gesto de usuario)
    let dirHandle: any = null;
    if (downloadMode === 'individual') {
      if (!('showDirectoryPicker' in window)) {
        setError('Tu navegador no soporta la selección de carpeta. Usá la opción ZIP.');
        return;
      }
      try {
        dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      } catch (err: any) {
        if (err?.name === 'AbortError') return; // Usuario canceló
        setError('Error al seleccionar la carpeta de destino');
        return;
      }
    }

    try {
      setDownloading(selectedAdminId);
      setShowPaymentMethodModal(false);

      const adminData = packages.find(p => p.administrator.id === selectedAdminId);
      const adminName = adminData?.administrator.name?.replace(/\s+/g, '_') || selectedAdminId;
      const dateStr = new Date().toISOString().split('T')[0];

      if (downloadMode === 'individual' && dirHandle) {
        // Descargar ZIP del backend, descomprimirlo y guardar cada archivo individualmente
        const response = await cachedApi.get(`/packages/${selectedAdminId}/download`, {
          params: { paymentMethodId: selectedPaymentMethod, mode: 'split' },
          responseType: 'blob'
        });

        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(response.data);

        for (const [filename, file] of Object.entries(zip.files)) {
          if (!(file as any).dir) {
            const content = await (file as any).async('arraybuffer');
            const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
          }
        }

      } else if (downloadMode === 'split') {
        // Descargar como ZIP con archivos separados
        const response = await cachedApi.get(`/packages/${selectedAdminId}/download`, {
          params: { paymentMethodId: selectedPaymentMethod, mode: 'split' },
          responseType: 'blob'
        });

        const blob = new Blob([response.data], { type: 'application/zip' });
        const suggestedName = `paquete-${adminName}-separado-${dateStr}.zip`;

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = suggestedName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

      } else {
        // Descargar como un solo PDF (comportamiento anterior)
        const response = await cachedApi.get(`/packages/${selectedAdminId}/download`, {
          params: { paymentMethodId: selectedPaymentMethod },
          responseType: 'blob'
        });

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const suggestedName = `paquete-${adminName}-${dateStr}.pdf`;

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = suggestedName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error downloading package:', err);
      setError('Error al descargar el paquete');
    } finally {
      setDownloading(null);
      setSelectedAdminId(null);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Paquetes de Facturación
      </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Buscar por nombre o email del administrador..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      {packages.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No hay facturas para mostrar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Las facturas aparecerán aquí una vez que se creen
          </Typography>
        </Paper>
      ) : filteredPackages.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No se encontraron resultados para "{search}"
          </Typography>
        </Paper>
      ) : (
        <>
          <Stack spacing={2}>
            {paginatedPackages.map((pkg) => (
            <Accordion key={pkg.administrator.id}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Box>
                    <Typography variant="h6">
                      {pkg.administrator.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {pkg.administrator.email}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip 
                      label={`${pkg.totalInvoices} facturas`} 
                      color="primary" 
                      variant="outlined" 
                    />
                    <Chip 
                      label={`${pkg.totalPayments} Prov`} 
                      color="secondary" 
                      variant="outlined" 
                    />
                    <Typography variant="h6" color="primary">
                      {formatCurrency(pkg.totalAmount)}
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<PictureAsPdf />}
                    onClick={() => handleDownloadPackage(pkg.administrator.id)}
                    disabled={downloading === pkg.administrator.id}
                  >
                    {downloading === pkg.administrator.id ? (
                      <CircularProgress size={20} />
                    ) : (
                      'Descargar Paquete'
                    )}
                  </Button>
                </Box>
                
                <List>
                  {pkg.transactions.map((transaction, index) => (
                    <React.Fragment key={transaction.id}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="subtitle1">
                                {transaction.building?.name || transaction.service?.building?.name || 'Sin edificio'}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {transaction.type === 'payment' && (
                                  <Chip 
                                    label="Cobro" 
                                    size="small" 
                                    color="secondary" 
                                    variant="outlined" 
                                  />
                                )}
                                {transaction.type === 'remito_sin_factura' && (
                                  <Chip 
                                    label="Prov" 
                                    size="small" 
                                    color="warning" 
                                    variant="outlined" 
                                  />
                                )}
                                <Typography variant="h6" color="primary">
                                  {formatCurrency(transaction.amount)}
                                </Typography>
                                {transaction.type === 'invoice' && (
                                  <Tooltip title="Revertir factura (vuelve a facturación)">
                                    <IconButton
                                      size="small"
                                      color="warning"
                                      onClick={() => handleOpenRevert(
                                        transaction.id,
                                        `Factura ${transaction.number || transaction.id.slice(0, 8)} - ${transaction.building?.name || ''}`
                                      )}
                                    >
                                      <UndoIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </Box>
                          }
                          secondary={
                            <Box component="span">
                              <Typography component="span" variant="body2" color="text.secondary" display="block">
                                {transaction.building?.address || transaction.service?.building?.address || 'Sin dirección'}
                              </Typography>
                              <Typography component="span" variant="body2" color="text.secondary" display="block">
                                {transaction.type === 'invoice' ? 'Factura' : 'Comprobante'}: {transaction.type === 'invoice' ? (transaction.number || transaction.id.slice(0, 8)) : transaction.comprobante} | 
                                Fecha: {new Date(transaction.remitos?.[0]?.date || transaction.service?.remitos?.[0]?.date || transaction.service?.visitDate || transaction.date || transaction.createdAt).toLocaleDateString('es-AR')} |
                                Técnico: {transaction.technician?.name || transaction.service?.technician?.name || 'No asignado'}
                              </Typography>
                              {transaction.remitos && transaction.remitos.length > 0 && (
                                <Typography component="span" variant="body2" color="text.secondary" display="block">
                                  Remitos: {transaction.remitos.map(r => r.number).join(', ')}
                                </Typography>
                              )}
                              {transaction.type === 'payment' && transaction.paymentMethod && (
                                <Typography component="span" variant="body2" color="text.secondary" display="block">
                                  Método: {transaction.paymentMethod.name}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < pkg.transactions.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Box>
                    <Typography variant="h6">
                      Total de Facturas: {pkg.totalInvoices}
                    </Typography>
                    <Typography variant="h6">
                      Total de Prov: {pkg.totalPayments}
                    </Typography>
                  </Box>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    Neto Total: {formatCurrency(pkg.totalAmount)}
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Modal para seleccionar método de pago */}
      <Dialog open={showPaymentMethodModal} onClose={() => setShowPaymentMethodModal(false)}>
        <DialogTitle>Seleccionar Método de Pago</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Selecciona el método de pago para incluir los datos correspondientes en el PDF:
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Método de Pago</InputLabel>
              <Select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                label="Método de Pago"
              >
                {paymentMethods.map((method) => (
                  <MenuItem key={method.id} value={method.id}>
                    {method.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Formato de descarga:
              </Typography>
              <RadioGroup
                value={downloadMode}
                onChange={(e) => setDownloadMode(e.target.value as 'single' | 'split' | 'individual')}
              >
                <FormControlLabel
                  value="single"
                  control={<Radio />}
                  label="PDF único (todo en un archivo)"
                />
                <FormControlLabel
                  value="split"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body2">Archivos separados (ZIP)</Typography>
                      <Typography variant="caption" color="text.secondary">
                        1 archivo con resumen + datos bancarios, y 1 archivo por cada edificio (factura + remito)
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="individual"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body2">Archivos separados (elegir carpeta)</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Elegís una carpeta y se guardan todos los archivos sueltos directamente ahí
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPaymentMethodModal(false)}>Cancelar</Button>
          <Button 
            onClick={handleConfirmDownload} 
            variant="contained"
            disabled={downloading === selectedAdminId}
          >
            {downloading === selectedAdminId ? <CircularProgress size={20} /> : 'Descargar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación para revertir factura */}
      <Dialog open={revertConfirmOpen} onClose={() => !reverting && setRevertConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Revertir factura</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            ¿Estás seguro que querés revertir la siguiente factura?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 2 }}>
            {revertInvoiceLabel}
          </Typography>
          <Alert severity="warning">
            Los servicios asociados volverán a su estado anterior y podrán ser facturados nuevamente. Esta acción solo es posible si la factura no tiene pagos registrados.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevertConfirmOpen(false)} disabled={reverting}>Cancelar</Button>
          <Button
            onClick={handleConfirmRevert}
            color="warning"
            variant="contained"
            disabled={reverting}
            startIcon={reverting ? <CircularProgress size={16} /> : <UndoIcon />}
          >
            {reverting ? 'Revirtiendo...' : 'Revertir factura'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
