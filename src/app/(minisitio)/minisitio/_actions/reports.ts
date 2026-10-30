"use server";

/**
 * Reportes condominales: cambios de año, paginación y drill-downs que la UI pide después
 * de la carga inicial (la carga inicial la hace cada page.tsx en el servidor).
 */
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import {
  getFinancialYears,
  getResumenFinanciero,
} from "@/modules/minisitio/infrastructure/queries/financials.queries";
import { getFeesReport, getGeneralReport, type FeesReportType } from "@/modules/minisitio/infrastructure/queries/reports.queries";
import { requirePropietario } from "../(portal)/_reportes/require-propietario";

/**
 * Estado de resultados, reportes de cuotas y reporte general son solo para propietarios: la
 * misma regla que aplican sus page.tsx, también aquí para que no se salte llamando la acción.
 * El resumen financiero y los años disponibles siguen abiertos a todo condómino (como antes).
 */
async function requirePropietarioSession() {
  const session = await requireCondominoSession();
  await requirePropietario(session);
  return session;
}

function toYear(anio: number | string | null | undefined): number {
  const n = typeof anio === "number" ? anio : parseInt(String(anio ?? ""), 10);
  return Number.isFinite(n) ? n : new Date().getFullYear();
}

export async function getFinancialYearsAction() {
  const session = await requireCondominoSession();
  return getFinancialYears(session);
}

/** Las cuatro consultas del resumen financiero en una sola ida al servidor. */
export async function getResumenFinancieroAction(anio: number | string, fondoReserva = 0) {
  const session = await requireCondominoSession();
  return getResumenFinanciero(session, toYear(anio), fondoReserva);
}

export async function getFeesReportAction(input: { tipo: FeesReportType; page?: number; limit?: number }) {
  const session = await requirePropietarioSession();
  return getFeesReport(session, input);
}

export async function getGeneralReportAction() {
  const session = await requirePropietarioSession();
  return getGeneralReport(session);
}
