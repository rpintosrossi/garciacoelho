"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Box, Typography, Paper, Chip, CircularProgress, Alert, Stack, Divider } from "@mui/material";
import api from '@/lib/axios';

export default function ServiceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    if (id) fetchService();
  }, [id]);

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
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>Remitos</Typography>
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
                      <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                        <img src={img} alt="Remito" style={{ width: 80, borderRadius: 4, border: '1px solid #eee' }} />
                      </a>
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
              <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                <img src={img} alt="Remito" style={{ width: 80, borderRadius: 4, border: '1px solid #eee' }} />
              </a>
            ))}
          </Stack>
        ) : (
          <Typography>No hay imágenes de remito adjuntas.</Typography>
        )}
      </Paper>
    </Box>
  );
} 