"use client";
import React, { useCallback, useEffect, useState } from "react";
import api from '@/lib/axios';
import { jsPDF } from "jspdf";
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
  TablePagination,
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
  InputAdornment,
  Stack,
  TableSortLabel,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText
} from "@mui/material";
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
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
  Edit,
  Delete,
  PictureAsPdf,
  Image as ImageIcon,
  InsertDriveFile
} from "@mui/icons-material";

type ServiceDocKind = 'invoice' | 'remito';

interface ServiceDocItem {
  key: string;
  kind: ServiceDocKind;
  sourceId: string;
  label: string;
  subtitle?: string;
  fileUrl?: string;
  isProv?: boolean;
}

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
  isPaid?: boolean | null;
  createdAt: string;
  visitDate: string | null;
  technician: {
    id: string;
    name: string;
  } | null;
  remitos: Remito[];
  invoice: Invoice | null;
  invoices?: Invoice[];
  noChargeReason: { id: string; name: string } | null;
  noChargeComment: string | null;
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
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface BuildingHistoryModalProps {
  open: boolean;
  onClose: () => void;
  buildingId: string | null;
}

// Fila memoizada para el editor de descripciones del PDF
// Evita que toda la lista se re-renderice al escribir en un solo campo
const PdfDescRow = React.memo(({ serviceId, date, value, onChange }: {
  serviceId: string;
  date: string;
  value: string;
  onChange: (id: string, value: string) => void;
}) => (
  <TableRow>
    <TableCell>{date}</TableCell>
    <TableCell>
      <TextField
        fullWidth
        size="small"
        multiline
        rows={2}
        value={value}
        onChange={(e) => onChange(serviceId, e.target.value)}
      />
    </TableCell>
  </TableRow>
));
PdfDescRow.displayName = 'PdfDescRow';

