'use client';

import React, { useState, useEffect } from 'react';
import { cachedApi } from "@/lib/axios";
import { useCommonData } from '@/contexts/CommonDataContext';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert, Tooltip
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";

interface PaymentMethod {
  id: string;
  name: string;
  titular?: string;
  banco?: string;
  cuenta?: string;
  cuit?: string;
  cbu?: string;
  alias?: string;
}

export default function PaymentMethodsManager() {
  const { paymentMethods, refreshData } = useCommonData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [name, setName] = useState("");
  const [titular, setTitular] = useState("");
  const [banco, setBanco] = useState("");
  const [cuenta, setCuenta] = useState("");
  const [cuit, setCuit] = useState("");
  const [cbu, setCbu] = useState("");
  const [alias, setAlias] = useState("");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });

  const handleOpen = (method?: PaymentMethod) => {
    setEditing(method || null);
    setName(method?.name || "");
    setTitular(method?.titular || "");
    setBanco(method?.banco || "");
    setCuenta(method?.cuenta || "");
    setCuit(method?.cuit || "");
    setCbu(method?.cbu || "");
    setAlias(method?.alias || "");
    setOpen(true);
  };
  const handleClose = () => { 
    setOpen(false); 
    setEditing(null); 
    setName(""); 
    setTitular(""); 
    setBanco(""); 
    setCuenta(""); 
    setCuit(""); 
    setCbu(""); 
    setAlias(""); 
  };

  const handleSave = async () => {
    try {
      const paymentMethodData = {
        name,
        titular,
        banco,
        cuenta,
        cuit,
        cbu,
        alias
      };
      
      if (editing) {
        await cachedApi.put(`/payment-methods/${editing.id}`, paymentMethodData);
        setSnackbar({ open: true, message: "Medio de pago actualizado", severity: "success" });
      } else {
        await cachedApi.post(`/payment-methods`, paymentMethodData);
        setSnackbar({ open: true, message: "Medio de pago creado", severity: "success" });
      }
      refreshData();
      handleClose();
    } catch (error: any) {
      console.error('Error al guardar:', error);
      setSnackbar({ open: true, message: `Error al guardar: ${error.response?.data?.message || error.message}`, severity: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este medio de pago?")) return;
    try {
      await cachedApi.delete(`/payment-methods/${id}`);
      setSnackbar({ open: true, message: "Medio de pago eliminado", severity: "success" });
      refreshData();
    } catch (error: any) {
      console.error('Error al eliminar:', error);
      setSnackbar({ open: true, message: "Error al eliminar medio de pago", severity: "error" });
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Medios de Pago</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
          Nuevo Medio
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Banco</TableCell>
              <TableCell>Titular</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paymentMethods.map((method) => (
              <TableRow key={method.id}>
                <TableCell>{method.name}</TableCell>
                <TableCell>{method.banco || '-'}</TableCell>
                <TableCell>{method.titular || '-'}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpen(method)} color="primary"><Edit /></IconButton>
                  <IconButton onClick={() => handleDelete(method.id)} color="error"><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {paymentMethods.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">No hay medios de pago configurados</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "Editar Medio de Pago" : "Nuevo Medio de Pago"}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label="Nombre Identificativo" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            <TextField label="Titular" value={titular} onChange={(e) => setTitular(e.target.value)} fullWidth />
            <TextField label="Banco" value={banco} onChange={(e) => setBanco(e.target.value)} fullWidth />
            <TextField label="Nro Cuenta" value={cuenta} onChange={(e) => setCuenta(e.target.value)} fullWidth />
            <TextField label="CUIT" value={cuit} onChange={(e) => setCuit(e.target.value)} fullWidth />
            <TextField label="CBU" value={cbu} onChange={(e) => setCbu(e.target.value)} fullWidth />
            <TextField label="Alias" value={alias} onChange={(e) => setAlias(e.target.value)} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">Guardar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
