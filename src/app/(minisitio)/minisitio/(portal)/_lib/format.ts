/**
 * Formatos del portal (es-MX). Funciones puras: sirven igual en el servidor y en el navegador.
 * Las fechas reciben `timeZone`: en vistas de cliente, el de `useDisplayTimeZone()` (la zona
 * del condominio hasta hidratar, luego la del navegador).
 */
const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

/** Monto en pesos ("$1,234.50"). Lo que no es número sale como $0.00, como en el minisitio. */
export function formatCurrency(amount: unknown): string {
  const value = typeof amount === "number" ? amount : parseFloat(amount as string);
  return MXN.format(Number.isFinite(value) ? value : 0);
}

/** "2213499928" → "221 349 9928" (10 dígitos de México); lo demás se deja como viene. */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : value.trim();
}

/** Enlace para llamar (`tel:+52…` con 10 dígitos de México), o null si no parece un teléfono. */
export function telHref(value: string): string | null {
  const trimmed = value.trim();
  if (!/^[+\d\s().-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `tel:+52${digits}`;
  return digits.length >= 7 ? `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}` : null;
}

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return isNaN(date.getTime()) ? null : date;
}

/** "28 nov 2025". */
export function formatShortDate(iso: string | null | undefined, timeZone?: string): string {
  const date = parseDate(iso);
  return date ? date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone }) : "";
}

/** "28 de noviembre de 2025". */
export function formatLongDate(iso: string | null | undefined, timeZone?: string): string {
  const date = parseDate(iso);
  return date ? date.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone }) : "";
}

const dayFormatters = new Map<string, Intl.DateTimeFormat>();

/** Día calendario "AAAA-MM-DD" en `timeZone`, para agrupar por día ("" sin fecha válida). */
export function calendarDay(value: string | Date | null | undefined, timeZone?: string): string {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return "";
  let formatter = dayFormatters.get(timeZone ?? "");
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    dayFormatters.set(timeZone ?? "", formatter);
  }
  return formatter.format(date);
}

/** Separador de día como el de Slack: "Hoy", "Ayer" o "Viernes, 28 de noviembre" (con año si no es este). */
export function formatDayLabel(iso: string | null | undefined, now: Date, timeZone?: string): string {
  const date = parseDate(iso);
  if (!date) return "Sin fecha";
  const day = calendarDay(date, timeZone);
  const today = calendarDay(now, timeZone);
  if (day === today) return "Hoy";
  if (day === calendarDay(new Date(now.getTime() - 86_400_000), timeZone)) return "Ayer";
  const text = date.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(day.slice(0, 4) === today.slice(0, 4) ? {} : { year: "numeric" }),
    timeZone,
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Para buscar sin acentos, mayúsculas ni signos: "Ronzino" con "ronz", "VQ#01G" con "vq01g". */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]/g, "");
}
