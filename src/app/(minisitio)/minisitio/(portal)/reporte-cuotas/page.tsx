import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { getFeesReport, type FeesReport } from "@/modules/minisitio/infrastructure/queries/reports.queries";
import { requirePropietario } from "../_reportes/require-propietario";
import { ReporteCuotasView } from "./reporte-cuotas-view";

export const metadata: Metadata = { title: "Reporte de Cuotas Ordinarias" };

/** Registros por página con los que abría la pantalla vieja. */
const LIMIT_INICIAL = 30;

export default async function ReporteCuotasPage() {
  const session = await requireCondominoSession();
  await requirePropietario(session);

  let initialData: FeesReport | null = null;
  let initialError: string | null = null;
  try {
    initialData = await getFeesReport(session, { tipo: "ordinaria", page: 1, limit: LIMIT_INICIAL });
  } catch (error) {
    console.error("[minisitio] reporte-cuotas:", error);
    initialError = "Error al cargar reporte";
  }

  return <ReporteCuotasView initialData={initialData} initialLimit={LIMIT_INICIAL} initialError={initialError} />;
}
