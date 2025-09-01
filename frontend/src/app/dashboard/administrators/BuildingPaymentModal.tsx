"use client";
import React, { useEffect, useState } from "react";
import api from '@/lib/axios';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Autocomplete,
  CircularProgress,
  Alert,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from "@mui/material";
import { formatCurrency } from '@/utils/formatCurrency';

interface PendingDocument {
  id: string;
  type: 'FACTURA' | 'REMITO';
  amount: number;
  date: string;
  description: string;
  buildingName: string;
}

interface PaymentMethod {
  id: string;
  name: string;
}

interface BuildingPaymentModalProps {
  open: boolean;
  onClose: () => void;
  buildingId: string;
  buildingName: string;
  onSuccess: () => void;
}

const BuildingPaymentModal: React.FC<BuildingPaymentModalProps> = ({
  open,
  onClose,
  buildingId,
  buildingName,
  onSuccess
}) => {
  const [pendingDocs, setPendingDocs] = useState<PendingDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<PendingDocument[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState<'manual' | 'percentage'>('manual');
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && buildingId) {
      setLoadingDocs(true);
      setError(null);
      const token = localStorage.getItem("token");
      Promise.all([
        api.get(`/buildings/${buildingId}/pending-invoices`, { headers: { Authorization: `Bearer ${token}` } }),
        api.get(`/payment-methods`, { headers: { Authorization: `Bearer ${token}` } })
      ])
        .then(([docsRes, methodsRes]) => {
          setPendingDocs(docsRes.data);
          setPaymentMethods(methodsRes.data);
        })
        .catch(() => setError("Error al cargar documentos o medios de pago"))
        .finally(() => setLoadingDocs(false));
      setSelectedDocs([]);
      setPaymentAmount("");
      setOriginalAmount("");
      setDiscount("");
      setDiscountType('manual');
      setDiscountPercentage(0);
      setDiscountReason("");
      setPaymentMethod(null);
      setPaymentDate(new Date().toISOString().slice(0, 10));
    }
  }, [open, buildingId]);

  // Calcular monto original basado en documentos seleccionados
  const calculateOriginalAmount = () => {
    return selectedDocs.reduce((sum, doc) => sum + (parseFloat(doc.amount.toString()) || 0), 0);
  };

  // Calcular descuento basado en tipo y valor
  const calculateDiscount = () => {
    const original = calculateOriginalAmount();
    if (discountType === 'percentage') {
      return (original * discountPercentage) / 100;
    }
    return parseFloat(discount) || 0;
  };

  // Calcular monto final
  const calculateFinalAmount = () => {
    const original = calculateOriginalAmount();
    const discountAmount = calculateDiscount();
    return original - discountAmount;
  };

  // Actualizar monto original cuando cambian los documentos seleccionados
  useEffect(() => {
    const original = calculateOriginalAmount();
    setOriginalAmount(original.toString());
    setPaymentAmount(calculateFinalAmount().toString());
  }, [selectedDocs, discount, discountPercentage, discountType]);

  // Actualizar descuento cuando cambia el porcentaje
  useEffect(() => {
    if (discountType === 'percentage') {
      const original = calculateOriginalAmount();
      const discountAmount = (original * discountPercentage) / 100;
      setDiscount(discountAmount.toString());
    }
  }, [discountPercentage, discountType, selectedDocs]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const originalAmount = calculateOriginalAmount();
      const discountAmount = calculateDiscount();
      const finalAmount = calculateFinalAmount();

      // Calcular el factor de descuento para aplicar proporcionalmente a cada documento
      const discountFactor = discountAmount > 0 ? (finalAmount / originalAmount) : 1;

      const docsToAssociate = selectedDocs.map((doc: PendingDocument) => {
        const originalDocAmount = parseFloat(doc.amount.toString());
        const adjustedAmount = originalDocAmount * discountFactor;
        
        return {
          id: doc.id,
          type: doc.type,
          amount: adjustedAmount
        };
      });

      await api.post(`/buildings/${buildingId}/payment`, {
        amount: finalAmount,
        originalAmount: originalAmount,
        discount: discountAmount,
        discountReason: discountReason || null,
        date: paymentDate,
        paymentMethodId: paymentMethod?.id,
        docsToAssociate
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      // Notificar cambio usando localStorage para actualizar paquetes
      localStorage.setItem('packagesLastUpdate', Date.now().toString());
      localStorage.setItem('packagesUpdateType', 'payment_registered');
      
      onSuccess();
      onClose();
    } catch {
      setError("Error al registrar el pago");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Registrar pago para {buildingName}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loadingDocs ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Autocomplete
              multiple
              options={pendingDocs}
              getOptionLabel={option => {
                const tipo = option.type === 'REMITO' ? 'Remito' : 'Factura';
                const fecha = option.date ? new Date(option.date).toLocaleDateString() : '-';
                return `${tipo} - ${fecha} - ${formatCurrency(option.amount)}`;
              }}
              value={selectedDocs}
              onChange={(_, value) => setSelectedDocs(value)}
              renderInput={params => <TextField {...params} label="Documentos a asociar" fullWidth />}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    <Typography variant="body2">
                      {option.type === 'REMITO' ? 'Remito' : 'Factura'} - {option.date ? new Date(option.date).toLocaleDateString() : '-'} - {formatCurrency(option.amount)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.description}
                    </Typography>
                  </Box>
                </li>
              )}
            />
            <Box display="flex" gap={2} mt={2}>
              <TextField
                label="Monto original"
                type="number"
                value={originalAmount}
                InputProps={{ readOnly: true }}
                helperText="Calculado automáticamente de las facturas seleccionadas"
                sx={{ flex: 2 }}
              />
              <TextField
                label="Fecha"
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                sx={{ minWidth: 140, maxWidth: 180 }}
                InputLabelProps={{ shrink: true }}
              />
              <Autocomplete
                options={paymentMethods}
                getOptionLabel={option => option.name}
                value={paymentMethod}
                onChange={(_, value) => setPaymentMethod(value)}
                renderInput={params => <TextField {...params} label="Medio de pago" />}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                sx={{ flex: 3, minWidth: 180 }}
              />
            </Box>
            
            {/* Campos de descuento */}
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                Descuento (opcional)
              </Typography>
              <Box display="flex" gap={2} alignItems="flex-end">
                <FormControl sx={{ flex: 1 }}>
                  <InputLabel>Tipo de descuento</InputLabel>
                  <Select
                    value={discountType}
                    label="Tipo de descuento"
                    onChange={(e) => setDiscountType(e.target.value as 'manual' | 'percentage')}
                  >
                    <MenuItem value="manual">Monto fijo</MenuItem>
                    <MenuItem value="percentage">Porcentaje</MenuItem>
                  </Select>
                </FormControl>
                
                {discountType === 'manual' ? (
                  <TextField
                    label="Descuento"
                    type="number"
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                ) : (
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Porcentaje</InputLabel>
                    <Select
                      value={discountPercentage}
                      label="Porcentaje"
                      onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                    >
                      <MenuItem value={5}>5%</MenuItem>
                      <MenuItem value={10}>10%</MenuItem>
                      <MenuItem value={15}>15%</MenuItem>
                      <MenuItem value={20}>20%</MenuItem>
                    </Select>
                  </FormControl>
                )}
                
                <TextField
                  label="Razón del descuento"
                  value={discountReason}
                  onChange={e => setDiscountReason(e.target.value)}
                  placeholder="ej: coima, descuento comercial"
                  sx={{ flex: 2 }}
                />
              </Box>
              
              {/* Resumen del descuento */}
              {(parseFloat(discount) > 0 || discountPercentage > 0) && (
                <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Resumen:</strong> Monto original {formatCurrency(parseFloat(originalAmount))} - 
                    Descuento {formatCurrency(calculateDiscount())} = 
                    <strong> Monto final {formatCurrency(calculateFinalAmount())}</strong>
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Monto final */}
            <Box mt={2}>
              <TextField
                label="Monto final a pagar"
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                fullWidth
                InputProps={{ readOnly: true }}
                sx={{ 
                  '& .MuiInputBase-input': { 
                    fontWeight: 'bold',
                    fontSize: '1.1rem'
                  }
                }}
              />
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !paymentAmount || !paymentMethod || selectedDocs.length === 0}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BuildingPaymentModal;
