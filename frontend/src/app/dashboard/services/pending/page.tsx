'use client';

import { useRouter } from 'next/navigation';
import { Box, Typography, Button } from '@mui/material';

export default function PendingServices() {
  const router = useRouter();

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Registro de Servicio
      </Typography>
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