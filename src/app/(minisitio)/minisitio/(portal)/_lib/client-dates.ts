/**
 * Fechas en pantallas que ahora se pintan primero en el servidor.
 *
 * En el minisitio independiente todo se pintaba en el navegador, así que las fechas salían
 * en la zona horaria del condómino. Ahora el primer HTML lo genera el servidor (en UTC en
 * producción): si cada lado usara su propia zona, el texto no coincidiría al hidratar. Por
 * eso, hasta hidratar se formatea en la zona del condominio y después en la del navegador,
 * igual que antes (para un navegador en México no cambia nada).
 */
import { useSyncExternalStore } from "react";

/** Zona horaria del condominio (Val'Quirico, Tlaxcala). */
export const MINISITIO_TIME_ZONE = "America/Mexico_City";

const noopSubscribe = () => () => {};

/** `false` en el servidor y durante la hidratación; `true` después y en navegaciones de cliente. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Zona con la que formatear fechas: la del condominio hasta hidratar, luego la del navegador (`undefined`). */
export function useDisplayTimeZone(): string | undefined {
  return useHydrated() ? undefined : MINISITIO_TIME_ZONE;
}

const dayKeyFormatters = new Map<string, Intl.DateTimeFormat>();

/** Día calendario de `date` como "AAAA-MM-DD" en `timeZone` (la del navegador si es `undefined`). */
function calendarDayKey(date: Date, timeZone?: string): string {
  const cacheKey = timeZone ?? "";
  let formatter = dayKeyFormatters.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    dayKeyFormatters.set(cacheKey, formatter);
  }
  const parts = formatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/**
 * ¿La fecha de vigencia ya pasó? Mismo criterio que las pantallas viejas (`setHours(0, 0, 0, 0)`
 * a hoy y a la vigencia, y comparar): el día calendario de la vigencia es anterior a hoy.
 * Sin fecha o con una fecha inválida no está vencida.
 */
export function isPastCalendarDay(value: string | null | undefined, timeZone?: string): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (isNaN(date.getTime())) return false;
  return calendarDayKey(date, timeZone) < calendarDayKey(new Date(), timeZone);
}
