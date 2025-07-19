'use client';

import { useState, useEffect } from 'react';
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Category as CategoryIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useCategories, Category } from '@/contexts/CategoryContext';

const validationSchema = Yup.object({
  name: Yup.string().required("El nombre es obligatorio"),
  description: Yup.string().required("La descripción es obligatoria"),
  color: Yup.string().required("El color es obligatorio"),
});

const defaultColors = [
  '#2196f3', // Azul
  '#4caf50', // Verde
  '#ff9800', // Naranja
  '#9c27b0', // Púrpura
  '#f44336', // Rojo
  '#795548', // Marrón
  '#607d8b', // Gris azulado
  '#e91e63', // Rosa
  '#00bcd4', // Cian
  '#8bc34a', // Verde claro
];

export default function CategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
      color: '#2196f3',
    },
    validationSchema,
    onSubmit: (values) => {
      if (editing) {
        // Actualizar categoría existente
        updateCategory(editing.id, values);
      } else {
        // Agregar nueva categoría
        addCategory(values);
      }
      handleClose();
    },
  });

  const handleOpen = (category?: Category) => {
    if (category) {
      setEditing(category);
      formik.setValues(category);
    } else {
      setEditing(null);
      formik.resetForm();
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    formik.resetForm();
  };

  const handleDelete = (id: string) => {
    const category = categories.find(cat => cat.id === id);
    if (category && category.productCount > 0) {
      setError(`No se puede eliminar la categoría "${category.name}" porque tiene ${category.productCount} productos asociados.`);
      return;
    }
    deleteCategory(id);
    setError(null);
  };

  const getTotalProducts = () => {
    return categories.reduce((sum, cat) => sum + cat.productCount, 0);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Gestión de Categorías
      </Typography>

      {/* Resumen */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
          mb: 3
        }}
      >
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <CategoryIcon color="primary" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6">
                  {categories.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de Categorías
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <InventoryIcon color="success" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6" color="success.main">
                  {getTotalProducts()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de Productos
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <CategoryIcon color="info" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6" color="info.main">
                  {categories.filter(cat => cat.productCount === 0).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Categorías Vacías
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Categorías</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Nueva Categoría
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Color</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Productos</TableCell>
              <TableCell>Fecha Creación</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      backgroundColor: category.color,
                      border: '2px solid #fff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {category.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {category.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={`${category.productCount} productos`}
                    color={category.productCount === 0 ? "default" : "primary"}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(category.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Tooltip title="Editar categoría">
                    <IconButton color="primary" onClick={() => handleOpen(category)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={category.productCount > 0 ? "No se puede eliminar - tiene productos" : "Eliminar categoría"}>
                    <span>
                      <IconButton 
                        color="error" 
                        onClick={() => handleDelete(category.id)}
                        disabled={category.productCount > 0}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          {editing ? "Editar Categoría" : "Nueva Categoría"}
        </DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={3} mt={1}>
              <TextField
                label="Nombre de la categoría"
                name="name"
                fullWidth
                value={formik.values.name}
                onChange={formik.handleChange}
                error={formik.touched.name && Boolean(formik.errors.name)}
                helperText={formik.touched.name && formik.errors.name}
              />
              <TextField
                label="Descripción"
                name="description"
                fullWidth
                multiline
                rows={3}
                value={formik.values.description}
                onChange={formik.handleChange}
                error={formik.touched.description && Boolean(formik.errors.description)}
                helperText={formik.touched.description && formik.errors.description}
              />
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Color de la categoría
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {defaultColors.map((color) => (
                    <Box
                      key={color}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: color,
                        cursor: 'pointer',
                        border: formik.values.color === color ? '3px solid #000' : '2px solid #fff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        '&:hover': {
                          transform: 'scale(1.1)',
                          transition: 'transform 0.2s'
                        }
                      }}
                      onClick={() => formik.setFieldValue('color', color)}
                    />
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary" mt={1}>
                  Color seleccionado: {formik.values.color}
                </Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button type="submit" variant="contained">
              {editing ? "Actualizar" : "Crear"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
} 