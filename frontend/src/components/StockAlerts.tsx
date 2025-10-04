'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Collapse,
  Button
} from '@mui/material';
import {
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { cachedApi } from '@/lib/axios';
import { useRouter } from 'next/navigation';

interface StockItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  category: {
    id: string;
    name: string;
    color: string;
  };
}

interface StockAlertsProps {
  maxItems?: number;
  showViewAll?: boolean;
}

export default function StockAlerts({ maxItems = 5, showViewAll = true }: StockAlertsProps) {
  const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchLowStockItems = async () => {
      try {
        setLoading(true);
        const response = await cachedApi.get('/stock/low-stock');
        setLowStockItems(response.data);
      } catch (error) {
        console.error('Error al cargar productos con stock bajo:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLowStockItems();
  }, []);

  const getStockStatus = (quantity: number, minQuantity: number) => {
    if (quantity <= 0) return { status: 'Sin stock', severity: 'error' as const, color: 'error' };
    if (quantity <= minQuantity) return { status: 'Stock bajo', severity: 'warning' as const, color: 'warning' };
    return { status: 'Stock OK', severity: 'success' as const, color: 'success' };
  };

  const getUrgencyLevel = (quantity: number, minQuantity: number) => {
    if (quantity <= 0) return 3; // Crítico
    if (quantity <= minQuantity * 0.5) return 2; // Alto
    if (quantity <= minQuantity) return 1; // Medio
    return 0; // Bajo
  };

  const sortedItems = [...lowStockItems].sort((a, b) => {
    const urgencyA = getUrgencyLevel(a.quantity, a.minQuantity);
    const urgencyB = getUrgencyLevel(b.quantity, b.minQuantity);
    return urgencyB - urgencyA; // Mayor urgencia primero
  });

  const displayedItems = expanded ? sortedItems : sortedItems.slice(0, maxItems);
  const hasMoreItems = sortedItems.length > maxItems;

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Cargando alertas de stock...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (lowStockItems.length === 0) {
    return (
      <Card>
        <CardContent>
          <Alert severity="success" icon={<InventoryIcon />}>
            <AlertTitle>Stock en buen estado</AlertTitle>
            Todos los productos tienen stock suficiente.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            <Typography variant="h6">
              Alertas de Stock
            </Typography>
            <Chip 
              label={`${lowStockItems.length} productos`} 
              color="warning" 
              size="small" 
            />
          </Box>
          {hasMoreItems && (
            <IconButton 
              onClick={() => setExpanded(!expanded)}
              size="small"
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </Box>

        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Atención requerida</AlertTitle>
          {lowStockItems.length} producto{lowStockItems.length !== 1 ? 's' : ''} con stock bajo o sin stock.
        </Alert>

        <List dense>
          {displayedItems.map((item) => {
            const stockStatus = getStockStatus(item.quantity, item.minQuantity);
            const urgencyLevel = getUrgencyLevel(item.quantity, item.minQuantity);
            
            return (
              <ListItem 
                key={item.id}
                sx={{
                  border: '1px solid',
                  borderColor: urgencyLevel === 3 ? 'error.main' : 
                              urgencyLevel === 2 ? 'warning.main' : 'info.main',
                  borderRadius: 1,
                  mb: 1,
                  backgroundColor: urgencyLevel === 3 ? 'rgba(244, 67, 54, 0.1)' : 
                                 urgencyLevel === 2 ? 'rgba(255, 152, 0, 0.1)' : 'rgba(33, 150, 243, 0.1)',
                  '&:hover': {
                    backgroundColor: urgencyLevel === 3 ? 'rgba(244, 67, 54, 0.15)' : 
                                   urgencyLevel === 2 ? 'rgba(255, 152, 0, 0.15)' : 'rgba(33, 150, 243, 0.15)'
                  }
                }}
              >
                <ListItemIcon>
                  <InventoryIcon 
                    color={stockStatus.color} 
                    sx={{ 
                      fontSize: urgencyLevel >= 2 ? 28 : 24,
                      filter: urgencyLevel === 3 ? 'drop-shadow(0 0 4px red)' : 'none'
                    }} 
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1" fontWeight="bold" component="span">
                        {item.name}
                      </Typography>
                      <Chip 
                        label={stockStatus.status}
                        color={stockStatus.color}
                        size="small"
                        variant={urgencyLevel >= 2 ? 'filled' : 'outlined'}
                      />
                    </Box>
                  }
                  secondary={
                    <Box component="div">
                      <Typography variant="body2" color="text.primary" component="div" sx={{ fontWeight: 500 }}>
                        {item.description}
                      </Typography>
                      <Box display="flex" gap={2} mt={1} component="div">
                        <Typography variant="caption" color="text.primary" component="span" sx={{ fontWeight: 600 }}>
                          <strong>Stock actual:</strong> {item.quantity} {item.unit}
                        </Typography>
                        <Typography variant="caption" color="text.primary" component="span" sx={{ fontWeight: 600 }}>
                          <strong>Mínimo:</strong> {item.minQuantity} {item.unit}
                        </Typography>
                        <Chip 
                          label={item.category.name}
                          size="small"
                          sx={{ 
                            backgroundColor: item.category.color,
                            color: 'white',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            '&:hover': {
                              backgroundColor: item.category.color,
                              opacity: 0.8
                            }
                          }}
                        />
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            );
          })}
        </List>

        {hasMoreItems && !expanded && (
          <Box textAlign="center" mt={2}>
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => setExpanded(true)}
              startIcon={<ExpandMoreIcon />}
            >
              Ver {sortedItems.length - maxItems} más
            </Button>
          </Box>
        )}

        {showViewAll && (
          <Box textAlign="center" mt={2}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => router.push('/dashboard/stock')}
              startIcon={<AddIcon />}
            >
              Gestionar Stock
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
