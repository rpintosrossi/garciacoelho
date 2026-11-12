/** Cobro en efectivo sin PDF. Electrónicas (AFIP/CAE) y adjuntas no se editan. */
export function canEditCashInvoiceAmount(invoice: {
  paymentMethod?: string | null;
  emissionSource?: string | null;
  fileUrl?: string | null;
  cae?: string | null;
} | null | undefined) {
  if (!invoice || invoice.paymentMethod !== 'EFECTIVO') return false;
  if (invoice.emissionSource === 'AFIP' || invoice.cae) return false;
  if (invoice.fileUrl) return false;
  return true;
}
