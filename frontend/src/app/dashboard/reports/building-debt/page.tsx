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
  CardContent
} from '@mui/material';
import {
  Business as BuildingIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import api from '@/lib/axios';
import { formatCurrency } from '@/utils/formatCurrency';

interface BuildingDebtReport {
  buildingId: string;
  buildingName: string;
  buildingAddress: string;
  administratorName: string;
  administratorEmail: string;
  totalDebt: number;
  pendingDocuments: {
    id: string;
    type: 'FACTURA' | 'REMITO';
    amount: number;
    date: string;
    description: string;
  }[];
}

export default function BuildingDebtReport() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<BuildingDebtReport[]>([]);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await api.get('/reports/building-debt', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(response.data);
    } catch (err) {
      setError('Error al cargar el reporte de deuda de edificios');
    } finally {
      setLoading(false);
    }
  };

  const getTotalDebt = () => {
    return reports.reduce((sum, report) => sum + report.totalDebt, 0);
  };

  const getTotalBuildings = () => {
    return reports.length;
  };

  const getTotalDocuments = () => {
    return reports.reduce((sum, report) => sum + report.pendingDocuments.length, 0);
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
        Reporte de Deuda de Edificios
      </Typography>
      
      {/* Resumen */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <BuildingIcon color="error" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6" color="error">
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
              <PersonIcon color="warning" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6" color="warning.main">
                  {getTotalDocuments()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Documentos Pendientes
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
          No hay edificios con deuda pendiente.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Edificio</TableCell>
                <TableCell>Dirección</TableCell>
                <TableCell>Administrador</TableCell>
                <TableCell>Deuda Total</TableCell>
                <TableCell>Documentos Pendientes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.buildingId}>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {report.buildingName}
                    </Typography>
                  </TableCell>
                  <TableCell>{report.buildingAddress}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {report.administratorName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {report.administratorEmail}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" color="error" fontWeight="bold">
                      {formatCurrency(report.totalDebt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Chip 
                        label={report.pendingDocuments.length} 
                        color="warning" 
                        size="small" 
                        sx={{ mb: 1 }}
                      />
                      {report.pendingDocuments.map((doc) => (
                        <Box key={doc.id} mb={1}>
                          <Typography variant="caption" display="block">
                            {doc.type === 'FACTURA' ? '📄' : '📋'} {doc.type} - {formatCurrency(doc.amount)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {new Date(doc.date).toLocaleDateString()} - {doc.description}
                          </Typography>
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