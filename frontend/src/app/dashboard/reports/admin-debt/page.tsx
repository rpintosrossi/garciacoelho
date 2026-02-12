'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Stack,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Business as BuildingIcon,
  AttachMoney as MoneyIcon,
  PictureAsPdf as PdfIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import api from '@/lib/axios';
import { formatCurrency } from '@/utils/formatCurrency';
import { cachedApi } from '@/lib/axios';

interface DebtReport {
  administratorId: string;
  administratorName: string;
  administratorEmail: string;
  totalDebt: number;
  buildings: {
    buildingId: string;
    buildingName: string;
    debt: number;
    pendingDocuments: {
      id: string;
      type: 'FACTURA' | 'REMITO';
      amount: number;
      date: string;
      description: string;
    }[];
  }[];
}

export default function AdminDebtReport() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<DebtReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]); // Refetch on date change, manual search for text

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await api.get('/reports/admin-debt', { params });
      setReports(response.data);
    } catch (err) {
      setError('Error al cargar el reporte de deuda de administradores');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (adminId: string, adminName: string) => {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await api.get(`/reports/admin-debt/${adminId}/pdf`, {
        params,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Resumen_Deuda_${adminName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PDF', error);
      alert('Error al descargar el PDF');
    }
  };

  const getTotalDebt = () => {
    return reports.reduce((sum, report) => sum + report.totalDebt, 0);
  };

  const getTotalAdministrators = () => {
    return reports.length;
  };

  const getTotalBuildings = () => {
    return reports.reduce((sum, report) => sum + report.buildings.length, 0);
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
        Reporte de Deuda de Administradores
      </Typography>
      
      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            label="Buscar Administrador"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchReport()}
            fullWidth
          />
          <TextField
            label="Desde"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <TextField
            label="Hasta"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Button 
            variant="contained" 
            startIcon={<SearchIcon />}
            onClick={() => fetchReport()}
          >
            Filtrar
          </Button>
          {(startDate || endDate || searchQuery) && (
            <Button 
              variant="outlined"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearchQuery('');
                // El efecto se encargará de recargar si cambian las fechas
                if (!startDate && !endDate) fetchReport(); // Si solo era texto, forzar recarga
              }}
            >
              Limpiar
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Resumen */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <AssignmentIcon color="error" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6" color="error">
                  {getTotalAdministrators()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Administradores con Deuda
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <BuildingIcon color="warning" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6" color="warning.main">
                  {getTotalBuildings()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Edificios con Deuda
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <MoneyIcon color="error" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6" color="error">
                  {formatCurrency(getTotalDebt())}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Deuda Total
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {reports.length === 0 ? (
        <Alert severity="info">
          No hay administradores con deuda pendiente.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Administrador</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Edificios con Deuda</TableCell>
                <TableCell>Deuda Total</TableCell>
                <TableCell>Acciones</TableCell>
                <TableCell>Documentos Pendientes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.administratorId}>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {report.administratorName}
                    </Typography>
                  </TableCell>
                  <TableCell>{report.administratorEmail}</TableCell>
                  <TableCell>
                    <Chip 
                      label={report.buildings.length} 
                      color="warning" 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" color="error" fontWeight="bold">
                      {formatCurrency(report.totalDebt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Descargar Resumen PDF">
                      <IconButton 
                        color="primary"
                        onClick={() => handleDownloadPDF(report.administratorId, report.administratorName)}
                      >
                        <PdfIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Box>
                      {report.buildings.map((building) => (
                        <Box key={building.buildingId} mb={1}>
                          <Typography variant="caption" fontWeight="bold" display="block">
                            {building.buildingName}
                          </Typography>
                          <Typography variant="caption" color="error">
                            Deuda: {formatCurrency(building.debt)}
                          </Typography>
                          {building.pendingDocuments.map((doc) => (
                            <Box key={doc.id} ml={2} mt={0.5}>
                              <Typography variant="caption" display="block">
                                {doc.type === 'FACTURA' ? '📄' : '📋'} {doc.type} - {formatCurrency(doc.amount)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {new Date(doc.date).toLocaleDateString()} - {doc.description}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
} 