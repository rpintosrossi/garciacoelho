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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useCategories } from '@/contexts/CategoryContext';

interface StockItem {
  id: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  price: number;
  supplier: string;
  lastUpdated: string;
}

const validationSchema = Yup.object({
  name: Yup.string().required("El nombre es obligatorio"),
  description: Yup.string().required("La descripción es obligatoria"),
  category: Yup.string().required("La categoría es obligatoria"),
  quantity: Yup.number().min(0, "La cantidad no puede ser negativa").required("La cantidad es obligatoria"),
  minQuantity: Yup.number().min(0, "La cantidad mínima no puede ser negativa").required("La cantidad mínima es obligatoria"),
  unit: Yup.string().required("La unidad es obligatoria"),
  price: Yup.number().min(0, "El precio no puede ser negativo").required("El precio es obligatorio"),
  supplier: Yup.string().required("El proveedor es obligatorio"),
});

const units = [
  'Unidades',
  'Metros',
  'Kilogramos',
  'Litros',
  'Cajas',
  'Rollos',
  'Pares'
];

export default function StockPage() {
  const { categories } = useCategories();
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Datos de ejemplo para demostración
  const mockItems: StockItem[] = [];

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      setItems(mockItems);
      setLoading(false);
    }, 1000);
  }, []);

  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
      category: '',
      quantity: 0,
      minQuantity: 0,
      unit: '',
      price: 0,
      supplier: '',
    },
    validationSchema,
    onSubmit: (values) => {
      if (editing) {
        // Actualizar item existente
        setItems(items.map(item => 
          item.id === editing.id 
            ? { ...item, ...values, lastUpdated: new Date().toISOString().split('T')[0] }
            : item
        ));
      } else {
        // Agregar nuevo item
        const newItem: StockItem = {
          id: Date.now().toString(),
          ...values,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
        setItems([...items, newItem]);
      }
      handleClose();
    },
  });

  const handleOpen = (item?: StockItem) => {
    if (item) {
      setEditing(item);
      formik.setValues(item);
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
    setItems(items.filter(item => item.id !== id));
  };

  const getStockStatus = (quantity: number, minQuantity: number) => {
    if (quantity <= 0) return { status: 'Sin stock', color: 'error', icon: <WarningIcon /> };
    if (quantity <= minQuantity) return { status: 'Stock bajo', color: 'warning', icon: <WarningIcon /> };
    return { status: 'Stock OK', color: 'success', icon: <CheckCircleIcon /> };
  };

  const getTotalValue = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const getLowStockItems = () => {
    return items.filter(item => item.quantity <= item.minQuantity);
  };

  const getOutOfStockItems = () => {
    return items.filter(item => item.quantity <= 0);
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
        Gestión de Stock
      </Typography>

      {/* Resumen */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
          gap: 3,
          mb: 3
        }}
      >
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <InventoryIcon color="primary" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6">
                  {items.length}
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
              <WarningIcon color="warning" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6" color="warning.main">
                  {getLowStockItems().length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Stock Bajo
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <WarningIcon color="error" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6" color="error">
                  {getOutOfStockItems().length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sin Stock
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6" color="success.main">
                  ${getTotalValue().toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Valor Total
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Inventario</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Agregar Producto
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Precio Unit.</TableCell>
              <TableCell>Proveedor</TableCell>
              <TableCell>Última Actualización</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const status = getStockStatus(item.quantity, item.minQuantity);
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.description}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {item.quantity} {item.unit}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Mín: {item.minQuantity}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {status.icon}
                      <Typography variant="body2" color={`${status.color}.main`}>
                        {status.status}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>${item.price.toLocaleString()}</TableCell>
                  <TableCell>{item.supplier}</TableCell>
                  <TableCell>{new Date(item.lastUpdated).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleOpen(item)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(item.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle>
          {editing ? "Editar Producto" : "Nuevo Producto"}
        </DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField
                label="Nombre del producto"
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
              <Box display="flex" gap={2}>
                <FormControl fullWidth>
                  <InputLabel>Categoría</InputLabel>
                  <Select
                    name="category"
                    value={formik.values.category}
                    label="Categoría"
                    onChange={formik.handleChange}
                    error={formik.touched.category && Boolean(formik.errors.category)}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.name} value={category.name}>{category.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Unidad</InputLabel>
                  <Select
                    name="unit"
                    value={formik.values.unit}
                    label="Unidad"
                    onChange={formik.handleChange}
                    error={formik.touched.unit && Boolean(formik.errors.unit)}
                  >
                    {units.map((unit) => (
                      <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box display="flex" gap={2}>
                <TextField
                  label="Cantidad actual"
                  name="quantity"
                  type="number"
                  fullWidth
                  value={formik.values.quantity}
                  onChange={formik.handleChange}
                  error={formik.touched.quantity && Boolean(formik.errors.quantity)}
                  helperText={formik.touched.quantity && formik.errors.quantity}
                />
                <TextField
                  label="Cantidad mínima"
                  name="minQuantity"
                  type="number"
                  fullWidth
                  value={formik.values.minQuantity}
                  onChange={formik.handleChange}
                  error={formik.touched.minQuantity && Boolean(formik.errors.minQuantity)}
                  helperText={formik.touched.minQuantity && formik.errors.minQuantity}
                />
              </Box>
              <Box display="flex" gap={2}>
                <TextField
                  label="Precio unitario"
                  name="price"
                  type="number"
                  fullWidth
                  value={formik.values.price}
                  onChange={formik.handleChange}
                  error={formik.touched.price && Boolean(formik.errors.price)}
                  helperText={formik.touched.price && formik.errors.price}
                />
                <TextField
                  label="Proveedor"
                  name="supplier"
                  fullWidth
                  value={formik.values.supplier}
                  onChange={formik.handleChange}
                  error={formik.touched.supplier && Boolean(formik.errors.supplier)}
                  helperText={formik.touched.supplier && formik.errors.supplier}
                />
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