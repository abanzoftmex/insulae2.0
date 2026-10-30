"use server";

/**
 * Reportes condominales: lo que la UI pide después de la carga inicial (páginas de los reportes
 * de cuotas y la recarga del reporte general). La carga inicial la hace cada page.tsx en el
 * servidor; el estado de resultados y el resumen financiero ya no piden nada desde el cliente.
 */
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { getFeesReport, getGeneralReport, type FeesReportType } from "@/modules/minisitio/infrastructure/queries/reports.queries";
import { requirePropietario } from "../(portal)/_reportes/require-propietario";

/**
 * Los reportes de cuotas y el reporte general son solo para propietarios: la misma regla que
 * aplican sus page.tsx, también aquí para que no se salte llamando la acción.
 */
async function requirePropietarioSession() {
  const session = await requireCondominoSession();
  await requirePropietario(session);
  return session;
}

export async function getFeesReportAction(input: { tipo: FeesReportType; page?: number; limit?: number }) {
  const session = await requirePropietarioSession();
  return getFeesReport(session, input);
}

export async function getGeneralReportAction() {
  const session = await requirePropietarioSession();
  return getGeneralReport(session);
}
