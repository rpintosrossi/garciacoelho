'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from '@mui/material';
import api from '@/lib/axios';

export interface RemitoMatch {
  remitoId: string;
  number: string;
  date: string | null;
  buildingName: string;
  serviceId: string | null;
}

interface CheckOptions {
  excludeRemitoId?: string;
}

function formatServiceDate(value?: string | null) {
  if (!value) return 'sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'sin fecha';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires'
  }).format(date);
}

function confirmationKey(number: string, excludeRemitoId?: string) {
  return `${excludeRemitoId || ''}|${number.trim().toLowerCase()}`;
}

export function useRemitoDuplicateCheck() {
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<RemitoMatch[]>([]);
  const [total, setTotal] = useState(0);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const confirmedKeyRef = useRef<string | null>(null);
  const inflightRef = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    return () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    };
  }, []);

  const resetConfirmation = () => {
    confirmedKeyRef.current = null;
  };

  const confirmIfDuplicate = (number: string, options?: CheckOptions) => {
    const trimmed = number.trim();
    if (!trimmed) return Promise.resolve(true);

    const key = confirmationKey(trimmed, options?.excludeRemitoId);
    if (confirmedKeyRef.current === key) return Promise.resolve(true);
    if (inflightRef.current) return inflightRef.current;

    const promise = (async () => {
      const response = await api.get('/remitos/check', {
        params: {
          number: trimmed,
          ...(options?.excludeRemitoId ? { excludeId: options.excludeRemitoId } : {})
        }
      });

      const found: RemitoMatch[] = response.data?.matches || [];
      const foundTotal = Number(response.data?.total || found.length);
      if (!foundTotal || found.length === 0) {
        confirmedKeyRef.current = key;
        return true;
      }

      return await new Promise<boolean>((resolve) => {
        resolverRef.current = (ok: boolean) => {
          if (ok) confirmedKeyRef.current = key;
          resolve(ok);
        };
        setMatches(found);
        setTotal(foundTotal);
        setOpen(true);
      });
    })();

    inflightRef.current = promise;
    return promise.finally(() => {
      if (inflightRef.current === promise) inflightRef.current = null;
    });
  };

  const handleChoice = (ok: boolean) => {
    setOpen(false);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(ok);
  };

  const remitoNumber = matches[0]?.number || '';
  const hiddenCount = Math.max(total - matches.length, 0);

  const remitoDuplicateDialog = (
    <Dialog
      open={open}
      onClose={() => handleChoice(false)}
      maxWidth="sm"
      fullWidth
      sx={{ zIndex: 1500 }}
    >
      <DialogTitle>Remito ya ingresado</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          El remito N° <b>{remitoNumber}</b> ya fue ingresado
          {total === 1 ? ' en este servicio:' : ` en ${total} servicios:`}
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          {matches.map((match) => (
            <Typography component="li" key={match.remitoId} sx={{ mb: 0.5 }}>
              Fecha: <b>{formatServiceDate(match.date)}</b>
              {' — '}
              Edificio: <b>{match.buildingName}</b>
            </Typography>
          ))}
        </Box>
        {hiddenCount > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Y {hiddenCount} servicio{hiddenCount === 1 ? '' : 's'} más.
          </Typography>
        )}
        <Typography sx={{ mt: 2 }}>
          ¿Desea continuar?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleChoice(false)}>No</Button>
        <Button onClick={() => handleChoice(true)} variant="contained" color="warning">
          Sí, continuar
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { confirmIfDuplicate, resetConfirmation, remitoDuplicateDialog };
}
