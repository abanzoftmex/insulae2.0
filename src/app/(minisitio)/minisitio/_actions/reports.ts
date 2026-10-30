"use server";

/**
 * Reportes condominales: lo que la UI pide después de la carga inicial (las páginas de los
 * reportes de cuotas). La carga inicial la hace cada page.tsx en el servidor.
 */
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { getFeesReport, type FeesReportType } from "@/modules/minisitio/infrastructure/queries/reports.queries";
import { requirePropietario } from "../(portal)/_reportes/require-propietario";

/**
 * Los reportes de cuotas son solo para propietarios: la misma regla que aplica su page.tsx,
 * también aquí para que no se salte llamando la acción.
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
