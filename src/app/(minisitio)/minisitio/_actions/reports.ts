"use server";

/**
 * Reportes condominales: cambios de año, paginación y drill-downs que la UI pide después
 * de la carga inicial (la carga inicial la hace cada page.tsx en el servidor).
 */
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import {
  getEstadoResultadoEgresosConceptos,
  getEstadoResultadoEgresosGrupos,
  getEstadoResultadoEgresosOpciones,
  getEstadoResultadoIngresos,
  getEstadoResultadoTotales,
  getExpenseConcepts,
  getFinancialYears,
  getResumenFinanciero,
} from "@/modules/minisitio/infrastructure/queries/financials.queries";
import { getFeesReport, getGeneralReport, type FeesReportType } from "@/modules/minisitio/infrastructure/queries/reports.queries";

function toYear(anio: number | string | null | undefined): number {
  const n = typeof anio === "number" ? anio : parseInt(String(anio ?? ""), 10);
  return Number.isFinite(n) ? n : new Date().getFullYear();
}

export async function getFinancialYearsAction() {
  const session = await requireCondominoSession();
  return getFinancialYears(session);
}

export async function getEstadoResultadoTotalesAction(anio: number | string) {
  const session = await requireCondominoSession();
  return getEstadoResultadoTotales(session, toYear(anio));
}

export async function getEstadoResultadoIngresosAction(anio: number | string) {
  const session = await requireCondominoSession();
  return getEstadoResultadoIngresos(session, toYear(anio));
}

export async function getEstadoResultadoEgresosGruposAction(anio: number | string) {
  const session = await requireCondominoSession();
  return getEstadoResultadoEgresosGrupos(session, toYear(anio));
}

export async function getEstadoResultadoEgresosOpcionesAction(_grupoId: string, _anio: number | string) {
  await requireCondominoSession();
  return getEstadoResultadoEgresosOpciones();
}

export async function getEstadoResultadoEgresosConceptosAction(opcionId: string | null, anio: number | string) {
  await requireCondominoSession();
  return getEstadoResultadoEgresosConceptos(opcionId, toYear(anio));
}

/** Conceptos de egreso de un grupo presupuestal (modal de conceptos del estado de resultados). */
export async function getExpenseConceptsAction(grupoId: string, anio: number | string) {
  const session = await requireCondominoSession();
  return getExpenseConcepts(session, grupoId || "", toYear(anio));
}

/** Las cuatro consultas del resumen financiero en una sola ida al servidor. */
export async function getResumenFinancieroAction(anio: number | string, fondoReserva = 0) {
  const session = await requireCondominoSession();
  return getResumenFinanciero(session, toYear(anio), fondoReserva);
}

export async function getFeesReportAction(input: { tipo: FeesReportType; page?: number; limit?: number }) {
  const session = await requireCondominoSession();
  return getFeesReport(session, input);
}

export async function getGeneralReportAction() {
  const session = await requireCondominoSession();
  return getGeneralReport(session);
}
