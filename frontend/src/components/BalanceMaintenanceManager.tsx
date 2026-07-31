'use client';

import React, { useState } from 'react';
import api from '@/lib/axios';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Snackbar,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { formatCurrency } from '@/utils/formatCurrency';

interface RecalcResult {
  buildingId: string;
  name: string;
  balance: number;
  totalInvoiced: number;
  totalPaid: number;
  totalDiscounts: number;
}

export default function BalanceMaintenanceManager() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ updated: number; results: RecalcResult[] } | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleRecalculate = async () => {
    const confirmed = window.confirm(
      '¿Recalcular los saldos de todos los edificios?\n\nEsto corrige saldos desactualizados o mal calculados según facturas y pagos reales. Puede tardar unos segundos.'
    );
    if (!confirmed) return;

    setLoading(true);
    setResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await api.post(
        '/buildings/recalculate-balances',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult({ updated: res.data.updated, results: res.data.results || [] });
      setSnackbar({
        open: true,
        message: res.data.message || `Se recalcularon ${res.data.updated} saldos`,
        severity: 'success',
      });
    } catch (error: any) {
      console.error('Error al recalcular saldos:', error);
      setSnackbar({
        open: true,
        message: error?.response?.data?.message || 'Error al recalcular saldos',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const negativeBalances = result?.results.filter((r) => r.balance < -0.01) || [];
  const withDebt = result?.results.filter((r) => r.balance > 0.01) || [];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Saldos de edificios
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 640 }}>
        Recalcula el saldo de cada edificio a partir de sus facturas y pagos.
        En pagos masivos con descuento, solo se aplica la parte proporcional
        de cada edificio (no el descuento completo del pago).
      </Typography>

      <Button
        variant="contained"
        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Refresh />}
        onClick={handleRecalculate}
        disabled={loading}
      >
        {loading ? 'Recalculando...' : 'Refrescar saldos'}
      </Button>

      {result && (
        <Paper sx={{ mt: 3, p: 2 }} variant="outlined">
          <Alert severity="success" sx={{ mb: 2 }}>
            Se actualizaron <strong>{result.updated}</strong> edificios.
            Con deuda: {withDebt.length}. Con saldo a favor: {negativeBalances.length}.
          </Alert>

          {withDebt.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Edificios con deuda (muestra hasta 15)
              </Typography>
              {withDebt.slice(0, 15).map((r) => (
                <Typography key={r.buildingId} variant="body2">
                  {r.name}: {formatCurrency(r.balance)}
                </Typography>
              ))}
              {withDebt.length > 15 && (
                <Typography variant="caption" color="text.secondary">
                  … y {withDebt.length - 15} más
                </Typography>
              )}
            </Box>
          )}
        </Paper>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
