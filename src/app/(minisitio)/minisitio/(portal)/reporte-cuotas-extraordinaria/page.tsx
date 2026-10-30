import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { getFeesReport, type FeesReport } from "@/modules/minisitio/infrastructure/queries/reports.queries";
import { requirePropietario } from "../_reportes/require-propietario";
import { ReporteCuotasExtraordinariaView } from "./reporte-cuotas-extraordinaria-view";

export const metadata: Metadata = { title: "Reporte de Cuotas Extraordinarias" };

/** Registros por página con los que abría la pantalla vieja. */
const LIMIT_INICIAL = 30;

export default async function ReporteCuotasExtraordinariaPage() {
  const session = await requireCondominoSession();
  await requirePropietario(session);

  let initialData: FeesReport | null = null;
  let initialError: string | null = null;
  try {
    initialData = await getFeesReport(session, { tipo: "extraordinaria", page: 1, limit: LIMIT_INICIAL });
  } catch (error) {
    console.error("[minisitio] reporte-cuotas-extraordinaria:", error);
    initialError = "Error al cargar reporte";
  }

  return (
    <ReporteCuotasExtraordinariaView initialData={initialData} initialLimit={LIMIT_INICIAL} initialError={initialError} />
  );
}
