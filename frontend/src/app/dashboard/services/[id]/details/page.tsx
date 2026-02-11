"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  Box, 
  Typography, 
  Paper, 
  Chip, 
  CircularProgress, 
  Alert, 
  Stack, 
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
} from "@mui/material";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EditIcon from '@mui/icons-material/Edit';
import FileViewer from '@/components/FileViewer';
import api, { cachedApi } from '@/lib/axios';

export default function ServiceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para subir remito
  const [openUploadRemito, setOpenUploadRemito] = useState(false);
  const [uploadRemitoNumber, setUploadRemitoNumber] = useState('');
  const [uploadRemitoDescription, setUploadRemitoDescription] = useState('');
  const [uploadRemitoFiles, setUploadRemitoFiles] = useState<File[]>([]);
  const [isUploadingRemito, setIsUploadingRemito] = useState(false);

  // Estados para editar factura
  const [editInvoiceOpen, setEditInvoiceOpen] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [savingInvoice, setSavingInvoice] = useState(false);

  const fetchService = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/services/${id}`);
      setService(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar el servicio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchService();
  }, [id]);

  const handleOpenUploadRemito = () => {
    setUploadRemitoNumber('');
    setUploadRemitoDescription(service?.description || '');
    setUploadRemitoFiles([]);
    setOpenUploadRemito(true);
  };

  const handleCloseUploadRemito = () => {
    setOpenUploadRemito(false);
    setUploadRemitoNumber('');
    setUploadRemitoDescription('');
    setUploadRemitoFiles([]);
  };

  const handleUploadFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setUploadRemitoFiles(Array.from(event.target.files));
    }
  };

  const handleUploadRemitoSubmit = async () => {
    if (!service || uploadRemitoFiles.length === 0) return;
    
    setIsUploadingRemito(true);
    
    const formData = new FormData();
    uploadRemitoFiles.forEach(file => {
      formData.append('receipts', file);
    });
    
    if (uploadRemitoNumber.trim()) {
      formData.append('remitoNumber', uploadRemitoNumber.trim());
    }

    if (uploadRemitoDescription !== undefined) {
      formData.append('description', uploadRemitoDescription);
    }
    
    try {
      await api.post(`/services/${service.id}/receipt`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Limpiar caché
      cachedApi.clearCacheFor('/services');
      
      handleCloseUploadRemito();
      // Recargar servicio
      const res = await api.get(`/services/${id}`);
      setService(res.data);
    } catch (err: any) {
      console.error('Error uploading remito:', err);
      alert(err.response?.data?.message || 'Error al subir el remito');
    } finally {
      setIsUploadingRemito(false);
    }
  };

  const handleOpenEditInvoice = () => {
    if (service?.invoice) {
        setEditAmount(service.invoice.amount.toString());
        setEditInvoiceOpen(true);
    }
  };

  const handleCloseEditInvoice = () => {
    setEditInvoiceOpen(false);
    setEditAmount('');
  };

  const handleSaveInvoiceChanges = async () => {
    if (!service?.invoice || !editAmount) return;

    setSavingInvoice(true);
    try {
        await api.put(`/invoices/${service.invoice.id}`, {
            amount: parseFloat(editAmount)
        });
        
        // Limpiar caché
        cachedApi.clearCacheFor('/services');
        cachedApi.clearCacheFor('/dashboard');
        
        handleCloseEditInvoice();
        // Recargar servicio
        fetchService();
    } catch (err: any) {
        console.error('Error updating invoice:', err);
        alert(err.response?.data?.message || 'Error al actualizar la factura');
    } finally {
        setSavingInvoice(false);
    }
  };

  if (loading) return <Box p={3}><CircularProgress /></Box>;
  if (error) return <Box p={3}><Alert severity="error">{error}</Alert></Box>;
  if (!service) return <Box p={3}><Alert severity="info">Servicio no encontrado</Alert></Box>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Detalle del Servicio</Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Typography variant="h6">Edificio:</Typography>
          <Typography>{service.building?.name || '-'}</Typography>
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Typography variant="h6">Dirección:</Typography>
          <Typography>{service.building?.address || '-'}</Typography>
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Typography variant="h6">Descripción:</Typography>
          <Typography>{service.description}</Typography>
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Typography variant="h6">Estado:</Typography>
          <Chip label={service.status} color={service.status === 'CON_REMITO' ? 'success' : 'warning'} />
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Typography variant="h6">Técnico asignado:</Typography>
          <Typography>{service.technician?.name || '-'}</Typography>
        </Stack>
        {service.invoice && (
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <Typography variant="h6">Monto Facturado:</Typography>
            <Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                ${service.invoice.amount}
            </Typography>
            <Tooltip title="Editar monto">
                <IconButton size="small" onClick={handleOpenEditInvoice} color="primary">
                    <EditIcon />
                </IconButton>
            </Tooltip>
            {service.invoice.status === 'PAGADA' && (
                <Chip label="PAGADA" color="success" size="small" />
            )}
           </Stack>
        )}
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Remitos</Typography>
          <Button
            variant="contained"
            color="success"
            startIcon={<CloudUploadIcon />}
            onClick={handleOpenUploadRemito}
            size="small"
          >
            Agregar Remito
          </Button>
        </Stack>
        {service.remitos && service.remitos.length > 0 ? (
          <Stack spacing={2}>
            {service.remitos.map((remito: any, idx: number) => (
              <Paper key={idx} sx={{ p: 2 }}>
                <Typography>Fecha: {remito.date ? new Date(remito.date).toLocaleDateString() : '-'}</Typography>
                <Typography>Monto: {remito.amount ? `$${remito.amount}` : '-'}</Typography>
                <Typography>Número: {remito.number || '-'}</Typography>
                {remito.receiptImages && remito.receiptImages.length > 0 && (
                  <Stack direction="row" spacing={1} mt={1}>
                    {remito.receiptImages.map((img: string, i: number) => (
                      <FileViewer 
                        key={i} 
                        fileUrl={img} 
                        alt={`Remito ${remito.number}`}
                        width={80}
                        height={80}
                      />
                    ))}
                  </Stack>
                )}
              </Paper>
            ))}
          </Stack>
        ) : (
          <Typography>No hay remitos asociados.</Typography>
        )}
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>Imágenes de Remito</Typography>
        {service.receiptImages && service.receiptImages.length > 0 ? (
          <Stack direction="row" spacing={1} mt={1}>
            {service.receiptImages.map((img: string, i: number) => (
              <FileViewer 
                key={i} 
                fileUrl={img} 
                alt="Remito"
                width={80}
                height={80}
              />
            ))}
          </Stack>
        ) : (
          <Typography>No hay imágenes de remito adjuntas.</Typography>
        )}
      </Paper>

      {/* Diálogo para subir remito adicional */}
      <Dialog open={openUploadRemito} onClose={handleCloseUploadRemito} fullWidth maxWidth="sm">
        <DialogTitle>Subir/Agregar Remito</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Typography variant="body2" color="text.secondary">
              Sube un nuevo archivo de remito. Esto agregará nuevas imágenes al remito existente.
            </Typography>

            <TextField
              label="Descripción del Servicio"
              multiline
              rows={3}
              value={uploadRemitoDescription}
              onChange={(e) => setUploadRemitoDescription(e.target.value)}
              fullWidth
              placeholder="Descripción del trabajo realizado"
            />
            
            <TextField
              label="Número de Remito (opcional)"
              value={uploadRemitoNumber}
              onChange={(e) => setUploadRemitoNumber(e.target.value)}
              fullWidth
              placeholder="Ej: REM-2024-001 (dejar vacío para auto-generar uno nuevo si no existe)"
            />
            
            <Box>
                <input
                  accept=".jpg,.jpeg,.pdf"
                  type="file"
                  multiple
                  onChange={handleUploadFileSelect}
                  style={{ display: 'none' }}
                  id="remito-upload-input-details"
              />
              <label htmlFor="remito-upload-input-details">
                <Button variant="contained" component="span">
                  📄 Seleccionar Archivos (JPG o PDF)
                </Button>
              </label>
              {uploadRemitoFiles.length > 0 && (
                <Box mt={1}>
                  <Typography variant="body2" color="success.main">
                    ✅ {uploadRemitoFiles.length} archivo(s) seleccionado(s)
                  </Typography>
                  {uploadRemitoFiles.map((file, index) => (
                    <Typography key={index} variant="caption" display="block" color="text.secondary">
                      {index + 1}. {file.name} - {(file.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadRemito}>Cancelar</Button>
          <Button 
            onClick={handleUploadRemitoSubmit} 
            disabled={isUploadingRemito || uploadRemitoFiles.length === 0} 
            variant="contained" 
            color="primary"
          >
            {isUploadingRemito ? 'Subiendo...' : 'Subir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para editar factura */}
      <Dialog open={editInvoiceOpen} onClose={handleCloseEditInvoice} fullWidth maxWidth="xs">
        <DialogTitle>Editar Factura</DialogTitle>
        <DialogContent>
            <Box mt={2}>
                <Typography variant="body2" color="text.secondary" paragraph>
                    Modificar el monto de la factura. SI la factura ya estaba pagada en efectivo, esto actualizará también el registro de pago y la deuda del edificio.
                </Typography>
                <TextField
                    label="Monto"
                    type="number"
                    fullWidth
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    InputProps={{
                        startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                    }}
                />
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={handleCloseEditInvoice}>Cancelar</Button>
            <Button 
                onClick={handleSaveInvoiceChanges} 
                variant="contained" 
                color="primary"
                disabled={savingInvoice || !editAmount}
            >
                {savingInvoice ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 