const BuildingHistoryModal: React.FC<BuildingHistoryModalProps> = ({
  open,
  onClose,
  buildingId
}) => {
  const [data, setData] = useState<BuildingHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  
  // Pagination & Filtering
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Sort state
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Delete Service State
  const [deleteServiceOpen, setDeleteServiceOpen] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [deletingService, setDeletingService] = useState(false);

  // Modal de documentos del servicio
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [docsModalItems, setDocsModalItems] = useState<ServiceDocItem[]>([]);
  const [docsModalSelectedKey, setDocsModalSelectedKey] = useState<string | null>(null);
  const [docsModalTitle, setDocsModalTitle] = useState('Documentos del servicio');

  // Edit Remito Date State
  const [editingRemitoId, setEditingRemitoId] = useState<string | null>(null);
  const [editingRemitoDate, setEditingRemitoDate] = useState<string>('');
  const [savingRemitoDate, setSavingRemitoDate] = useState(false);

  const handleEditRemitoDate = (remitoId: string, currentDate: string) => {
    // currentDate is ISO string, extract YYYY-MM-DD for input
    const match = currentDate.match(/^(\d{4}-\d{2}-\d{2})/);
    setEditingRemitoDate(match ? match[1] : '');
    setEditingRemitoId(remitoId);
  };

  const handleSaveRemitoDate = async (remitoId: string) => {
    if (!editingRemitoDate) return;
    setSavingRemitoDate(true);
    try {
      const token = localStorage.getItem('token');
      await api.patch(`/remitos/${remitoId}`, { date: editingRemitoDate }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingRemitoId(null);
      fetchHistory();
    } catch (err) {
      console.error('Error al actualizar fecha:', err);
    } finally {
      setSavingRemitoDate(false);
    }
  };

  // PDF description editor state
  const [pdfEditOpen, setPdfEditOpen] = useState(false);
  const [pdfDescriptions, setPdfDescriptions] = useState<Record<string, string>>({});
  const [pdfServices, setPdfServices] = useState<Service[]>([]);
  const [pdfServicesLoading, setPdfServicesLoading] = useState(false);
  const [pdfPage, setPdfPage] = useState(0);
  const pdfRowsPerPage = 10;

  const handlePdfDescChange = useCallback((id: string, value: string) => {
    setPdfDescriptions((prev) => ({ ...prev, [id]: value }));
  }, []);

  // Edit Invoice State
  const [editInvoiceOpen, setEditInvoiceOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<{id: string, amount: number} | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [errorEdit, setErrorEdit] = useState<string | null>(null);

  useEffect(() => {
    if (open && buildingId) {
      setPage(0); // Reset page on open
      fetchHistory();
    }
  }, [open, buildingId]);
  
  // Refetch when pagination changes
  useEffect(() => {
    if (open && buildingId && data) { // Only if already loaded
      fetchHistory();
    }
  }, [page, rowsPerPage]);

  const fetchHistory = async () => {
    if (!buildingId) return;
    
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      params.append('page', (page + 1).toString());
      params.append('limit', rowsPerPage.toString());
      if (dateFrom) params.append('startDate', dateFrom);
      if (dateTo) params.append('endDate', dateTo);

      const response = await api.get(`/buildings/${buildingId}/service-history`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setData(response.data);
    } catch (err) {
      console.error("Error al cargar historial:", err);
      setError("Error al cargar el historial de servicios");
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setPage(0); // Reset page when filtering
    fetchHistory();
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleExportPDF = async () => {
    if (!data || !buildingId) return;

    setPdfServicesLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '1000');
      if (dateFrom) params.append('startDate', dateFrom);
      if (dateTo) params.append('endDate', dateTo);

      const response = await api.get(`/buildings/${buildingId}/service-history`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      const allServices: Service[] = response.data.services;
      setPdfServices(allServices);

      const buildingName = data.building.name;
      const buildingAddress = data.building.address;
      const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const initialDescs: Record<string, string> = {};
      allServices.forEach((service) => {
        let rawDesc = service.description || service.name || '';
        rawDesc = rawDesc
          .replace(/^servicio[:\s\-]*/i, '')
          .replace(/\bservicio\b/gi, '')
          .replace(new RegExp(escapeRegex(buildingName), 'gi'), '')
          .replace(new RegExp(escapeRegex(buildingAddress), 'gi'), '')
          .replace(/\s{2,}/g, ' ')
          .replace(/^[\s\-]+|[\s\-]+$/g, '')
          .trim();
        initialDescs[service.id] = rawDesc || '-';
      });

      setPdfDescriptions(initialDescs);
      setPdfPage(0);
      setPdfEditOpen(true);
    } catch (err) {
      console.error('Error cargando servicios para PDF:', err);
    } finally {
      setPdfServicesLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!data || !pdfServices.length) return;

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    const companyEmail = 'garciacoelho@hotmail.com';
    const companyPhone = '11 3834-1046';
    const todayIso = new Date().toISOString();
    const today = formatDate(todayIso);

    // Cargar logo
    let logoImg: HTMLImageElement | null = null;
    try {
      const imgEl = new Image();
      imgEl.src = '/logo.png';
      await new Promise<void>((resolve) => {
        imgEl.onload = () => { logoImg = imgEl; resolve(); };
        imgEl.onerror = () => resolve();
      });
    } catch (_) { /* logo no crítico */ }

    const buildingName = data.building.name;
    const buildingAddress = data.building.address;

    // Calcula y inicial tras el header de primera página
    const drawFirstPageHeader = (): number => {
      let y = 10;

      // Logo centrado y grande
      if (logoImg) {
        const logoW = 55;
        const logoH = logoImg.naturalWidth > 0
          ? (logoImg.naturalHeight / logoImg.naturalWidth) * logoW
          : 22;
        const logoX = (pageW - logoW) / 2;
        doc.addImage(logoImg, 'PNG', logoX, y, logoW, logoH);
        y += logoH + 6;
      } else {
        y += 10;
      }

      // Email y teléfono a la izquierda; fecha a la derecha, misma altura
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(companyEmail, margin, y);
      doc.text(today, pageW - margin, y, { align: 'right' });
      y += 5;
      doc.text(companyPhone, margin, y);
      y += 9;

      // Título con dirección del edificio
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Historial de Servicios - ${buildingAddress}`, pageW / 2, y, { align: 'center' });
      y += 6;

      if (dateFrom || dateTo) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Período: ${dateFrom || 'Inicio'} - ${dateTo || 'Actualidad'}`, pageW / 2, y, { align: 'center' });
        y += 6;
      }

      y += 3;
      return y;
    };

    const drawTableHeader = (y: number): number => {
      doc.setFontSize(9);
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, pageW - margin * 2, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Fecha', margin + 1, y + 5);
      doc.text('Descripción', margin + 34, y + 5);
      return y + 10;
    };

    let y = drawFirstPageHeader();
    y = drawTableHeader(y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    pdfServices.forEach((service) => {
      if (y > 272) {
        doc.addPage();
        y = 14;
        y = drawTableHeader(y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }

      const date = service.remitos?.[0]?.date ? formatDate(service.remitos[0].date) : '-';

      // Usar la descripción editada para este PDF
      const descLines = doc.splitTextToSize(pdfDescriptions[service.id] ?? '-', pageW - margin * 2 - 36);

      doc.text(date, margin + 1, y);
      doc.text(descLines, margin + 34, y);

      const lineHeight = descLines.length * 5;
      y += Math.max(11, lineHeight + 7);

      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y - 5, pageW - margin, y - 5);
    });

    doc.save(`Historial_${buildingAddress.replace(/\s+/g, '_')}.pdf`);
    setPdfEditOpen(false);
  };

  const handleDeleteServiceClick = (serviceId: string) => {
    setDeletingServiceId(serviceId);
    setDeleteServiceOpen(true);
  };

  const handleDeleteServiceClose = () => {
    setDeleteServiceOpen(false);
    setDeletingServiceId(null);
  };

  const handleConfirmDeleteService = async () => {
    if (!deletingServiceId) return;
    setDeletingService(true);
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/services/${deletingServiceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchHistory();
      handleDeleteServiceClose();
    } catch (err: any) {
      console.error('Error eliminando servicio:', err);
      alert(err?.response?.data?.message || 'Error al eliminar el servicio');
    } finally {
      setDeletingService(false);
    }
  };

  const handleEditClick = (invoice: {id: string, amount: number}) => {
    setSelectedInvoice(invoice);
    setEditAmount(invoice.amount.toString());
    setInvoiceFile(null);
    setEditInvoiceOpen(true);
    setErrorEdit(null);
  };

  const handleEditClose = () => {
    setEditInvoiceOpen(false);
    setSelectedInvoice(null);
    setEditAmount('');
    setInvoiceFile(null);
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
      
      const formData = new FormData();
      formData.append('amount', amount.toString());
      if (invoiceFile) {
        formData.append('file', invoiceFile);
      }
      
      await api.put(`/invoices/${selectedInvoice.id}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
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
      'FACTURADO_PARCIAL': 'warning',
      'FACTURADO': 'success',
      'PAGADO': 'success',
      'ANULADO': 'error'
    };
    return statusMap[status] || 'default';
  };

  const getServiceInvoices = (service: Service): Invoice[] => {
    if (service.invoices && service.invoices.length > 0) return service.invoices;
    return service.invoice ? [service.invoice] : [];
  };

  /** Factura informal/provisoria: status PENDIENTE (cobro sin PDF). */
  const isProvInvoice = (invoice: Invoice) => invoice.status === 'PENDIENTE';

  const formatInvoiceChipLabel = (invoice: Invoice) => {
    const num = invoice.number?.trim() || invoice.id.substring(0, 8);
    return isProvInvoice(invoice) ? `Prov #${num}` : `Factura #${num}`;
  };

  const formatRemitoChipLabel = (remito: Remito) =>
    `Remito #${remito.number?.trim() || remito.id.substring(0, 8)}`;

  const getFileKind = (url?: string) => {
    if (!url) return 'none';
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    return 'other';
  };

  const buildServiceDocItems = (service: Service): ServiceDocItem[] => {
    const invoices = getServiceInvoices(service);
    const items: ServiceDocItem[] = [];

    for (const invoice of invoices) {
      items.push({
        key: `invoice-${invoice.id}`,
        kind: 'invoice',
        sourceId: invoice.id,
        label: formatInvoiceChipLabel(invoice),
        subtitle: invoice.date ? formatDate(invoice.date) : undefined,
        fileUrl: invoice.fileUrl,
        isProv: isProvInvoice(invoice)
      });
    }

    for (const remito of service.remitos) {
      const images = remito.receiptImages?.filter(Boolean) || [];
      if (images.length === 0) {
        items.push({
          key: `remito-${remito.id}`,
          kind: 'remito',
          sourceId: remito.id,
          label: formatRemitoChipLabel(remito),
          subtitle: remito.date ? formatDate(remito.date) : undefined
        });
      } else {
        images.forEach((url, idx) => {
          items.push({
            key: `remito-${remito.id}-${idx}`,
            kind: 'remito',
            sourceId: remito.id,
            label:
              images.length > 1
                ? `${formatRemitoChipLabel(remito)} (${idx + 1}/${images.length})`
                : formatRemitoChipLabel(remito),
            subtitle: remito.date ? formatDate(remito.date) : undefined,
            fileUrl: url
          });
        });
      }
    }

    return items;
  };

  const openServiceDocuments = (
    service: Service,
    focus: { kind: ServiceDocKind; sourceId: string }
  ) => {
    const items = buildServiceDocItems(service);
    if (items.length === 0) return;

    const focused = items.filter(
      (item) => item.kind === focus.kind && item.sourceId === focus.sourceId
    );
    const rest = items.filter(
      (item) => !(item.kind === focus.kind && item.sourceId === focus.sourceId)
    );
    const ordered = [...focused, ...rest];

    setDocsModalItems(ordered);
    setDocsModalSelectedKey(ordered[0]?.key || null);
    setDocsModalTitle(`Documentos — ${service.name}`);
    setDocsModalOpen(true);
  };

  const closeServiceDocuments = () => {
    setDocsModalOpen(false);
    setDocsModalItems([]);
    setDocsModalSelectedKey(null);
  };

  const selectedDoc =
    docsModalItems.find((item) => item.key === docsModalSelectedKey) || docsModalItems[0] || null;



  // Determine modal content
  let modalContent = null;
  if (loading) {
    modalContent = (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
         <CircularProgress />
      </Box>
    );
  } else if (error) {
    modalContent = <Alert severity="error">{error}</Alert>;
  } else if (data) {
    modalContent = (
      <Box>
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
              <Card 
                sx={{ cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.02)' } }}
                onClick={() => document.getElementById('services-list')?.scrollIntoView({ behavior: 'smooth' })}
              >
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
            <Box id="services-list" sx={{ mt: 4, mb: 2 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}>
                <Typography variant="h6">
                  Servicios ({data.pagination?.total || data.services.length})
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                  <TextField 
                    label="Desde" 
                    type="date" 
                    size="small"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)} 
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 140 }}
                  />
                  <TextField 
                    label="Hasta" 
                    type="date" 
                    size="small"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)} 
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 140 }}
                  />
                  <Button variant="outlined" onClick={handleFilter}>
                    Filtrar
                  </Button>
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    startIcon={<Download />}
                    onClick={handleExportPDF}
                    disabled={pdfServicesLoading}
                  >
                    {pdfServicesLoading ? 'Cargando...' : 'PDF'}
                  </Button>
                </Stack>
              </Stack>
            </Box>
            
            {data.services.length === 0 ? (
              <Alert severity="info">No hay servicios registrados para este edificio</Alert>
            ) : (
              <>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={50}></TableCell>
                      <TableCell sortDirection={sortOrder}>
                        <TableSortLabel
                          active
                          direction={sortOrder}
                          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        >
                          Fecha
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell>Técnico</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell align="right">Monto</TableCell>
                      <TableCell>Documentos</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...data.services].sort((a, b) => {
                      const dateA = a.remitos?.[0]?.date ? new Date(a.remitos[0].date).getTime() : 0;
                      const dateB = b.remitos?.[0]?.date ? new Date(b.remitos[0].date).getTime() : 0;
                      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                    }).map((service) => {
                      const isExpanded = expandedServices.has(service.id);
                      const serviceInvoices = getServiceInvoices(service);
                      const totalService = serviceInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0)
                        + service.remitos.reduce((sum, r) => sum + r.amount, 0);
                      const hasDocuments = serviceInvoices.length > 0 || service.remitos.length > 0 || (service.status === 'SIN_COBRO' && (service.noChargeReason || service.noChargeComment));
                      
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
                            <TableCell sx={{ minWidth: 140 }}>
                              {service.remitos?.[0]?.date ? (
                                editingRemitoId === service.remitos[0].id ? (
                                  <Box display="flex" alignItems="center" gap={0.5}>
                                    <TextField
                                      type="date"
                                      size="small"
                                      value={editingRemitoDate}
                                      onChange={e => setEditingRemitoDate(e.target.value)}
                                      disabled={savingRemitoDate}
                                      sx={{ width: 140 }}
                                      inputProps={{ style: { fontSize: 13, padding: '4px 6px' } }}
                                    />
                                    <IconButton size="small" color="success" disabled={savingRemitoDate} onClick={() => handleSaveRemitoDate(service.remitos[0].id)}>
                                      <CheckCircle fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" disabled={savingRemitoDate} onClick={() => setEditingRemitoId(null)}>
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Box>
                                ) : (
                                  <Box display="flex" alignItems="center" gap={0.5}>
                                    <Typography variant="body2">{formatDate(service.remitos[0].date)}</Typography>
                                    <IconButton size="small" onClick={() => handleEditRemitoDate(service.remitos[0].id, service.remitos[0].date)}>
                                      <Edit fontSize="small" />
                                    </IconButton>
                                  </Box>
                                )
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {service.name} - {data.building.address}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {service.description}
                              </Typography>
                            </TableCell>
                            <TableCell>{service.technician?.name || '-'}</TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                                <Chip
                                  label={service.status}
                                  color={getStatusColor(service.status)}
                                  size="small"
                                />
                                {typeof service.isPaid === 'boolean' && (
                                  <Chip
                                    label={service.isPaid ? 'Pagado' : 'No pagado'}
                                    color={service.isPaid ? 'success' : 'error'}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell align="right">
                              {totalService > 0 ? formatCurrency(totalService) : '-'}
                            </TableCell>
                            <TableCell>
                              <Box display="flex" gap={0.5} alignItems="center" flexWrap="wrap">
                                {serviceInvoices.map((invoice) => (
                                  <Chip
                                    key={invoice.id}
                                    icon={<Description />}
                                    label={formatInvoiceChipLabel(invoice)}
                                    size="small"
                                    color="secondary"
                                    clickable
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openServiceDocuments(service, {
                                        kind: 'invoice',
                                        sourceId: invoice.id
                                      });
                                    }}
                                    title="Ver documentos del servicio"
                                  />
                                ))}
                                {service.remitos.map((remito) => (
                                  <Chip
                                    key={remito.id}
                                    icon={<Receipt />}
                                    label={formatRemitoChipLabel(remito)}
                                    size="small"
                                    color="warning"
                                    clickable
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openServiceDocuments(service, {
                                        kind: 'remito',
                                        sourceId: remito.id
                                      });
                                    }}
                                    title="Ver documentos del servicio"
                                  />
                                ))}
                                {service.status === 'CON_REMITO' && serviceInvoices.length === 0 && (
                                  <IconButton
                                    size="small"
                                    color="error"
                                    title="Eliminar servicio"
                                    onClick={() => handleDeleteServiceClick(service.id)}
                                  >
                                    <Delete fontSize="small" sx={{ fontSize: '1rem' }} />
                                  </IconButton>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                          {hasDocuments && (
                            <TableRow>
                              <TableCell colSpan={7} sx={{ py: 0, borderBottom: isExpanded ? 1 : 0 }}>
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                  <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                                    {/* Facturas */}
                                    {serviceInvoices.map((invoice) => (
                                      <Box mb={2} key={invoice.id}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                          <Typography variant="subtitle2" color="secondary">
                                            <Description fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                                            {isProvInvoice(invoice) ? 'Prov' : 'Factura'} #{invoice.number || invoice.id.substring(0, 8)}
                                          </Typography>
                                          {invoice.fileUrl && (
                                            <IconButton
                                              size="small"
                                              color="primary"
                                              onClick={() => window.open(invoice.fileUrl, '_blank')}
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
                                                {formatDate(invoice.date)}
                                              </Typography>
                                            </Box>
                                            <Box>
                                              <Typography variant="caption" color="text.secondary">
                                                Monto
                                              </Typography>
                                              <Box display="flex" alignItems="center">
                                                <Typography variant="body2" fontWeight="bold">
                                                  {formatCurrency(invoice.amount)}
                                                </Typography>
                                                <IconButton
                                                  size="small"
                                                  color="primary"
                                                  onClick={() => handleEditClick({
                                                    id: invoice.id,
                                                    amount: invoice.amount
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
                                                label={invoice.status}
                                                size="small"
                                                color={invoice.status === 'PAGADO' ? 'success' : 'warning'}
                                              />
                                            </Box>
                                            <Box>
                                              <Typography variant="caption" color="text.secondary">
                                                Pagos
                                              </Typography>
                                              <Typography variant="body2">
                                                {formatCurrency(
                                                  invoice.payments.reduce((sum, p) => sum + p.amount, 0)
                                                )}
                                              </Typography>
                                            </Box>
                                          </Box>
                                          
                                          {invoice.payments.length > 0 && (
                                            <Box mt={2}>
                                              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                                Detalle de pagos:
                                              </Typography>
                                              {invoice.payments.map((payment) => (
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
                                    ))}

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

                                    {/* Sin Cobro Económico */}
                                    {service.status === 'SIN_COBRO' && (service.noChargeReason || service.noChargeComment) && (
                                      <Box mt={service.remitos.length > 0 || serviceInvoices.length > 0 ? 2 : 0}>
                                        <Typography variant="subtitle2" gutterBottom sx={{ color: 'success.main' }}>
                                          <CheckCircle fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                                          Sin Cobro Económico
                                        </Typography>
                                        <Paper sx={{ p: 2, border: '1px solid', borderColor: 'success.light', bgcolor: 'success.50' }}>
                                          {service.noChargeReason && (
                                            <Box mb={service.noChargeComment ? 1.5 : 0}>
                                              <Typography variant="caption" color="text.secondary" display="block">
                                                Motivo
                                              </Typography>
                                              <Typography variant="body2" fontWeight="medium">
                                                {service.noChargeReason.name}
                                              </Typography>
                                            </Box>
                                          )}
                                          {service.noChargeComment && (
                                            <Box>
                                              <Typography variant="caption" color="text.secondary" display="block">
                                                Comentarios
                                              </Typography>
                                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                                {service.noChargeComment}
                                              </Typography>
                                            </Box>
                                          )}
                                        </Paper>
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
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={data.pagination?.total || data.services.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Filas por página"
              />
              </>
            )}
      </Box>
    );
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
        <DialogTitle>
          <Typography variant="h5" component="div">
            Historial de Servicios{data?.building?.address ? ` - ${data.building.address}` : ''}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {modalContent}
        </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>

    <Dialog
      open={docsModalOpen}
      onClose={closeServiceDocuments}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '85vh', display: 'flex', flexDirection: 'column' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" component="div">{docsModalTitle}</Typography>
        <Typography variant="caption" color="text.secondary">
          Vista previa a la izquierda · todos los archivos del servicio a la derecha
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Box display="flex" flex={1} minHeight={480} height="100%">
          <Box
            flex={1}
            minWidth={0}
            sx={{
              bgcolor: 'grey.100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2,
              borderRight: '1px solid',
              borderColor: 'divider'
            }}
          >
            {!selectedDoc ? (
              <Typography color="text.secondary">Sin documentos</Typography>
            ) : !selectedDoc.fileUrl ? (
              <Box textAlign="center" px={3}>
                <InsertDriveFile sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                <Typography variant="subtitle1" gutterBottom>
                  {selectedDoc.label}
                </Typography>
                <Typography color="text.secondary">
                  {selectedDoc.isProv
                    ? 'Cobro provisorio sin archivo PDF asociado.'
                    : 'Este documento no tiene archivo adjunto.'}
                </Typography>
              </Box>
            ) : getFileKind(selectedDoc.fileUrl) === 'pdf' ? (
              <Box
                component="iframe"
                src={selectedDoc.fileUrl}
                title={selectedDoc.label}
                sx={{ width: '100%', height: '100%', border: 0, borderRadius: 1, bgcolor: 'white' }}
              />
            ) : getFileKind(selectedDoc.fileUrl) === 'image' ? (
              <Box
                component="img"
                src={selectedDoc.fileUrl}
                alt={selectedDoc.label}
                sx={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: 1,
                  boxShadow: 1
                }}
              />
            ) : (
              <Box textAlign="center">
                <Typography gutterBottom>{selectedDoc.label}</Typography>
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  href={selectedDoc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir archivo
                </Button>
              </Box>
            )}
          </Box>

          <Box
            width={300}
            flexShrink={0}
            sx={{ overflowY: 'auto', bgcolor: 'background.paper' }}
          >
            <Box px={2} py={1.5} borderBottom="1px solid" borderColor="divider">
              <Typography variant="subtitle2">
                Archivos ({docsModalItems.length})
              </Typography>
            </Box>
            <List dense disablePadding>
              {docsModalItems.map((item) => {
                const selected = item.key === (selectedDoc?.key);
                const kind = getFileKind(item.fileUrl);
                return (
                  <ListItemButton
                    key={item.key}
                    selected={selected}
                    onClick={() => setDocsModalSelectedKey(item.key)}
                    alignItems="flex-start"
                  >
                    <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                      {item.kind === 'invoice' ? (
                        kind === 'pdf' ? <PictureAsPdf color="error" fontSize="small" /> : <Description color="secondary" fontSize="small" />
                      ) : kind === 'image' ? (
                        <ImageIcon color="primary" fontSize="small" />
                      ) : (
                        <Receipt color="warning" fontSize="small" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      secondary={item.subtitle || (item.fileUrl ? undefined : 'Sin archivo')}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: selected ? 600 : 400
                      }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        {selectedDoc?.fileUrl && (
          <Button
            startIcon={<Download />}
            href={selectedDoc.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir en pestaña
          </Button>
        )}
        <Button onClick={closeServiceDocuments}>Cerrar</Button>
      </DialogActions>
    </Dialog>

    <Dialog open={deleteServiceOpen} onClose={handleDeleteServiceClose} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar Servicio</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            ¿Estás seguro que querés eliminar este servicio? Se eliminarán también todos sus remitos asociados. Esta acción no se puede deshacer.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteServiceClose} disabled={deletingService}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDeleteService}
            variant="contained"
            color="error"
            disabled={deletingService}
          >
            {deletingService ? 'Eliminando...' : 'Eliminar'}
          </Button>
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
            
            <Box mt={2} mb={1}>
              <Typography variant="subtitle2" gutterBottom>
                Actualizar archivo de factura
              </Typography>
              <input
                accept="application/pdf,image/*"
                style={{ display: 'none' }}
                id="invoice-file-upload"
                type="file"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setInvoiceFile(e.target.files[0]);
                  }
                }}
              />
              <label htmlFor="invoice-file-upload">
                <Button variant="outlined" component="span" fullWidth>
                  {invoiceFile ? invoiceFile.name : 'Seleccionar Archivo'}
                </Button>
              </label>
              {invoiceFile && (
                <Button 
                  size="small" 
                  color="warning" 
                  onClick={() => setInvoiceFile(null)}
                  sx={{ mt: 1 }}
                >
                  Quitar archivo seleccionado
                </Button>
              )}
            </Box>
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

    {/* Diálogo edición de descripciones para PDF */}
    <Dialog open={pdfEditOpen} onClose={() => setPdfEditOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography component="div" variant="h6">Editar descripciones para el PDF</Typography>
        <Typography component="div" variant="body2" color="text.secondary">
          Podés modificar el texto de cada servicio. Los cambios solo aplican al PDF que se va a generar.
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 110, fontWeight: 'bold' }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Descripción (solo para este PDF)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...pdfServices].sort((a, b) => {
              const dateA = a.remitos?.[0]?.date ? new Date(a.remitos[0].date).getTime() : 0;
              const dateB = b.remitos?.[0]?.date ? new Date(b.remitos[0].date).getTime() : 0;
              return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            }).slice(pdfPage * pdfRowsPerPage, (pdfPage + 1) * pdfRowsPerPage).map((service) => (
              <PdfDescRow
                key={service.id}
                serviceId={service.id}
                date={service.remitos?.[0]?.date ? formatDate(service.remitos[0].date) : '-'}
                value={pdfDescriptions[service.id] ?? ''}
                onChange={handlePdfDescChange}
              />
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={pdfServices.length}
          page={pdfPage}
          rowsPerPage={pdfRowsPerPage}
          rowsPerPageOptions={[pdfRowsPerPage]}
          onPageChange={(_, newPage) => setPdfPage(newPage)}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setPdfEditOpen(false)}>Cancelar</Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<Download />}
          onClick={handleGeneratePDF}
        >
          Generar PDF
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default BuildingHistoryModal;
