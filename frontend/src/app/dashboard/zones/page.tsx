"use client";
import React, { useEffect, useState } from "react";
import api from '@/lib/axios';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Snackbar,
  Alert,
  Autocomplete,
  Chip,
  Container,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import { Add, Edit, Delete, LocationOn } from "@mui/icons-material";
import { useFormik } from "formik";
import * as Yup from "yup";

interface Zone {
  id: string;
  name: string;
  description?: string;
  localities: ZoneLocality[];
  createdAt: string;
  updatedAt: string;
}

interface ZoneLocality {
  id: string;
  locality: string;
  zoneId: string;
}

const validationSchema = Yup.object({
  name: Yup.string().required("El nombre es obligatorio"),
  description: Yup.string(),
  localities: Yup.array().of(Yup.string()).min(1, "Debe seleccionar al menos una localidad"),
});

const ZonesPage = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [availableLocalities, setAvailableLocalities] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const [loading, setLoading] = useState(true);

  const fetchZones = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/zones", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setZones(res.data);
    } catch (error) {
      setSnackbar({ open: true, message: "Error al cargar zonas", severity: "error" });
    }
  };

  const fetchAvailableLocalities = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/zones/localities/available", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvailableLocalities(res.data);
    } catch (error) {
      setSnackbar({ open: true, message: "Error al cargar localidades disponibles", severity: "error" });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchZones(), fetchAvailableLocalities()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleOpen = (zone?: Zone) => {
    setEditing(zone || null);
    setOpen(true);
  };

  const handleClose = () => {
    setEditing(null);
    setOpen(false);
    formik.resetForm();
  };

  const formik = useFormik({
    initialValues: {
      name: editing?.name || "",
      description: editing?.description || "",
      localities: editing?.localities?.map(l => l.locality) || [],
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values) => {
      try {
        const token = localStorage.getItem("token");
        if (editing) {
          await api.put(`/zones/${editing.id}`, values, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSnackbar({ open: true, message: "Zona actualizada", severity: "success" });
        } else {
          await api.post("/zones", values, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSnackbar({ open: true, message: "Zona creada", severity: "success" });
        }
        fetchZones();
        handleClose();
      } catch (error: any) {
        setSnackbar({ open: true, message: error?.response?.data?.message || "Error al guardar", severity: "error" });
      }
    },
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta zona?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/zones/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSnackbar({ open: true, message: "Zona eliminada", severity: "success" });
      fetchZones();
    } catch (error: any) {
      setSnackbar({ open: true, message: error?.response?.data?.message || "Error al eliminar", severity: "error" });
    }
  };

  if (loading) {
    return (
      <Container>
        <Box p={3} display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Typography>Cargando zonas...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container>
      <Box p={3}>
        <Typography variant="h4" mb={2}>Zonas</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()} sx={{ mb: 3 }}>
          Nueva Zona
        </Button>

        <Grid container spacing={3}>
          {zones.map((zone) => (
            <Grid item xs={12} md={6} lg={4} key={zone.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" component="h2">
                      {zone.name}
                    </Typography>
                    <Box>
                      <IconButton 
                        color="primary" 
                        size="small" 
                        onClick={() => handleOpen(zone)}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        size="small" 
                        onClick={() => handleDelete(zone.id)}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  {zone.description && (
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      {zone.description}
                    </Typography>
                  )}
                  
                  <Box display="flex" alignItems="center" mb={1}>
                    <LocationOn sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {zone.localities.length} localidad{zone.localities.length !== 1 ? 'es' : ''}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {zone.localities.slice(0, 3).map((locality) => (
                      <Chip
                        key={locality.id}
                        label={locality.locality}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                    {zone.localities.length > 3 && (
                      <Chip
                        label={`+${zone.localities.length - 3} más`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {zones.length === 0 && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <Typography variant="h6" color="text.secondary">
              No hay zonas creadas. Crea tu primera zona para comenzar.
            </Typography>
          </Box>
        )}

        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
          <DialogTitle>{editing ? "Editar Zona" : "Nueva Zona"}</DialogTitle>
          <form onSubmit={formik.handleSubmit}>
            <DialogContent>
              <TextField
                margin="dense"
                label="Nombre de la zona"
                name="name"
                fullWidth
                value={formik.values.name}
                onChange={formik.handleChange}
                error={formik.touched.name && Boolean(formik.errors.name)}
                helperText={formik.touched.name && formik.errors.name}
              />
              
              <TextField
                margin="dense"
                label="Descripción (opcional)"
                name="description"
                fullWidth
                multiline
                rows={3}
                value={formik.values.description}
                onChange={formik.handleChange}
                error={formik.touched.description && Boolean(formik.errors.description)}
                helperText={formik.touched.description && formik.errors.description}
              />
              
              <Autocomplete
                multiple
                options={availableLocalities}
                value={formik.values.localities}
                onChange={(_, value) => formik.setFieldValue('localities', value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    margin="dense"
                    label="Localidades"
                    error={formik.touched.localities && Boolean(formik.errors.localities)}
                    helperText={formik.touched.localities && formik.errors.localities || "Selecciona una o más localidades"}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option}
                      {...getTagProps({ index })}
                      key={option}
                      size="small"
                    />
                  ))
                }
                sx={{ mt: 2 }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Cancelar</Button>
              <Button type="submit" variant="contained">
                {editing ? "Actualizar" : "Crear"}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        <Snackbar 
          open={snackbar.open} 
          autoHideDuration={4000} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert 
            severity={snackbar.severity} 
            onClose={() => setSnackbar({ ...snackbar, open: false })}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default ZonesPage;

