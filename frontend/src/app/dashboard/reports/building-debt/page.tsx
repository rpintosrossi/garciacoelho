'use client';

import { useState, useEffect, useMemo } from 'react';
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
  TextField,
  Pagination,
  InputAdornment
} from '@mui/material';
import {
  Business as BuildingIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { formatCurrency } from '@/utils/formatCurrency';
import { cachedApi } from '@/lib/axios';

const PAGE_SIZE = 10;

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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await cachedApi.get('/reports/building-debt');
      setReports(response.data);
    } catch (err) {
      setError('Error al cargar el reporte de deuda de edificios');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(r =>
      r.buildingName.toLowerCase().includes(q) ||
      r.buildingAddress.toLowerCase().includes(q) ||
      r.administratorName.toLowerCase().includes(q)
    );
  }, [reports, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const getTotalDebt = () => reports.reduce((sum, r) => sum + r.totalDebt, 0);
  const getTotalBuildings = () => reports.length;
  const getTotalDocuments = () => reports.reduce((sum, r) => sum + r.pendingDocuments.length, 0);

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

      {/* Buscador */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar por edificio, dirección o administrador..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />
      </Paper>

      {reports.length === 0 ? (
        <Alert severity="info">
          No hay edificios con deuda pendiente.
        </Alert>
      ) : filtered.length === 0 ? (
        <Alert severity="info">
          No se encontraron resultados para "{search}".
        </Alert>
      ) : (
        <>
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
              {paginated.map((report) => (
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
        {totalPages > 1 && (
          <Box display="flex" justifyContent="center" alignItems="center" mt={2} gap={2}>
            <Typography variant="body2" color="text.secondary">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} — Página {page} de {totalPages}
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, v) => setPage(v)}
              color="primary"
              size="small"
            />
          </Box>
        )}
        </>
      )}
    </Box>
  );
} 