/**
 * Interpreta una fecha de calendario (YYYY-MM-DD) como mediodía UTC.
 * Medianoche UTC cae el día anterior en Argentina (UTC-3) y la fecha se ve corrida.
 * El mediodía UTC sigue siendo el mismo día en Buenos Aires.
 */
function parseCalendarDate(value) {
  if (!value) return new Date();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Date.UTC(+match[1], +match[2] - 1, +match[3], 12, 0, 0));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

const ARGENTINA_TZ = 'America/Argentina/Buenos_Aires';

/** Muestra el día calendario, sin correrlo a la noche anterior de Argentina. */
function formatCalendarDate(value) {
  if (!value) return '-';
  const iso = value instanceof Date ? value.toISOString() : String(value);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2}))?/);
  if (!match) return '-';

  const [, year, month, day, hours, minutes, seconds] = match;
  const isCalendarDay =
    !hours ||
    (hours === '00' && minutes === '00' && seconds === '00') ||
    (hours === '03' && minutes === '00' && seconds === '00') ||
    (hours === '12' && minutes === '00' && seconds === '00');

  if (isCalendarDay) return `${day}/${month}/${year}`;

  return new Date(iso).toLocaleDateString('es-AR', { timeZone: ARGENTINA_TZ });
}

module.exports = { parseCalendarDate, formatCalendarDate };
