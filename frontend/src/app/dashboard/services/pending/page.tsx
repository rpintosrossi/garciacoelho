'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button } from '@mui/material';
import { History as HistoryIcon } from '@mui/icons-material';
import QuickPastServiceModal from '@/components/QuickPastServiceModal';

export default function PendingServices() {
  const router = useRouter();
  const [quickPastModalOpen, setQuickPastModalOpen] = useState(false);

  return (
    <Box p={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Registro de Servicio
        </Typography>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<HistoryIcon />}
          onClick={() => setQuickPastModalOpen(true)}
        >
          Crear Servicio Anterior
        </Button>
      </Box>

      <QuickPastServiceModal
        open={quickPastModalOpen}
        onClose={() => setQuickPastModalOpen(false)}
        onSuccess={() => {
          router.push('/dashboard/services/invoiced');
        }}
      />

      <Button
        variant="contained"
        color="primary"
        sx={{ mb: 2 }}
        onClick={() => router.push('/dashboard/services/new')}
      >
        Registrar Servicio
      </Button>
      <Typography variant="body1" color="text.secondary">
        Complete el formulario para registrar un nuevo servicio. Los servicios pendientes de asignación se gestionan en la sección "Asignación".
      </Typography>
    </Box>
  );
} 