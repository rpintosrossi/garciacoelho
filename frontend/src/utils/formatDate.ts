/**
 * Formats a date string safely without timezone conversion.
 * Dates from the backend come as UTC ISO strings (e.g. "2026-04-13T00:00:00.000Z").
 * Using `new Date(str).toLocaleDateString()` shifts to local time (UTC-3 in Argentina),
 * causing the date to appear one day earlier. This function extracts the date portion
 * directly from the ISO string to avoid that shift.
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  // Fallback for non-ISO formats
  return new Date(dateString).toLocaleDateString('es-AR');
}
