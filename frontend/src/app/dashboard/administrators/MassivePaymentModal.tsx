import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Autocomplete,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";
import api from '@/lib/axios';
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from '@/utils/formatDate';

interface MassivePaymentModalProps {
  open: boolean;
  onClose: () => void;
  adminId: string;
  onSuccess: () => void;
}

export default function MassivePaymentModal({ open, onClose, adminId, onSuccess }: MassivePaymentModalProps) {
  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<any[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState<'manual' | 'percentage'>('manual');
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState("");
  const [comment, setComment] = useState("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buildingFilter, setBuildingFilter] = useState<string>('');

  useEffect(() => {
    if (open && adminId) {
      setLoadingDocs(true);
      setError(null);
      const token = localStorage.getItem("token");
      Promise.all([
        api.get(`/administrators/${adminId}/pending-invoices`, { headers: { Authorization: `Bearer ${token}` } }),
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
      setComment("");
      setPaymentMethod(null);
      setPaymentDate(new Date().toISOString().slice(0, 10));
    }
  }, [open, adminId]);

  // Calcular monto original basado en documentos seleccionados
  const calculateOriginalAmount = () => {
    return selectedDocs.reduce((sum, doc) => sum + (parseFloat(doc.amount) || 0), 0);
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

  // Monto de referencia de los documentos (después de descuentos)
  const calculateDocsReferenceAmount = () => {
    return calculateFinalAmount();
  };

  // Excedente del pago que queda como saldo a favor
  const calculateCreditAmount = () => {
    const reference = calculateDocsReferenceAmount();
    const paymentAmountNum = parseFloat(paymentAmount) || 0;
    return Math.max(0, Math.round((paymentAmountNum - reference) * 100) / 100);
  };

  // Calcular distribución del pago entre documentos (para mostrar al usuario)
  const calculatePaymentDistribution = () => {
    if (selectedDocs.length === 0 || !paymentAmount) return [];

    const sortedDocs = [...selectedDocs].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB; // Ascendente: más antiguos primero
    });

    const distribution: Array<{
      doc: any;
      amountToPay: number;
      remaining: number;
      status: string;
      credit?: number;
    }> = [];
    const paymentAmountNum = parseFloat(paymentAmount) || 0;
    const originalAmount = calculateOriginalAmount();
    const discountAmount = calculateDiscount();

    // Si hay descuento, distribuir proporcionalmente (incluye excedente si paga de más)
    if (discountAmount > 0 && originalAmount > 0) {
      const discountFactor = paymentAmountNum / originalAmount;
      
      for (const doc of sortedDocs) {
        const originalDocAmount = parseFloat(doc.amount);
        const adjustedAmount = originalDocAmount * discountFactor;
        
        distribution.push({
          doc,
          amountToPay: adjustedAmount,
          remaining: 0,
          status: adjustedAmount > originalDocAmount + 0.01 ? 'credit' : 'full'
        });
      }
    } else {
      // Sin descuento, usar lógica de prioridad por antigüedad
      let remainingPayment = paymentAmountNum;

      for (const doc of sortedDocs) {
        const originalDocAmount = parseFloat(doc.amount);
        
        if (remainingPayment <= 0) {
          distribution.push({
            doc,
            amountToPay: 0,
            remaining: originalDocAmount,
            status: 'pending'
          });
        } else if (remainingPayment >= originalDocAmount) {
          distribution.push({
            doc,
            amountToPay: originalDocAmount,
            remaining: 0,
            status: 'full'
          });
          remainingPayment -= originalDocAmount;
        } else {
          distribution.push({
            doc,
            amountToPay: remainingPayment,
            remaining: originalDocAmount - remainingPayment,
            status: 'partial'
          });
          remainingPayment = 0;
        }
      }

      // Excedente → saldo a favor (se aplica al último documento pagado)
      if (remainingPayment > 0.01 && distribution.length > 0) {
        const target =
          [...distribution].reverse().find((d) => d.amountToPay > 0) ||
          distribution[distribution.length - 1];
        target.amountToPay += remainingPayment;
        target.remaining = 0;
        target.status = 'credit';
        target.credit = remainingPayment;
      }
    }

    return distribution;
  };

  // Actualizar monto original cuando cambian los documentos seleccionados
  useEffect(() => {
    const original = calculateOriginalAmount();
    setOriginalAmount(original.toString());
    // Siempre actualizar el monto por defecto al total de las facturas seleccionadas
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
      const finalAmount = parseFloat(paymentAmount); // Usar el monto ingresado por el usuario

      if (!finalAmount || finalAmount <= 0) {
        setError('El monto del pago debe ser mayor a cero');
        setSaving(false);
        return;
      }

      // Ordenar documentos por fecha (más antiguos primero)
      const sortedDocs = [...selectedDocs].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB; // Ascendente: más antiguos primero
      });

      // Distribuir el pago priorizando facturas más antiguas (excedente = saldo a favor)
      const docsToAssociate: Array<{ id: string; type: string; amount: number }> = [];
      let remainingPayment = finalAmount;

      // Si hay descuento, distribuir proporcionalmente el monto final entre los documentos
      if (discountAmount > 0 && originalAmount > 0) {
        const discountFactor = finalAmount / originalAmount;
        
        for (const doc of sortedDocs) {
          const originalDocAmount = parseFloat(doc.amount);
          const adjustedAmount = originalDocAmount * discountFactor;
          
          docsToAssociate.push({
            id: doc.id,
            type: doc.type,
            amount: adjustedAmount
          });
        }
      } else {
        for (const doc of sortedDocs) {
          const originalDocAmount = parseFloat(doc.amount);
          
          if (remainingPayment <= 0) {
            break;
          }
          
          if (remainingPayment >= originalDocAmount) {
            docsToAssociate.push({
              id: doc.id,
              type: doc.type,
              amount: originalDocAmount
            });
            remainingPayment -= originalDocAmount;
          } else {
            docsToAssociate.push({
              id: doc.id,
              type: doc.type,
              amount: remainingPayment
            });
            remainingPayment = 0;
          }
        }

        // Aplicar excedente al último documento para que sume al saldo a favor
        if (remainingPayment > 0.01 && docsToAssociate.length > 0) {
          docsToAssociate[docsToAssociate.length - 1].amount += remainingPayment;
          remainingPayment = 0;
        }
      }

      await api.post(`/administrators/${adminId}/massive-payment`, {
        amount: finalAmount,
        originalAmount: originalAmount,
        discount: discountAmount,
        discountReason: discountReason || null,
        comment: comment || null,
        date: paymentDate,
        paymentMethodId: paymentMethod?.id,
        docsToAssociate
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      // Notificar cambio usando localStorage para actualizar paquetes
      localStorage.setItem('packagesLastUpdate', Date.now().toString());
      localStorage.setItem('packagesUpdateType', 'payment_registered');
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error al registrar pago masivo:', error);
      const errorMessage = error.response?.data?.message || error.message || "Error al registrar el pago";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Pago masivo para varios edificios</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loadingDocs ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Autocomplete
              options={Array.from(new Map(pendingDocs.map(doc => [doc.buildingId, doc])).values())}
              getOptionLabel={option => `${option.buildingName} - ${option.buildingAddress || ''}`}
              value={pendingDocs.find(doc => doc.buildingId === buildingFilter) || null}
              onChange={(_, value) => setBuildingFilter(value?.buildingId || '')}
              renderInput={params => <TextField {...params} label="Filtrar por edificio" fullWidth />}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <Box component="li" key={key} {...otherProps}>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">{option.buildingName}</Typography>
                      {option.buildingAddress && (
                        <Typography variant="caption" color="text.secondary">{option.buildingAddress}</Typography>
                      )}
                    </Box>
                  </Box>
                );
              }}
              sx={{ mb: 2 }}
            />
            <Autocomplete
              multiple
              options={pendingDocs.filter(doc => !buildingFilter || doc.buildingId === buildingFilter)}
              groupBy={option => option.buildingName}
              getOptionLabel={option => {
                const tipo = option.type === 'REMITO' ? 'Remito' : 'Factura';
                const fecha = option.date ? formatDate(option.date) : '-';
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
                      {option.type === 'REMITO' ? 'Remito' : 'Factura'} - {option.date ? formatDate(option.date) : '-'} - {formatCurrency(option.amount)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.buildingName} - {option.description}
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

            {/* Comentario */}
            <Box mt={2}>
              <TextField
                label="Comentario (opcional)"
                value={comment}
                onChange={e => setComment(e.target.value)}
                fullWidth
                multiline
                rows={2}
                placeholder="Notas internas sobre este pago..."
              />
            </Box>

            {/* Monto final */}
            <Box mt={2}>
              <TextField
                label="Monto final a pagar"
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                fullWidth
                helperText={`Referencia de documentos: ${formatCurrency(calculateDocsReferenceAmount())}. Puede pagar menos (saldo pendiente) o más (saldo a favor).`}
                inputProps={{ 
                  min: 0,
                  step: 0.01
                }}
                sx={{ 
                  '& .MuiInputBase-input': { 
                    fontWeight: 'bold',
                    fontSize: '1.1rem'
                  }
                }}
              />

              {calculateCreditAmount() > 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Este pago genera saldo a favor de {formatCurrency(calculateCreditAmount())} en el/los edificio(s).
                </Alert>
              )}
              
              {/* Mostrar distribución del pago */}
              {parseFloat(paymentAmount) > 0 && selectedDocs.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Distribución del pago (ordenadas por antigüedad):
                  </Typography>
                  <Box maxHeight={200} overflow="auto">
                    {calculatePaymentDistribution().map((item, index) => (
                      <Box key={index} p={1} mb={1} bgcolor="grey.50" borderRadius={1}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {item.doc.type === 'REMITO' ? 'Remito' : 'Factura'} - {formatDate(item.doc.date)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.doc.buildingName} - {item.doc.description}
                            </Typography>
                          </Box>
                          <Box textAlign="right">
                            <Typography variant="body2">
                              {formatCurrency(item.amountToPay)} / {formatCurrency(parseFloat(item.doc.amount))}
                            </Typography>
                            {item.status === 'full' && (
                              <Box component="span" sx={{ 
                                display: 'inline-block',
                                px: 1,
                                py: 0.5,
                                bgcolor: 'success.light',
                                color: 'success.contrastText',
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                              }}>
                                Completo
                              </Box>
                            )}
                            {item.status === 'partial' && (
                              <Box component="span" sx={{ 
                                display: 'inline-block',
                                px: 1,
                                py: 0.5,
                                bgcolor: 'warning.light',
                                color: 'warning.contrastText',
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                              }}>
                                Parcial
                              </Box>
                            )}
                            {item.status === 'pending' && (
                              <Box component="span" sx={{ 
                                display: 'inline-block',
                                px: 1,
                                py: 0.5,
                                bgcolor: 'grey.300',
                                color: 'grey.700',
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                              }}>
                                Pendiente
                              </Box>
                            )}
                            {item.status === 'credit' && (
                              <Box component="span" sx={{ 
                                display: 'inline-block',
                                px: 1,
                                py: 0.5,
                                bgcolor: 'info.light',
                                color: 'info.contrastText',
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                              }}>
                                Con saldo a favor
                              </Box>
                            )}
                          </Box>
                        </Box>
                        {item.remaining > 0 && (
                          <Typography variant="caption" color="warning.main">
                            Saldo pendiente: {formatCurrency(item.remaining)}
                          </Typography>
                        )}
                        {item.credit && item.credit > 0 && (
                          <Typography variant="caption" color="info.main" display="block">
                            Incluye saldo a favor: {formatCurrency(item.credit)}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
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
} 