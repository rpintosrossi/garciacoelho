const ARGENTINA_TZ = 'America/Argentina/Buenos_Aires';

/** Hoy en Argentina, como YYYY-MM-DD (el input type="date" no acepta hora). */
export function todayYmd(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ARGENTINA_TZ });
}

/**
 * Formats a calendar date without shifting the day.
 * Dates stored as UTC midnight (e.g. "2026-04-13T00:00:00.000Z") are the previous
 * evening in Argentina. The date portion of the ISO string is the day the user chose.
 * Instants with a real time are shown in America/Argentina/Buenos_Aires.
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const match = String(dateString).match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2}))?/
  );
  if (!match) {
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleDateString('es-AR', { timeZone: ARGENTINA_TZ });
  }

  const [, year, month, day, hours, minutes, seconds] = match;
  const isCalendarDay =
    !hours ||
    (hours === '00' && minutes === '00' && seconds === '00') ||
    (hours === '03' && minutes === '00' && seconds === '00') ||
    (hours === '12' && minutes === '00' && seconds === '00');

  if (isCalendarDay) {
    return `${day}/${month}/${year}`;
  }

  return new Date(dateString).toLocaleDateString('es-AR', { timeZone: ARGENTINA_TZ });
}
