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

export async function getEstadoResultadoTotalesAction(anio: number | string) {
  const session = await requirePropietarioSession();
  return getEstadoResultadoTotales(session, toYear(anio));
}

export async function getEstadoResultadoIngresosAction(anio: number | string) {
  const session = await requirePropietarioSession();
  return getEstadoResultadoIngresos(session, toYear(anio));
}

export async function getEstadoResultadoEgresosGruposAction(anio: number | string) {
  const session = await requirePropietarioSession();
  return getEstadoResultadoEgresosGrupos(session, toYear(anio));
}

export async function getEstadoResultadoEgresosOpcionesAction(grupoId: string, anio: number | string) {
  await requirePropietarioSession();
  void grupoId; // sin equivalente en insulae2.0: siempre vacío, como antes
  void anio;
  return getEstadoResultadoEgresosOpciones();
}

export async function getEstadoResultadoEgresosConceptosAction(opcionId: string | null, anio: number | string) {
  await requirePropietarioSession();
  return getEstadoResultadoEgresosConceptos(opcionId, toYear(anio));
}

/** Conceptos de egreso de un grupo presupuestal (modal de conceptos del estado de resultados). */
export async function getExpenseConceptsAction(grupoId: string, anio: number | string) {
  const session = await requirePropietarioSession();
  return getExpenseConcepts(session, grupoId || "", toYear(anio));
}

/** Las cuatro consultas del resumen financiero en una sola ida al servidor. */
export async function getResumenFinancieroAction(anio: number | string, fondoReserva = 0) {
  const session = await requireCondominoSession();
  return getResumenFinanciero(session, toYear(anio), fondoReserva);
}

/** `q` busca por nombre o clave del área (la consulta lo limpia y lo recorta). */
export async function getFeesReportAction(input: { tipo: FeesReportType; page?: number; limit?: number; q?: string }) {
  const session = await requirePropietarioSession();
  return getFeesReport(session, { ...input, q: typeof input.q === "string" ? input.q : undefined });
}

export async function getGeneralReportAction() {
  const session = await requirePropietarioSession();
  return getGeneralReport(session);
}
