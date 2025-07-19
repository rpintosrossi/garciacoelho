"use client";
import React, { useEffect, useState } from "react";
import axios from "@/lib/axios";
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";

interface PaymentMethod {
  id: string;
  name: string;
}

const PaymentMethodsPage = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [name, setName] = useState("");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });

  const fetchMethods = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/payment-methods", { headers: { Authorization: `Bearer ${token}` } });
      setMethods(res.data);
    } catch {
      setSnackbar({ open: true, message: "Error al cargar medios de pago", severity: "error" });
    }
  };

  useEffect(() => { fetchMethods(); }, []);

  const handleOpen = (method?: PaymentMethod) => {
    setEditing(method || null);
    setName(method?.name || "");
    setOpen(true);
  };
  const handleClose = () => { setOpen(false); setEditing(null); setName(""); };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      if (editing) {
        await axios.put(`/payment-methods/${editing.id}`, { name }, { headers: { Authorization: `Bearer ${token}` } });
        setSnackbar({ open: true, message: "Medio de pago actualizado", severity: "success" });
      } else {
        await axios.post(`/payment-methods`, { name }, { headers: { Authorization: `Bearer ${token}` } });
        setSnackbar({ open: true, message: "Medio de pago creado", severity: "success" });
      }
      fetchMethods();
      handleClose();
    } catch {
      setSnackbar({ open: true, message: "Error al guardar", severity: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este medio de pago?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/payment-methods/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setSnackbar({ open: true, message: "Medio de pago eliminado", severity: "success" });
      fetchMethods();
    } catch {
      setSnackbar({ open: true, message: "Error al eliminar", severity: "error" });
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
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {methods.map((method) => (
              <TableRow key={method.id}>
                <TableCell>{method.name}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpen(method)}><Edit /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(method.id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Editar Medio de Pago" : "Nuevo Medio de Pago"}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Nombre"
            fullWidth
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">{editing ? "Actualizar" : "Crear"}</Button>
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