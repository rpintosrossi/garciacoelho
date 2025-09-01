"use client";
import React, { useEffect, useState } from "react";
import { cachedApi } from "@/lib/axios";
import { useCommonData } from '@/contexts/CommonDataContext';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert, Tooltip
} from "@mui/material";
import { Add, Edit, Delete, Download } from "@mui/icons-material";
import { generatePaymentMethodPDF } from "@/utils/pdfGenerator";

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

const PaymentMethodsPage = () => {
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
      console.log('💳 [FRONTEND] Guardando medio de pago...');
      console.log('💳 [FRONTEND] Editando:', editing);
      console.log('💳 [FRONTEND] Datos del formulario:', { name, titular, banco, cuenta, cuit, cbu, alias });
      
      const paymentMethodData = {
        name,
        titular,
        banco,
        cuenta,
        cuit,
        cbu,
        alias
      };
      
      console.log('💳 [FRONTEND] Datos a enviar:', paymentMethodData);
      
      if (editing) {
        console.log('💳 [FRONTEND] Actualizando medio de pago existente...');
        const response = await cachedApi.put(`/payment-methods/${editing.id}`, paymentMethodData);
        console.log('💳 [FRONTEND] Respuesta de actualización:', response);
        setSnackbar({ open: true, message: "Medio de pago actualizado", severity: "success" });
      } else {
        console.log('💳 [FRONTEND] Creando nuevo medio de pago...');
        const response = await cachedApi.post(`/payment-methods`, paymentMethodData);
        console.log('💳 [FRONTEND] Respuesta de creación:', response);
        setSnackbar({ open: true, message: "Medio de pago creado", severity: "success" });
      }
      refreshData(); // Refrescar datos del contexto
      handleClose();
    } catch (error) {
      console.error('💳 [FRONTEND] Error al guardar:', error);
      console.error('💳 [FRONTEND] Error response:', error.response);
      setSnackbar({ open: true, message: `Error al guardar: ${error.response?.data?.message || error.message}`, severity: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este medio de pago?")) return;
    try {
      await cachedApi.delete(`/payment-methods/${id}`);
      setSnackbar({ open: true, message: "Medio de pago eliminado", severity: "success" });
      refreshData(); // Refrescar datos del contexto
    } catch {
      setSnackbar({ open: true, message: "Error al eliminar", severity: "error" });
    }
  };

  const handleDownloadPDF = async (method: PaymentMethod) => {
    try {
      await generatePaymentMethodPDF(method);
      setSnackbar({ open: true, message: "PDF generado correctamente", severity: "success" });
    } catch (error) {
      console.error('Error generando PDF:', error);
      setSnackbar({ open: true, message: "Error al generar el PDF", severity: "error" });
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" mb={2}>Medios de Pago</Typography>
      <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()} sx={{ mb: 2 }}>
        Nuevo Medio de Pago
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Titular</TableCell>
              <TableCell>Banco</TableCell>
              <TableCell>Cuenta</TableCell>
              <TableCell>CUIT</TableCell>
              <TableCell>CBU</TableCell>
              <TableCell>Alias</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paymentMethods.map((method) => (
              <TableRow key={method.id}>
                <TableCell>{method.name}</TableCell>
                <TableCell>{method.titular || '-'}</TableCell>
                <TableCell>{method.banco || '-'}</TableCell>
                <TableCell>{method.cuenta || '-'}</TableCell>
                <TableCell>{method.cuit || '-'}</TableCell>
                <TableCell>{method.cbu || '-'}</TableCell>
                <TableCell>{method.alias || '-'}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpen(method)}><Edit /></IconButton>
                  <Tooltip title="Descargar PDF con datos del medio de pago">
                    <IconButton color="secondary" onClick={() => handleDownloadPDF(method)}><Download /></IconButton>
                  </Tooltip>
                  <IconButton color="error" onClick={() => handleDelete(method.id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle>{editing ? "Editar Medio de Pago" : "Nuevo Medio de Pago"}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Nombre del medio de pago"
              fullWidth
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <TextField
              label="Titular"
              fullWidth
              value={titular}
              onChange={e => setTitular(e.target.value)}
            />
            <TextField
              label="Banco"
              fullWidth
              value={banco}
              onChange={e => setBanco(e.target.value)}
            />
            <TextField
              label="Cuenta N°"
              fullWidth
              value={cuenta}
              onChange={e => setCuenta(e.target.value)}
            />
            <TextField
              label="CUIT N°"
              fullWidth
              value={cuit}
              onChange={e => setCuit(e.target.value)}
            />
            <TextField
              label="CBU N°"
              fullWidth
              value={cbu}
              onChange={e => setCbu(e.target.value)}
            />
            <TextField
              label="Alias"
              fullWidth
              value={alias}
              onChange={e => setAlias(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          {editing && (
            <Button 
              onClick={() => handleDownloadPDF(editing)} 
              startIcon={<Download />}
              color="secondary"
            >
              Descargar PDF
            </Button>
          )}
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={!name.trim()}>
            {editing ? "Actualizar" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PaymentMethodsPage; 